import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../api/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { CustomerPicker } from '../components/CustomerPicker';
import { ItemPicker } from '../components/ItemPicker';
import { computeOrderFinancials, orderStatusForAdvance } from '../lib/financials';
import type { Customer, Item, OrderItemInput, ServiceType } from '../types';

interface RowState {
  key: number;
  item: Item | null;
  service: ServiceType;
  quantity: number;
  price: number;
}

let rowKeySeq = 0;
function newRow(): RowState {
  return { key: ++rowKeySeq, item: null, service: 'Wash & Press', quantity: 1, price: 0 };
}

// Full parity port of orders.js's showAddOrderModal()/saveNewOrder() (see
// orders.js:666-737, 1010-1115), scoped to a driver: no "Assign Driver"
// picker — driver_id is implicitly the logged-in driver
// (driverApp.md step 5).
export function PlaceOrderPage() {
  const { driver } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [rows, setRows] = useState<RowState[]>([newRow()]);
  const [advance, setAdvance] = useState(0);
  const [extra, setExtra] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([db.getCustomers(), db.getItems(), db.getSetting('min_discount_amount')]).then(([c, i, minDisc]) => {
      setCustomers(c);
      setItems(i);
      setMinDiscount(parseFloat(minDisc || '0') || 0);
      setLoading(false);
    });
  }, []);

  const priceFor = (item: Item, service: ServiceType): number => {
    let dc = item.dry_clean_price || 0;
    let wp = item.wash_press_price || 0;
    let wd = item.wash_dry_price || 0;
    const custom = customer?.custom_prices?.[item.id];
    if (custom) {
      if (custom.dry_clean != null) dc = custom.dry_clean;
      if (custom.wash_press != null) wp = custom.wash_press;
      if (custom.wash_dry != null) wd = custom.wash_dry;
    }
    if (service === 'Dry Clean') return dc;
    if (service === 'Wash & Dry') return wd;
    return wp;
  };

  // Re-apply per-customer price overrides to every row when the customer
  // changes, matching orders.js's reapplyPricesForOrderRows.
  const handleCustomerSelect = (c: Customer) => {
    setCustomer(c);
    setRows((prev) => prev.map((r) => (r.item ? { ...r, price: priceFor(r.item, r.service) } : r)));
  };

  const updateRow = (key: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const selectItemForRow = (key: number, item: Item) => {
    updateRow(key, { item, price: priceFor(item, rows.find((r) => r.key === key)?.service || 'Wash & Press') });
  };

  const changeServiceForRow = (key: number, service: ServiceType) => {
    const row = rows.find((r) => r.key === key);
    updateRow(key, { service, price: row?.item ? priceFor(row.item, service) : 0 });
  };

  const orderItems: OrderItemInput[] = useMemo(
    () =>
      rows
        .filter((r) => r.item)
        .map((r) => ({
          catalog_item_id: r.item!.id,
          item_name: r.item!.item_name,
          quantity: r.quantity,
          service_type: r.service,
          price: r.price,
          subtotal: r.quantity * r.price
        })),
    [rows]
  );

  const runningTotal = orderItems.reduce((s, i) => s + i.subtotal, 0) + deliveryCharge + extra;
  const discountEligible = minDiscount > 0 && runningTotal >= minDiscount;
  const effectiveDiscountRate = discountEligible ? discountRate : 0;

  const fin = computeOrderFinancials(
    { discount_rate: effectiveDiscountRate, delivery_charge: deliveryCharge, extra_payment: extra, advance_payment: advance },
    orderItems
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return toast('Please select a customer', 'error');
    if (orderItems.length === 0) return toast('Add at least one item', 'error');
    if (rows.some((r) => !r.item)) return toast('Please select an item for every row', 'error');
    if (!driver) return;

    setSubmitting(true);
    try {
      const batchId = await db.generateBatchId();
      const orderStatus = orderStatusForAdvance(advance, fin.grandTotal);

      const orderId = await db.createOrderWithItems(
        {
          customer_id: customer.id,
          driver_id: driver.id,
          pickup_date: pickupDate,
          delivery_date: deliveryDate || null,
          status: orderStatus,
          advance_payment: advance,
          extra_payment: extra,
          delivery_charge: deliveryCharge,
          discount_rate: effectiveDiscountRate,
          discount_amount: fin.discountAmount,
          total_amount: fin.grandTotal,
          batch_id: batchId
        },
        orderItems
      );

      if (orderStatus === 'Paid') {
        const invNum = await db.generateInvoiceNumber();
        await db.addInvoice({
          order_id: orderId,
          invoice_number: invNum,
          issue_date: new Date().toISOString(),
          delivery_date: deliveryDate || null,
          invoice_type: 'Standard',
          total_amount: fin.grandTotal,
          advance_payment: advance,
          extra_payment: extra,
          balance: 0,
          paid_status: 'Paid',
          discount_rate: effectiveDiscountRate,
          discount_amount: fin.discountAmount,
          delivery_charge: deliveryCharge,
          subtotal_before_discount: fin.itemsSubtotal
        });
      }

      await db.logAction(
        'New Order Add',
        `Created new order #${batchId} for customer "${customer.hotel_name}" (Total: LKR ${fin.grandTotal.toLocaleString()})`,
        { order_id: orderId, batch_id: batchId, customer: customer.hotel_name, total_amount: fin.grandTotal, status: orderStatus },
        'Order',
        driver.name
      );

      toast(`Order ${batchId} created!`);
      navigate('/orders');
    } catch (err) {
      toast('Failed to save order: ' + ((err as Error).message || err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}><i className="fas fa-arrow-left" /></button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', margin: 0 }}>New Order</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Customer *</label>
          <CustomerPicker customers={customers} value={customer} onSelect={handleCustomerSelect} />
        </div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">Pickup Date</label>
            <input type="date" className="form-input" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Delivery Date</label>
            <input type="date" className="form-input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 8px' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'var(--primary)' }}>Order Items</span>
          <button type="button" className="btn btn-secondary" onClick={() => setRows((r) => [...r, newRow()])}>
            <i className="fas fa-plus" /> Add Row
          </button>
        </div>

        {rows.map((row) => (
          <div key={row.key} className="card" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <ItemPicker items={items} value={row.item} onSelect={(item) => selectItemForRow(row.key, item)} />
            </div>
            <div className="form-row-3">
              <select className="form-input" value={row.service} onChange={(e) => changeServiceForRow(row.key, e.target.value as ServiceType)}>
                <option value="Dry Clean">Dry Clean</option>
                <option value="Wash & Press">Wash & Press</option>
                <option value="Wash & Dry">Wash & Dry</option>
              </select>
              <input type="number" className="form-input" min={1} value={row.quantity} onChange={(e) => updateRow(row.key, { quantity: parseFloat(e.target.value) || 0 })} />
              <input type="number" className="form-input" min={0} value={row.price} onChange={(e) => updateRow(row.key, { price: parseFloat(e.target.value) || 0 })} placeholder="Price" />
            </div>
            {rows.length > 1 && (
              <button type="button" className="btn btn-secondary" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}>
                <i className="fas fa-trash" /> Remove row
              </button>
            )}
          </div>
        ))}

        <div className="form-row form-row-2" style={{ marginTop: 8 }}>
          <div className="form-group">
            <label className="form-label">Delivery Charge (LKR)</label>
            <input type="number" className="form-input" min={0} value={deliveryCharge} onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)} />
          </div>
          {discountEligible && (
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--success)' }}>Discount % (min. reached)</label>
              <input type="number" className="form-input" min={0} max={100} value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)} />
            </div>
          )}
        </div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">Advance Payment (LKR)</label>
            <input type="number" className="form-input" min={0} value={advance} onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label className="form-label">Extra Payment (LKR)</label>
            <input type="number" className="form-input" min={0} value={extra} onChange={(e) => setExtra(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="card" style={{ marginTop: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: 'var(--text-muted)' }}>
            <span>Items Subtotal</span><span>LKR {fin.itemsSubtotal.toLocaleString()}</span>
          </div>
          {fin.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: 'var(--success)' }}>
              <span>Discount ({effectiveDiscountRate}%)</span><span>-LKR {fin.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1em', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <span>Grand Total</span><span>LKR {fin.grandTotal.toLocaleString()}</span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          <i className="fas fa-save" /> {submitting ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}

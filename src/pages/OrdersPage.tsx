import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../api/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import type { Customer, Driver, Order } from '../types';

type Tab = 'mine' | 'available' | 'others' | 'all';

// Port of app.js's renderDriverDashboard order-delivery workflow (three
// buckets: assigned to me, available/unassigned, other drivers') plus the
// existing all-orders search list. See
// supabase_order_delivery_assignment_migration.sql for the delivery_status /
// driver_assigned_at columns this depends on.
export function OrdersPage() {
  const { driver } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('mine');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([db.getOrders(), db.getCustomers(), db.getDrivers()]).then(([o, c, d]) => {
      setOrders(o);
      setCustomers(c);
      setDrivers(d);
      setSelected(new Set());
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const customerName = (id: number) => customers.find((c) => c.id === id)?.hotel_name || `Customer #${id}`;
  const driverName = (id: number | null) => (id != null && drivers.find((d) => d.id === id)?.name) || '—';

  const nonDelivered = (o: Order) => o.delivery_status !== 'delivered';
  const myOrders = orders.filter((o) => driver && String(o.driver_id) === String(driver.id) && nonDelivered(o));
  const availableOrders = orders.filter((o) => !o.driver_id && nonDelivered(o));
  const otherOrders = orders.filter((o) => o.driver_id != null && driver && String(o.driver_id) !== String(driver.id) && nonDelivered(o));

  const searchFiltered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.batch_id.toLowerCase().includes(q) || customerName(o.customer_id).toLowerCase().includes(q);
  });

  const toggleSelected = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === myOrders.length ? new Set() : new Set(myOrders.map((o) => o.id))));
  };

  const handleMarkDelivered = async (orderIds: number[]) => {
    if (!orderIds.length) return;
    const ok = await confirm(`Mark ${orderIds.length} order(s) as delivered?`);
    if (!ok) return;
    setBusy(true);
    try {
      for (const id of orderIds) {
        await db.markOrderDelivered(id);
      }
      await db.logAction('Mark Delivered', `Marked ${orderIds.length} order(s) as delivered`, { order_ids: orderIds }, 'Order', driver?.name || 'Driver');
      toast(`${orderIds.length} order(s) marked delivered`);
      load();
    } catch (err) {
      toast('Failed to mark delivered: ' + ((err as Error).message || err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignToSelf = async (order: Order) => {
    if (!driver) return;
    const ok = await confirm('Assign this order to yourself for delivery?');
    if (!ok) return;
    setBusy(true);
    try {
      await db.assignDriverToOrders([order.id], driver.id);
      await db.logAction('Assign Driver', `Driver "${driver.name}" self-assigned order #${order.batch_id}`, { order_id: order.id, batch_id: order.batch_id, driver_id: driver.id }, 'Order', driver.name);
      toast(`Order #${order.batch_id} assigned to you`);
      load();
    } catch (err) {
      toast('Failed to assign order: ' + ((err as Error).message || err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const orderCard = (o: Order, extra?: React.ReactNode) => (
    <div key={o.id} className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{o.batch_id || `#${o.id}`}</strong>
        <strong>LKR {Number(o.total_amount).toLocaleString()}</strong>
      </div>
      <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>{customerName(o.customer_id)}</div>
      {extra}
    </div>
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'mine', label: 'Assigned to Me', count: myOrders.length },
    { key: 'available', label: 'Available', count: availableOrders.length },
    { key: 'others', label: 'Others', count: otherOrders.length },
    { key: 'all', label: 'All', count: orders.length }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', margin: 0 }}>Orders</h1>
        <button className="btn btn-primary" onClick={() => navigate('/orders/new')}><i className="fas fa-plus" /> New Order</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}
            style={{ flex: '0 0 auto', padding: '8px 14px', fontSize: '0.82em' }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          {tab === 'mine' && (
            <>
              {myOrders.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85em' }}>
                    <input type="checkbox" checked={selected.size === myOrders.length} onChange={toggleSelectAll} />
                    Select all
                  </label>
                  {selected.size > 0 && (
                    <button className="btn btn-primary" disabled={busy} onClick={() => handleMarkDelivered(Array.from(selected))} style={{ padding: '8px 14px', fontSize: '0.85em' }}>
                      <i className="fas fa-check-double" /> Mark Delivered ({selected.size})
                    </button>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myOrders.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders assigned to you yet.</div>}
                {myOrders.map((o) => orderCard(o, (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82em', color: 'var(--text-muted)' }}>
                      <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelected(o.id)} />
                      {o.driver_assigned_at ? new Date(o.driver_assigned_at).toLocaleDateString() : '—'}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => navigate(`/orders/${o.id}`)} style={{ padding: '8px 12px', fontSize: '0.82em' }}>
                        <i className="fas fa-eye" /> View
                      </button>
                      <button className="btn btn-primary" disabled={busy} onClick={() => handleMarkDelivered([o.id])} style={{ padding: '8px 12px', fontSize: '0.82em' }}>
                        <i className="fas fa-check" /> Delivered
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </>
          )}

          {tab === 'available' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableOrders.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No unassigned orders.</div>}
              {availableOrders.map((o) => orderCard(o, (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-secondary" onClick={() => navigate(`/orders/${o.id}`)} style={{ padding: '8px 12px', fontSize: '0.82em' }}>
                    <i className="fas fa-eye" /> View
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => handleAssignToSelf(o)} style={{ padding: '8px 12px', fontSize: '0.82em' }}>
                    <i className="fas fa-hand-holding" /> Assign to Me
                  </button>
                </div>
              )))}
            </div>
          )}

          {tab === 'others' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otherOrders.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders assigned to other drivers.</div>}
              {otherOrders.map((o) => orderCard(o, (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span className="badge badge-blue">{driverName(o.driver_id)}</span>
                  <button className="btn btn-secondary" onClick={() => navigate(`/orders/${o.id}`)} style={{ padding: '8px 12px', fontSize: '0.82em' }}>
                    <i className="fas fa-eye" /> View
                  </button>
                </div>
              )))}
            </div>
          )}

          {tab === 'all' && (
            <>
              <input className="form-input" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchFiltered.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders found.</div>}
                {searchFiltered.map((o) => (
                  <div key={o.id} className="card" role="button" tabIndex={0} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontFamily: 'monospace' }}>{o.batch_id}</strong>
                      <span className={`badge ${o.status === 'Paid' ? 'badge-green' : o.status === 'Partially Paid' ? 'badge-yellow' : 'badge-gray'}`}>{o.status}</span>
                    </div>
                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>{customerName(o.customer_id)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.9em' }}>
                      <span>{o.pickup_date}</span>
                      <strong>LKR {Number(o.total_amount).toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

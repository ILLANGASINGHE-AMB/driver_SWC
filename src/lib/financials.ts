// Ported from ../../financials.js's Financials.computeOrderFinancials, kept
// byte-for-byte equivalent so DriverApp's order math never drifts from the
// desktop app's. Only the pieces PlaceOrderPage needs are ported (order
// math, not invoice/expense/trip-fuel calculations).
import type { OrderItemInput } from '../types';

export interface OrderFinancialsInput {
  discount_rate?: number;
  delivery_charge?: number;
  extra_payment?: number;
  advance_payment?: number;
}

export interface OrderFinancials {
  itemsSubtotal: number;
  discountRate: number;
  discountAmount: number;
  deliveryCharge: number;
  extraPayment: number;
  advancePayment: number;
  grandTotal: number;
  balance: number;
  isPaid: boolean;
}

export function computeOrderFinancials(
  order: OrderFinancialsInput,
  items: Array<Pick<OrderItemInput, 'subtotal' | 'quantity' | 'price'>> = []
): OrderFinancials {
  let itemsSubtotal = 0;
  items.forEach((i) => {
    itemsSubtotal += i.subtotal || i.quantity * i.price;
  });

  const discRate = order.discount_rate || 0;
  const discAmt = itemsSubtotal * (discRate / 100);
  const deliveryCharge = order.delivery_charge || 0;
  const extra = order.extra_payment || 0;
  const advance = order.advance_payment || 0;

  const grandTotal = Math.max(0, itemsSubtotal - discAmt + deliveryCharge + extra);
  const balance = Math.max(0, grandTotal - advance);
  const isPaid = advance >= grandTotal;

  return {
    itemsSubtotal,
    discountRate: discRate,
    discountAmount: discAmt,
    deliveryCharge,
    extraPayment: extra,
    advancePayment: advance,
    grandTotal,
    balance,
    isPaid
  };
}

// orders.js:1057 uses this exact ternary for the order's `status` column
// at creation time — NOT Financials.computeOrderFinancials's own
// isPaid/status, which would also allow a "Partially Paid" order status
// that new orders never actually get. Keep this in sync with that file.
export function orderStatusForAdvance(advance: number, grandTotal: number): 'Paid' | 'Unpaid' {
  return advance >= grandTotal ? 'Paid' : 'Unpaid';
}

// Ported from ../../financials.js's Financials.computeInvoiceFinancials,
// kept byte-for-byte equivalent (down to the fallback chain for
// itemsSubtotal) so the driver bill view agrees with the desktop app's
// invoice/bill totals. Used by the order bill view (see OrderBillPage),
// which builds a synthetic invoice-shaped object from the order's own
// columns when no real `invoices` row exists yet for that order.
export interface InvoiceFinancialsInput {
  subtotal_before_discount?: number | null;
  total_amount?: number | null;
  discount_rate?: number | null;
  discount_amount?: number | null;
  delivery_charge?: number | null;
  extra_payment?: number | null;
  deduction_amount?: number | null;
  advance_payment?: number | null;
}

export interface InvoiceFinancialsItem {
  subtotal?: number;
  price?: number;
  quantity?: number;
}

export interface InvoiceFinancialsPayment {
  amount?: number;
}

export interface InvoiceFinancials {
  itemsSubtotal: number;
  discountRate: number;
  discountAmount: number;
  deliveryCharge: number;
  extraPayment: number;
  discountedSubtotal: number;
  grossInvoiceTotal: number;
  deductionAmount: number;
  netPayableTotal: number;
  advancePayment: number;
  paymentsTotal: number;
  totalPaid: number;
  balance: number;
  isPaid: boolean;
  status: 'Paid' | 'Partially Paid' | 'Unpaid';
}

export function computeInvoiceFinancials(
  invoice: InvoiceFinancialsInput | null | undefined,
  items: InvoiceFinancialsItem[] = [],
  payments: InvoiceFinancialsPayment[] = []
): InvoiceFinancials {
  if (!invoice) {
    return {
      itemsSubtotal: 0,
      discountRate: 0,
      discountAmount: 0,
      deliveryCharge: 0,
      extraPayment: 0,
      discountedSubtotal: 0,
      grossInvoiceTotal: 0,
      deductionAmount: 0,
      netPayableTotal: 0,
      advancePayment: 0,
      paymentsTotal: 0,
      totalPaid: 0,
      balance: 0,
      isPaid: false,
      status: 'Unpaid'
    };
  }

  const inv = invoice || {};
  const pList = payments || [];
  const iList = items || [];

  let calcItemsSubtotal = 0;
  if (iList.length > 0) {
    calcItemsSubtotal = iList.reduce((s, i) => s + ((i.subtotal ?? 0) || ((i.price || 0) * (i.quantity || 0)) || 0), 0);
  }

  let itemsSubtotal = 0;
  if (inv.subtotal_before_discount != null && (inv.subtotal_before_discount as number) > 0) {
    itemsSubtotal = inv.subtotal_before_discount as number;
  } else if (calcItemsSubtotal > 0) {
    itemsSubtotal = calcItemsSubtotal;
  } else {
    itemsSubtotal = inv.total_amount || 0;
  }

  const discountRate = inv.discount_rate || 0;
  let discountAmount = inv.discount_amount || 0;
  if (discountAmount === 0 && discountRate > 0 && itemsSubtotal > 0) {
    discountAmount = itemsSubtotal * (discountRate / 100);
  }

  const deliveryCharge = inv.delivery_charge || 0;
  const extraPayment = inv.extra_payment || 0;

  const discountedSubtotal = Math.max(0, itemsSubtotal - discountAmount);
  const grossInvoiceTotal = discountedSubtotal + deliveryCharge + extraPayment;

  const deductionAmount = inv.deduction_amount || 0;
  const netPayableTotal = Math.max(0, grossInvoiceTotal - deductionAmount);

  const advancePayment = inv.advance_payment || 0;
  const paymentsTotal = pList.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = advancePayment + paymentsTotal;

  const balance = Math.max(0, parseFloat((netPayableTotal - totalPaid).toFixed(2)));
  const isPaid = balance <= 0.009;
  const status: InvoiceFinancials['status'] = isPaid ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Unpaid');

  return {
    itemsSubtotal,
    discountRate,
    discountAmount,
    deliveryCharge,
    extraPayment,
    discountedSubtotal,
    grossInvoiceTotal,
    deductionAmount,
    netPayableTotal,
    advancePayment,
    paymentsTotal,
    totalPaid,
    balance,
    isPaid,
    status
  };
}

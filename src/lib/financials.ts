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

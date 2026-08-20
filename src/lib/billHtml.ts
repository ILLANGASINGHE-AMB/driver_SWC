// Builds the bill/invoice markup for one order, laid out to match the
// desktop app's bill (see ../../../invoice.js's previewInvoiceByOrder/
// printInvoice) so a driver's bill view and the office's bill look
// identical. OrderBillPage uses buildBillHtml (full document) for the
// on-screen preview iframe, and buildBillContentHtml (fragment only) for
// the off-screen div it rasterizes into a PDF.
import type { Customer, Invoice, Order, OrderItem, Payment } from '../types';
import { computeInvoiceFinancials } from './financials';

function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount: number | null | undefined): string {
  return 'LKR ' + Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SERVICE_COLOR: Record<string, string> = { 'Dry Clean': '#7c3aed', 'Wash & Press': '#0369a1', 'Wash & Dry': '#16a34a' };

export interface BillSettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  footer_message: string;
  logo_data: string | null;
}

// Returns just the bill's own markup (no <html>/<head>/<body> wrapper) at a
// fixed 780px design width, so it can be dropped into either the preview
// iframe's document (via buildBillHtml below) or a plain off-screen div in
// the main document for PDF capture (see OrderBillPage) — capturing a real
// in-page element avoids the blank/shifted-page PDF bug that came from
// html2canvas screenshotting content inside an iframe while the outer page
// was scrolled.
export function buildBillContentHtml(
  order: Order,
  customer: Customer | null,
  items: OrderItem[],
  invoice: Invoice | null,
  payments: Payment[],
  settings: BillSettings
): string {
  // Same fallback previewInvoiceByOrder uses when an order has no real
  // `invoices` row yet: treat the order's own columns as the invoice.
  const inv: Invoice | Record<string, unknown> = invoice || {
    order_id: order.id,
    invoice_number: order.batch_id,
    invoice_type: 'Standard',
    advance_payment: order.advance_payment || 0,
    discount_amount: order.discount_amount || 0,
    discount_rate: order.discount_rate || 0,
    delivery_charge: order.delivery_charge || 0,
    extra_payment: order.extra_payment || 0,
    subtotal_before_discount: items.reduce((s, i) => s + (i.subtotal || 0), 0),
    total_amount: order.total_amount,
    deduction_amount: 0,
    issue_date: (order.pickup_date || order.created_at || '').slice(0, 10),
    delivery_date: order.delivery_date || ''
  };

  const fin = computeInvoiceFinancials(inv as Invoice, items, payments);
  const isCredit = (inv as Invoice).invoice_type === 'Credit';

  const logoHTML = settings.logo_data
    ? `<img src="${settings.logo_data}" style="height:64px;width:64px;object-fit:cover;border-radius:12px;"/>`
    : `<div style="height:64px;width:64px;border-radius:12px;background:linear-gradient(135deg,#00b4d8,#1a4d8f);display:flex;align-items:center;justify-content:center;color:#fff;font-size:2em;">SW</div>`;

  const itemsHTML = items.length
    ? items
        .map(
          (i, idx) => `
    <tr style="${idx % 2 === 1 ? 'background:#fafafa;' : ''}">
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">${escapeHtml(i.item_name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:0.8em;font-weight:600;padding:3px 8px;border-radius:5px;background:${(SERVICE_COLOR[i.service_type as string] || '#64748b')}18;color:${SERVICE_COLOR[i.service_type as string] || '#64748b'};">${escapeHtml(i.service_type) || '—'}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${formatCurrency(i.price)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;">${formatCurrency(i.subtotal)}</td>
    </tr>`
        )
        .join('')
    : `<tr><td colspan="5" style="padding:20px;text-align:center;color:#64748b;">No items on this order</td></tr>`;

  const summaryHTML = `
    <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;">
      <span style="color:#64748b;">Items Subtotal</span><strong>${formatCurrency(fin.itemsSubtotal)}</strong>
    </div>
    ${
      fin.discountAmount > 0
        ? `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#16a34a;">
      <span>Discount (${fin.discountRate || 0}%)</span><span>- ${formatCurrency(fin.discountAmount)}</span>
    </div>`
        : ''
    }
    ${
      fin.deliveryCharge > 0
        ? `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;">
      <span style="color:#64748b;">Delivery Charge</span><span>+ ${formatCurrency(fin.deliveryCharge)}</span>
    </div>`
        : ''
    }
    ${
      fin.extraPayment > 0
        ? `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;">
      <span style="color:#64748b;">Extra Payment</span><span>+ ${formatCurrency(fin.extraPayment)}</span>
    </div>`
        : ''
    }
    <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:${fin.deductionAmount > 0 ? '1px' : '2px'} solid #e5e7eb;font-weight:700;">
      <span>Grand Total</span><span>${formatCurrency(fin.grossInvoiceTotal)}</span>
    </div>
    ${
      fin.deductionAmount > 0
        ? `
    <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:2px solid #ef4444;font-weight:700;color:#ef4444;background:#fef2f2;">
      <span>Deduction</span><span>- ${formatCurrency(fin.deductionAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#1e40af;">
      <span>Final Total Bill</span><span>${formatCurrency(fin.netPayableTotal)}</span>
    </div>`
        : ''
    }
    ${
      fin.advancePayment > 0
        ? `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#16a34a;">
      <span>Advance Payment</span><span>- ${formatCurrency(fin.advancePayment)}</span>
    </div>`
        : ''
    }
    ${payments
      .map(
        (p) => `
      <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#16a34a;">
        <span>Payment (${escapeHtml(p.method)})</span><span>- ${formatCurrency(p.amount)}</span>
      </div>`
      )
      .join('')}
    <div style="display:flex;justify-content:space-between;padding:12px;background:#1a4d8f;color:#fff;border-radius:0 0 10px 10px;font-weight:700;font-size:1.05em;">
      <span>Balance Due</span><span>${formatCurrency(Math.max(0, fin.balance))}</span>
    </div>`;

  const paidStamp =
    fin.balance <= 0
      ? `<div style="position:absolute;left:0;bottom:20px;pointer-events:none;z-index:10;">
      <div style="color:#16a34a;font-family:'Playfair Display',serif;font-size:56px;font-weight:900;letter-spacing:6px;text-transform:uppercase;opacity:0.30;transform:rotate(-12deg);line-height:1;user-select:none;">PAID</div>
    </div>`
      : '';

  const creditBanner = isCredit
    ? `<div style="background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;padding:18px 20px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
      <div>
        <div style="font-size:1.1em;font-weight:800;margin-bottom:4px;">CREDIT BILL</div>
        <div style="font-size:0.82em;opacity:0.85;">Payment agreed for a deferred due date</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.75em;opacity:0.8;text-transform:uppercase;margin-bottom:4px;">Credit Amount Due</div>
        <div style="font-size:1.9em;font-weight:900;line-height:1;">${formatCurrency(fin.balance)}</div>
        ${(inv as Invoice).credit_due_date ? `<div style="font-size:0.85em;margin-top:6px;background:rgba(255,255,255,0.15);padding:5px 10px;border-radius:6px;font-weight:700;">Pay By: ${formatDate((inv as Invoice).credit_due_date)}</div>` : ''}
      </div>
    </div>`
    : '';

  return `
  <div style="position:relative;font-family:'DM Sans',sans-serif;background:#fff;color:#1e293b;width:780px;margin:0 auto;padding:28px 22px;">
    ${creditBanner}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:26px;padding-bottom:18px;border-bottom:2px solid #e2e8f0;flex-wrap:wrap;gap:14px;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${logoHTML}
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:1.3em;font-weight:700;color:#1a4d8f;">${escapeHtml(settings.company_name)}</div>
          ${settings.address ? `<div style="font-size:0.82em;color:#64748b;margin-top:4px;">${escapeHtml(settings.address)}</div>` : ''}
          <div style="font-size:0.82em;color:#64748b;">${[settings.phone, settings.email].filter(Boolean).map((s) => escapeHtml(s)).join(' | ')}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:1.7em;font-weight:700;color:${isCredit ? '#7c3aed' : '#1a4d8f'};font-family:'Playfair Display',serif;">${isCredit ? 'CREDIT BILL' : 'INVOICE'}</div>
        <div style="font-size:0.9em;color:#374151;margin-top:6px;"><strong>${escapeHtml((inv as Invoice).invoice_number || order.batch_id)}</strong></div>
        <div style="font-size:0.82em;color:#64748b;margin-top:4px;">Issue Date: ${formatDate(((inv as Invoice).issue_date as string) || order.pickup_date)}</div>
        ${order.delivery_date ? `<div style="font-size:0.82em;color:#64748b;">Delivery: ${formatDate(order.delivery_date)}</div>` : ''}
      </div>
    </div>

    <div style="font-size:12px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:#f8fafc;padding:14px;border-radius:10px;">
          <div style="font-size:0.72em;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:7px;">Bill To</div>
          <div style="font-weight:700;font-size:1.02em;">${escapeHtml(customer?.hotel_name || `Customer #${order.customer_id}`)}</div>
          ${customer?.address ? `<div style="color:#64748b;font-size:0.88em;margin-top:3px;">${escapeHtml(customer.address)}</div>` : ''}
          ${customer?.contact_person ? `<div style="color:#64748b;font-size:0.88em;">${escapeHtml(customer.contact_person)}</div>` : ''}
          ${customer?.phone ? `<div style="color:#64748b;font-size:0.88em;">${escapeHtml(customer.phone)}</div>` : ''}
        </div>
        <div style="background:#f8fafc;padding:14px;border-radius:10px;">
          <div style="font-size:0.72em;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:7px;">Order Info</div>
          <div><span style="color:#64748b;">Batch:</span> <strong>${escapeHtml(order.batch_id)}</strong></div>
          <div style="margin-top:3px;"><span style="color:#64748b;">Pickup:</span> ${formatDate(order.pickup_date)}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#1a4d8f;color:#fff;">
            <th style="padding:9px 12px;text-align:left;font-size:0.78em;text-transform:uppercase;">Item</th>
            <th style="padding:9px 12px;text-align:center;font-size:0.78em;text-transform:uppercase;">Qty</th>
            <th style="padding:9px 12px;text-align:left;font-size:0.78em;text-transform:uppercase;">Service</th>
            <th style="padding:9px 12px;text-align:right;font-size:0.78em;text-transform:uppercase;">Unit Price</th>
            <th style="padding:9px 12px;text-align:right;font-size:0.78em;text-transform:uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-bottom:20px;position:relative;">
        ${paidStamp}
        <div style="min-width:280px;max-width:340px;width:100%;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          ${summaryHTML}
        </div>
      </div>

      ${settings.footer_message ? `<div style="text-align:center;padding:14px;background:#f8fafc;border-radius:10px;font-size:0.88em;color:#64748b;font-style:italic;">${escapeHtml(settings.footer_message)}</div>` : ''}
    </div>
  </div>`;
}

// Full standalone HTML document (own <html>/<head> with the Google Fonts
// link) for the on-screen preview iframe.
export function buildBillHtml(
  order: Order,
  customer: Customer | null,
  items: OrderItem[],
  invoice: Invoice | null,
  payments: Payment[],
  settings: BillSettings
): string {
  const contentHtml = buildBillContentHtml(order, customer, items, invoice, payments, settings);
  const title = invoice?.invoice_number || order.batch_id;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #fff; color: #1e293b; line-height: 1.5; }
</style>
</head><body>${contentHtml}</body></html>`;
}

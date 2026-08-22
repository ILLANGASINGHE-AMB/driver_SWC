import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { db } from '../api/db';
import { buildBillHtml, buildBillContentHtml } from '../lib/billHtml';
import { useToast } from '../components/Toast';
import type { Customer, Invoice, Order, OrderItem, Payment } from '../types';

// View-only bill screen for drivers: tapping an order in OrdersPage lands
// here, showing the same bill layout the desktop app prints. The Download
// button rasterizes the bill (html2canvas) into a real multi-page PDF
// (jsPDF) and saves it directly, named after the order's batch id — no
// browser print dialog, unlike the desktop app's print-to-PDF flow (see
// driverAppOrders.md: drivers just want a file, not a printer picker).
// Drivers can view/download only, never edit — no edit action exists here.
export function OrderBillPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [billHtml, setBillHtml] = useState('');
  const [billContentHtml, setBillContentHtml] = useState('');
  const [previewHeight, setPreviewHeight] = useState(400);

  // The preview iframe (see buildBillHtml) scales its fixed-780px bill
  // down to fit a phone-width viewport and reports the resulting height
  // here, so the iframe element matches its content instead of sitting
  // inside a fixed 70vh box with a big blank gap underneath.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type === 'bill-preview-size' && typeof e.data.height === 'number') {
        setPreviewHeight(Math.max(200, e.data.height));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const orderId = Number(id);
      const o = await db.getOrder(orderId);
      if (!o) {
        if (!cancelled) {
          toast('Order not found', 'error');
          navigate('/orders');
        }
        return;
      }

      const [customer, items, invoice, companyName, address, phone, email, footerMessage, logoData] = await Promise.all([
        o.customer_id ? db.getCustomer(o.customer_id) : Promise.resolve(null as Customer | null),
        db.getOrderItems(orderId),
        db.getInvoiceByOrder(orderId),
        db.getSetting('company_name'),
        db.getSetting('address'),
        db.getSetting('phone'),
        db.getSetting('email'),
        db.getSetting('footer_message'),
        db.getSetting('logo_data')
      ]);

      const payments: Payment[] = invoice ? await db.getPaymentsByInvoice((invoice as Invoice).id) : [];

      if (cancelled) return;

      const billSettings = {
        company_name: companyName || 'Sagacious Washing Center',
        address: address || '',
        phone: phone || '',
        email: email || '',
        footer_message: footerMessage || '',
        logo_data: logoData
      };
      const html = buildBillHtml(o, customer, items as OrderItem[], invoice, payments, billSettings);
      const contentHtml = buildBillContentHtml(o, customer, items as OrderItem[], invoice, payments, billSettings);

      setOrder(o);
      setBillHtml(html);
      setBillContentHtml(contentHtml);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDownload = async () => {
    if (!order || !billContentHtml || downloading) return;

    setDownloading(true);
    // Render the bill into a plain off-screen div in THIS document (not
    // the preview iframe) before rasterizing it. Capturing an element
    // that lives inside an iframe made html2canvas mis-measure the
    // capture offset whenever the outer page itself was scrolled (which
    // it usually is on a phone, since this button sits below the fold),
    // producing PDFs with a blank gap shifted in from the top. A same-
    // document, fixed-width, off-screen node has no such scroll-offset
    // ambiguity.
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:-10000px;width:780px;background:#fff;z-index:-1;';
    container.innerHTML = billContentHtml;
    document.body.appendChild(container);

    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all(
        Array.from(container.querySelectorAll('img')).map((img) =>
          img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })
        )
      );

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = (order.batch_id || `order-${order.id}`).replace(/[^a-zA-Z0-9._-]+/g, '_');
      pdf.save(`${safeName}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast('Failed to generate PDF', 'error');
    } finally {
      container.remove();
      setDownloading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}><i className="fas fa-arrow-left" /></button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', margin: 0, flex: 1 }}>
          {order ? order.batch_id : 'Order Bill'}
        </h1>
        {!loading && (
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading} title="Download PDF">
            <i className={`fas ${downloading ? 'fa-spinner fa-spin' : 'fa-download'}`} />
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="card" style={{ padding: 8, marginBottom: 12, overflow: 'hidden' }}>
            <iframe
              ref={iframeRef}
              srcDoc={billHtml}
              title="Bill preview"
              style={{ width: '100%', height: previewHeight, border: 'none', borderRadius: 10, background: '#fff', display: 'block' }}
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={handleDownload} disabled={downloading}>
            <i className={`fas ${downloading ? 'fa-spinner fa-spin' : 'fa-download'}`} /> {downloading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </>
      )}
    </div>
  );
}

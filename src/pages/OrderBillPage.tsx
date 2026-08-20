import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { db } from '../api/db';
import { buildBillHtml } from '../lib/billHtml';
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

      const html = buildBillHtml(o, customer, items as OrderItem[], invoice, payments, {
        company_name: companyName || 'Sagacious Washing Center',
        address: address || '',
        phone: phone || '',
        email: email || '',
        footer_message: footerMessage || '',
        logo_data: logoData
      });

      setOrder(o);
      setBillHtml(html);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDownload = async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !doc.body || !order || downloading) return;

    setDownloading(true);
    try {
      if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;

      const canvas = await html2canvas(doc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: doc.documentElement.scrollWidth,
        windowHeight: doc.documentElement.scrollHeight
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
      setDownloading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}><i className="fas fa-arrow-left" /></button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', margin: 0 }}>
          {order ? order.batch_id : 'Order Bill'}
        </h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="card" style={{ padding: 8, marginBottom: 12 }}>
            <iframe
              ref={iframeRef}
              srcDoc={billHtml}
              title="Bill preview"
              style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 10, background: '#fff' }}
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={handleDownload} disabled={downloading}>
            <i className={`fas ${downloading ? 'fa-spinner fa-spin' : 'fa-download'}`} /> {downloading ? 'Generating PDF...' : 'Download'}
          </button>
        </>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../api/db';
import type { Customer, Order } from '../types';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([db.getOrders(), db.getCustomers()]).then(([o, c]) => {
      setOrders(o);
      setCustomers(c);
      setLoading(false);
    });
  }, []);

  const customerName = (id: number) => customers.find((c) => c.id === id)?.hotel_name || `Customer #${id}`;
  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.batch_id.toLowerCase().includes(q) || customerName(o.customer_id).toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', margin: 0 }}>Orders</h1>
        <button className="btn btn-primary" onClick={() => navigate('/orders/new')}><i className="fas fa-plus" /> New Order</button>
      </div>
      <input className="form-input" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders found.</div>}
          {filtered.map((o) => (
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
      )}
    </div>
  );
}

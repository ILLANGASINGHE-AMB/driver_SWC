import React, { useEffect, useState } from 'react';
import { db } from '../api/db';
import { AddCustomerModal } from '../components/AddCustomerModal';
import type { Customer } from '../types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const load = () => db.getCustomers().then((c) => { setCustomers(c); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || (c.hotel_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.contact_person || '').toLowerCase().includes(q);
  });

  if (selected) {
    return (
      <div>
        <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>
          <i className="fas fa-arrow-left" /> Back to Customers
        </button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', marginBottom: 12 }}>{selected.hotel_name}</h1>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.9em' }}>
          <div><i className="fas fa-user-tie" style={{ width: 16, color: 'var(--primary)' }} /> {selected.contact_person || '—'}</div>
          <div><i className="fas fa-phone" style={{ width: 16, color: 'var(--success)' }} /> {selected.phone || '—'}</div>
          <div><i className="fas fa-envelope" style={{ width: 16, color: 'var(--info)' }} /> {selected.email || '—'}</div>
          <div><i className="fas fa-map-marker-alt" style={{ width: 16, color: '#ec4899' }} /> {selected.address || '—'}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', margin: 0 }}>Customers</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><i className="fas fa-plus" /> Add</button>
      </div>
      <input className="form-input" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((c) => (
            <button key={c.id} className="card" onClick={() => setSelected(c)} style={{ textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>{c.hotel_name}</div>
              <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{c.phone || 'No phone'}</div>
            </button>
          ))}
        </div>
      )}
      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}

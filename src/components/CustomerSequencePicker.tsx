import React, { useMemo, useState } from 'react';
import type { Customer, VisitedCustomer } from '../types';

// Port of transport.js's toggleCustomerSelection/renderSequenceBadges/
// renderCustomerButtonsHTML: click a customer button to add/remove it
// from the visit sequence, order = click order, auto re-indexed 1..n.
export function CustomerSequencePicker({
  customers,
  value,
  onChange
}: {
  customers: Customer[];
  value: VisitedCustomer[];
  onChange: (next: VisitedCustomer[]) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) => (c.hotel_name || '').toLowerCase().includes(q));
  }, [customers, query]);

  const toggle = (c: Customer) => {
    const idx = value.findIndex((s) => s.customer_id === c.id);
    let next: VisitedCustomer[];
    if (idx >= 0) {
      next = value.filter((s) => s.customer_id !== c.id);
    } else {
      next = [...value, { customer_id: c.id, hotel_name: c.hotel_name, visit_order: value.length + 1 }];
    }
    next = next.map((item, i) => ({ ...item, visit_order: i + 1 }));
    onChange(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Visit Sequence</label>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.78em', fontWeight: 700, cursor: 'pointer' }}>
            Reset
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 32, marginBottom: 10 }}>
        {value.length === 0 && <span style={{ fontSize: '0.8em', color: 'var(--text-muted)', fontStyle: 'italic' }}>No customers selected yet</span>}
        {value.map((c) => (
          <span key={c.customer_id} className="badge badge-blue">#{c.visit_order} {c.hotel_name}</span>
        ))}
      </div>
      <input
        className="form-input"
        placeholder="Search customer..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
        {filtered.length === 0 && <div style={{ textAlign: 'center', fontSize: '0.82em', color: 'var(--text-muted)', padding: 12 }}>No matching customers</div>}
        {filtered.map((c) => {
          const seq = value.find((s) => s.customer_id === c.id);
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => toggle(c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${seq ? 'var(--primary)' : 'var(--border)'}`,
                background: seq ? 'var(--primary)' : 'var(--card-bg)',
                color: seq ? '#fff' : 'var(--text)',
                fontWeight: 700,
                fontSize: '0.88em',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.hotel_name}</span>
              {seq ? <span>#{seq.visit_order}</span> : <i className="fas fa-plus" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

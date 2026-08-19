import React, { useMemo, useState } from 'react';
import type { Customer } from '../types';

export function CustomerPicker({ customers, value, onSelect }: { customers: Customer[]; value: Customer | null; onSelect: (c: Customer) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers.slice(0, 30);
    return customers.filter((c) => c.hotel_name.toLowerCase().includes(q)).slice(0, 30);
  }, [customers, query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        placeholder="Type customer name..."
        value={open ? query : value ? value.hotel_name : ''}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0,
            background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10,
            maxHeight: 220, overflowY: 'auto', marginTop: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
          }}
        >
          {filtered.length === 0 && <div style={{ padding: 10, fontSize: '0.85em', color: 'var(--text-muted)' }}>No customers found</div>}
          {filtered.map((c) => (
            <div
              key={c.id}
              onMouseDown={() => { onSelect(c); setOpen(false); }}
              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '0.88em', borderBottom: '1px solid var(--border)' }}
            >
              {c.hotel_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

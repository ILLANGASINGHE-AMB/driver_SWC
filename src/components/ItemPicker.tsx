import React, { useMemo, useState } from 'react';
import type { Item } from '../types';

export function ItemPicker({ items, value, onSelect }: { items: Item[]; value: Item | null; onSelect: (item: Item) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items.slice(0, 30);
    return items.filter((i) => i.item_name.toLowerCase().includes(q) || i.item_id.toLowerCase().includes(q)).slice(0, 30);
  }, [items, query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        placeholder="Search item..."
        value={open ? query : value ? `${value.item_id} — ${value.item_name}` : ''}
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
          {filtered.length === 0 && <div style={{ padding: 10, fontSize: '0.85em', color: 'var(--text-muted)' }}>No items found</div>}
          {filtered.map((i) => (
            <div
              key={i.id}
              onMouseDown={() => { onSelect(i); setOpen(false); }}
              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '0.88em', borderBottom: '1px solid var(--border)' }}
            >
              <strong>{i.item_id}</strong> — {i.item_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

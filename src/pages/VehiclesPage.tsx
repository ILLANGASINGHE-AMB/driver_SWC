import React, { useEffect, useState } from 'react';
import { db } from '../api/db';
import { DistanceChart } from '../components/DistanceChart';
import type { Trip, Vehicle } from '../types';

// Read-only, per VehiclesTab.md — driver role never had add/edit/delete
// controls for vehicles, only View.
export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [tab, setTab] = useState<'details' | 'graph'>('details');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([db.getVehicles(), db.getTrips()]).then(([v, t]) => {
      setVehicles(v);
      setTrips(t);
      setLoading(false);
    });
  }, []);

  const distanceFor = (vehicleId: number) => trips.filter((t) => String(t.vehicle_id) === String(vehicleId)).reduce((s, t) => s + (t.distance_km || 0), 0);
  const totalDistance = vehicles.reduce((s, v) => s + distanceFor(v.id), 0);
  const filtered = vehicles.filter((v) => !search || v.vehicle_no.toLowerCase().includes(search.toLowerCase()) || (v.model || '').toLowerCase().includes(search.toLowerCase()));

  if (loading) return <p>Loading...</p>;

  if (selected) {
    const vehicleTrips = trips.filter((t) => String(t.vehicle_id) === String(selected.id));
    return (
      <div>
        <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>
          <i className="fas fa-arrow-left" /> Back to Vehicles
        </button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', marginBottom: 12 }}>{selected.vehicle_no}</h1>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid-2" style={{ fontSize: '0.88em' }}>
            <div><div className="form-label" style={{ marginBottom: 2 }}>Type</div><div>{selected.category}</div></div>
            <div><div className="form-label" style={{ marginBottom: 2 }}>Model</div><div>{selected.model || '—'}</div></div>
            <div><div className="form-label" style={{ marginBottom: 2 }}>Status</div><div><span className="badge badge-blue">{selected.status}</span></div></div>
            <div><div className="form-label" style={{ marginBottom: 2 }}>Total Distance</div><div>{distanceFor(selected.id).toLocaleString()} KM</div></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className={`btn ${tab === 'details' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('details')} style={{ flex: 1 }}>Trip History</button>
          <button className={`btn ${tab === 'graph' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('graph')} style={{ flex: 1 }}>Graph</button>
        </div>
        {tab === 'details' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vehicleTrips.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No trips recorded.</div>}
            {vehicleTrips.map((t) => (
              <div key={t.id} className="card" style={{ fontSize: '0.85em' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontFamily: 'monospace' }}>{t.trip_id}</strong>
                  <span>{t.driver_name}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{t.start_date} — {t.distance_km != null ? `${t.distance_km} KM` : t.status}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><DistanceChart trips={vehicleTrips} /></div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', marginBottom: 16 }}>Vehicles</h1>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="stat-card"><div className="label">Total Vehicles</div><div className="value">{vehicles.length}</div></div>
        <div className="stat-card"><div className="label">Total Distance</div><div className="value">{totalDistance.toLocaleString()} KM</div></div>
      </div>
      <input className="form-input" placeholder="Search vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((v) => (
          <button
            key={v.id}
            className="card"
            onClick={() => setSelected(v)}
            style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{v.vehicle_no}</div>
              <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{v.category}{v.model ? ` · ${v.model}` : ''}</div>
            </div>
            <span className={`badge ${(v.status || 'available').toLowerCase() === 'available' ? 'badge-green' : 'badge-yellow'}`}>{v.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { db } from '../api/db';
import { useAuth } from '../context/AuthContext';
import { DistanceChart } from '../components/DistanceChart';
import type { Trip } from '../types';

// Read-only, per the confirmed plan — edits to a driver's own details
// still go through an admin in the desktop app. Fields ported from
// app.js's driver detail page (~app.js:1697-1747).
export function ProfilePage() {
  const { driver, signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'trips' | 'graph'>('trips');

  useEffect(() => {
    db.getTrips().then((t) => { setTrips(t); setLoading(false); });
  }, []);

  if (!driver) return null;

  const totalKm = trips.reduce((s, t) => s + (t.distance_km || 0), 0);
  const completed = trips.filter((t) => t.status === 'Completed').length;
  const inProgress = trips.filter((t) => t.status === 'In Progress').length;
  const statusVal = (driver.status || 'available').toLowerCase();
  const statusBadge = statusVal === 'available' ? 'badge-green' : statusVal === 'busy' ? 'badge-yellow' : 'badge-gray';

  return (
    <div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', marginBottom: 16 }}>
        {driver.name}{driver.nickname ? <span style={{ fontSize: '0.6em', color: 'var(--text-muted)', fontWeight: 400 }}> ({driver.nickname})</span> : ''}
      </h1>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="stat-card"><div className="label">Total KMs</div><div className="value">{totalKm.toLocaleString()}</div></div>
        <div className="stat-card"><div className="label">Total Trips</div><div className="value">{trips.length}</div><div style={{ fontSize: '0.72em', color: 'var(--text-muted)' }}>{completed} done, {inProgress} active</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88em' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><i className="fas fa-phone" style={{ width: 16, color: 'var(--success)' }} /> Contact No 1</span>
          <strong>{driver.phone || '—'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><i className="fas fa-phone-volume" style={{ width: 16, color: '#06b6d4' }} /> Contact No 2</span>
          <strong>{driver.phone2 || '—'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><i className="fas fa-id-card" style={{ width: 16, color: '#8b5cf6' }} /> NIC</span>
          <strong>{driver.nic || '—'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><i className="fas fa-envelope" style={{ width: 16, color: 'var(--info)' }} /> Email</span>
          <strong>{driver.email || '—'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><i className="fas fa-map-marker-alt" style={{ width: 16, color: '#ec4899' }} /> Address</span>
          <strong style={{ textAlign: 'right' }}>{driver.address || '—'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Status</span>
          <span className={`badge ${statusBadge}`}>{statusVal}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`btn ${tab === 'trips' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('trips')} style={{ flex: 1 }}>Trip History</button>
        <button className={`btn ${tab === 'graph' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('graph')} style={{ flex: 1 }}>Graph</button>
      </div>

      {loading ? <p>Loading...</p> : tab === 'trips' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trips.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No trips yet.</div>}
          {trips.map((t) => (
            <div key={t.id} className="card" style={{ fontSize: '0.85em' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontFamily: 'monospace' }}>{t.trip_id}</strong>
                <span className={`badge ${t.status === 'Completed' ? 'badge-green' : 'badge-yellow'}`}>{t.status}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{t.start_date} · {t.vehicle_no || 'No vehicle'}{t.distance_km != null ? ` · ${t.distance_km} KM` : ''}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><DistanceChart trips={trips} /></div>
      )}

      <button className="btn btn-secondary btn-block" style={{ marginTop: 20 }} onClick={signOut}>
        <i className="fas fa-sign-out-alt" /> Log Out
      </button>
    </div>
  );
}

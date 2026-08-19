import React, { useCallback, useEffect, useState } from 'react';
import { db } from '../api/db';
import { StartTripModal } from '../components/StartTripModal';
import { EndTripModal } from '../components/EndTripModal';
import type { Trip } from '../types';

export function TransportPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ongoing' | 'completed'>('ongoing');
  const [showStart, setShowStart] = useState(false);
  const [endingTrip, setEndingTrip] = useState<Trip | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    db.getTrips().then((t) => { setTrips(t); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = trips.filter((t) => (filter === 'ongoing' ? t.status === 'In Progress' : t.status === 'Completed'));
  const ongoingCount = trips.filter((t) => t.status === 'In Progress').length;
  const completedCount = trips.filter((t) => t.status === 'Completed').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', margin: 0 }}>My Trips</h1>
        <button className="btn btn-primary" onClick={() => setShowStart(true)}>
          <i className="fas fa-plus" /> New Trip
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn ${filter === 'ongoing' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('ongoing')} style={{ flex: 1 }}>
          Ongoing ({ongoingCount})
        </button>
        <button className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('completed')} style={{ flex: 1 }}>
          Completed ({completedCount})
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && visible.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
          No {filter} trips.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map((t) => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{t.trip_id}</div>
                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: 2 }}>{t.vehicle_no || 'No vehicle'}</div>
              </div>
              <span className={`badge ${t.status === 'In Progress' ? 'badge-yellow' : 'badge-green'}`}>{t.status}</span>
            </div>
            <div style={{ fontSize: '0.82em', color: 'var(--text-muted)', marginTop: 8 }}>
              {t.start_date} @ {t.start_time}
              {t.status === 'Completed' && t.distance_km != null && (
                <> — {t.distance_km} KM ({t.starting_km} → {t.final_km})</>
              )}
            </div>
            {t.selected_customers?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {t.selected_customers.map((c) => (
                  <span key={c.customer_id} className="badge badge-blue" style={{ fontSize: '0.72em' }}>#{c.visit_order} {c.hotel_name}</span>
                ))}
              </div>
            )}
            {t.status === 'In Progress' && (
              <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => setEndingTrip(t)}>
                <i className="fas fa-flag-checkered" /> End Trip
              </button>
            )}
          </div>
        ))}
      </div>

      {showStart && (
        <StartTripModal
          onClose={() => setShowStart(false)}
          onStarted={() => { setShowStart(false); setFilter('ongoing'); load(); }}
        />
      )}
      {endingTrip && (
        <EndTripModal
          trip={endingTrip}
          onClose={() => setEndingTrip(null)}
          onEnded={() => { setEndingTrip(null); load(); }}
        />
      )}
    </div>
  );
}

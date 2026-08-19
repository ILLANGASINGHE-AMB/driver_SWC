import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { db } from '../api/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { CustomerSequencePicker } from './CustomerSequencePicker';
import type { Customer, Trip, VisitedCustomer } from '../types';

// Port of transport.js's openEndTripModal/saveEndTrip.
export function EndTripModal({ trip, onClose, onEnded }: { trip: Trip; onClose: () => void; onEnded: () => void }) {
  const { driver } = useAuth();
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [finalKm, setFinalKm] = useState('');
  const [notes, setNotes] = useState(trip.notes || '');
  const [selected, setSelected] = useState<VisitedCustomer[]>(trip.selected_customers || []);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    db.getCustomers().then((c) => { setCustomers(c); setLoading(false); });
  }, []);

  const finalKmNum = parseFloat(finalKm) || 0;
  const distancePreview = finalKmNum > trip.starting_km ? (finalKmNum - trip.starting_km).toFixed(1) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finalKmNum <= trip.starting_km) {
      toast(`End Km (${finalKmNum}) must be greater than Starting Km (${trip.starting_km}).`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const distanceKm = parseFloat((finalKmNum - trip.starting_km).toFixed(2));
      await db.updateTrip(trip.id, {
        end_date: endDate,
        end_time: endTime,
        final_km: finalKmNum,
        distance_km: distanceKm,
        selected_customers: selected,
        notes,
        status: 'Completed'
      });
      const releaseOps: Promise<void>[] = [];
      if (trip.driver_id) releaseOps.push(db.updateDriverStatus(trip.driver_id, 'available'));
      if (trip.vehicle_id) releaseOps.push(db.updateVehicleStatus(trip.vehicle_id, 'available'));
      await Promise.all(releaseOps);

      await db.logAction('End Trip', `Completed trip ${trip.trip_id} (Distance: ${distanceKm} KM)`, { trip_id: trip.trip_id, distance_km: distanceKm, selected_customers: selected }, 'Transport', driver?.name || 'Driver');

      toast(`Trip ${trip.trip_id} completed! Distance: ${distanceKm} KM`);
      onEnded();
    } catch (err) {
      toast('Failed to end trip: ' + ((err as Error).message || err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`End Trip (${trip.trip_id})`} onClose={onClose}>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 14, fontSize: '0.85em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vehicle: <strong>{trip.vehicle_no || 'N/A'}</strong></span>
              <span>Start KM: <strong>{trip.starting_km}</strong></span>
            </div>
            <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Started {trip.start_date} @ {trip.start_time}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <CustomerSequencePicker customers={customers} value={selected} onChange={setSelected} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="text" className="form-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="e.g. 05:45 PM" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">End KM (must be &gt; {trip.starting_km}) *</label>
            <input type="number" step="0.1" className="form-input" value={finalKm} onChange={(e) => setFinalKm(e.target.value)} required />
          </div>

          <div className="card" style={{ marginBottom: 14, background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85em', fontWeight: 700 }}>Distance Travelled:</span>
            <span style={{ fontWeight: 700, color: distancePreview ? 'var(--success)' : 'var(--danger)' }}>
              {distancePreview ? `${distancePreview} KM` : `Must be > ${trip.starting_km}`}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea className="form-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <i className="fas fa-flag-checkered" /> {submitting ? 'Ending...' : 'End Trip'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

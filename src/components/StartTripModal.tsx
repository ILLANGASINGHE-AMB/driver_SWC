import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { db } from '../api/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import type { Trip, Vehicle } from '../types';

// Port of transport.js's openStartTripModal/saveStartTrip, scoped to the
// logged-in driver — there is no driver picker here (driverApp.md step 5:
// "everywhere user needed to select driver, automatically fills with the
// driver profile logged in"), only a vehicle picker.
export function StartTripModal({ onClose, onStarted }: { onClose: () => void; onStarted: () => void }) {
  const { driver, refreshDriver } = useAuth();
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [startingKm, setStartingKm] = useState('');
  const [kmLocked, setKmLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([db.getVehicles(), db.getTrips()]).then(([v, t]) => {
      setVehicles(v);
      setTrips(t);
      setLoading(false);
    });
  }, []);

  const activeVehicleIds = useMemo(
    () => new Set(trips.filter((t) => t.status === 'In Progress' && t.vehicle_id != null).map((t) => String(t.vehicle_id))),
    [trips]
  );
  const availableVehicles = useMemo(
    () => vehicles.filter((v) => (v.status || 'available').toLowerCase() === 'available' && !activeVehicleIds.has(String(v.id))),
    [vehicles, activeVehicleIds]
  );

  const onVehicleChange = (id: string) => {
    setVehicleId(id);
    if (!id) {
      setStartingKm('');
      setKmLocked(false);
      return;
    }
    const vehicleTrips = trips
      .filter((t) => String(t.vehicle_id) === String(id) && t.final_km !== null && t.final_km !== undefined)
      .sort((a, b) => new Date(b.end_date || b.created_at || 0).getTime() - new Date(a.end_date || a.created_at || 0).getTime());
    if (vehicleTrips.length > 0) {
      setStartingKm(String(vehicleTrips[0].final_km));
      setKmLocked(true);
    } else {
      setStartingKm('0');
      setKmLocked(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    if (!vehicleId) return toast('Please select a vehicle', 'error');
    if (startingKm === '') return toast('Starting KM is required', 'error');
    setSubmitting(true);
    try {
      // Re-check availability at save time (race guard, matches desktop).
      const [freshTrips, vehicle] = await Promise.all([db.getTrips(), db.getVehicle(vehicleId)]);
      const driverBusy = freshTrips.some((t) => t.status === 'In Progress' && String(t.driver_id) === String(driver.id));
      if (driverBusy || (driver.status || 'available').toLowerCase() !== 'available') {
        toast('You already have a trip in progress.', 'error');
        return;
      }
      const vehicleBusy = freshTrips.some((t) => t.status === 'In Progress' && String(t.vehicle_id) === String(vehicleId));
      if (!vehicle || vehicleBusy || (vehicle.status || 'available').toLowerCase() !== 'available') {
        toast('Selected vehicle is no longer available.', 'error');
        return;
      }

      const record = await db.addTrip({
        driver_id: driver.id,
        driver_name: driver.name,
        vehicle_id: vehicleId,
        vehicle_no: vehicle.vehicle_no,
        start_date: startDate,
        start_time: startTime,
        starting_km: parseFloat(startingKm)
      });

      await Promise.all([db.updateDriverStatus(driver.id, 'busy'), db.updateVehicleStatus(vehicleId, 'busy')]);
      await db.logAction('Start Trip', `Started trip ${record.trip_id} using vehicle "${vehicle.vehicle_no}" (Start KM: ${startingKm})`, record as unknown as Record<string, unknown>, 'Transport', driver.name);

      toast(`Trip ${record.trip_id} started!`);
      await refreshDriver();
      onStarted();
    } catch (err) {
      toast('Failed to start trip: ' + ((err as Error).message || err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Start New Trip" onClose={onClose}>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select className="form-input" value={vehicleId} onChange={(e) => onVehicleChange(e.target.value)} required>
              <option value="">Select vehicle...</option>
              {availableVehicles.length === 0 && <option value="" disabled>No vehicles available right now</option>}
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicle_no}{v.model ? ` — ${v.model}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="text" className="form-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="e.g. 08:30 AM" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Starting KM {kmLocked ? '(auto-calibrated, locked)' : ''}</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={startingKm}
              onChange={(e) => setStartingKm(e.target.value)}
              readOnly={kmLocked}
              placeholder="Select a vehicle first"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <i className="fas fa-play" /> {submitting ? 'Starting...' : 'Start & Save'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

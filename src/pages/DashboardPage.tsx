import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../api/db';
import { useAuth } from '../context/AuthContext';
import type { Customer, Order, Trip } from '../types';

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Landing tab after login — a quick-glance summary (active trip, today's /
// this month's activity) plus one-tap shortcuts into Start Trip and Place
// Order, so a driver doesn't have to hop into Transport just to see
// whether they're free to take a trip.
export function DashboardPage() {
  const { driver } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.getTrips(), db.getOrders(), db.getCustomers()]).then(([t, o, c]) => {
      setTrips(t);
      setOrders(o);
      setCustomers(c);
      setLoading(false);
    });
  }, []);

  const activeTrip = trips.find((t) => t.status === 'In Progress' && String(t.driver_id) === String(driver?.id));
  const tripsToday = trips.filter((t) => isToday(t.start_date)).length;
  const kmThisMonth = trips
    .filter((t) => t.status === 'Completed' && isThisMonth(t.start_date))
    .reduce((s, t) => s + (t.distance_km || 0), 0);
  const ordersThisMonth = orders.filter((o) => isThisMonth(o.pickup_date)).length;
  const pendingOrders = orders.filter((o) => o.status !== 'Paid').length;

  const customerName = useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c.hotel_name]));
    return (id: number) => byId.get(id) || `Customer #${id}`;
  }, [customers]);

  const recentOrders = orders.slice(0, 3);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3em', marginBottom: 2 }}>
        {greeting()}, {driver?.nickname || driver?.name?.split(' ')[0] || 'Driver'}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: 16 }}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {activeTrip ? (
        <div
          className="card"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/transport')}
          style={{ borderLeft: '4px solid var(--warning)', marginBottom: 16, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-yellow">Trip in progress</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{activeTrip.trip_id}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: '0.9em' }}>
            <strong>{activeTrip.vehicle_no || 'Vehicle'}</strong>
            <span style={{ color: 'var(--text-muted)' }}> · started {activeTrip.start_time} · {activeTrip.starting_km} KM start</span>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>No trip in progress</span>
          <button className="btn btn-primary" onClick={() => navigate('/transport')}>
            <i className="fas fa-play" /> Start Trip
          </button>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="stat-card"><div className="label">Trips Today</div><div className="value">{tripsToday}</div></div>
        <div className="stat-card"><div className="label">KM This Month</div><div className="value">{kmThisMonth.toLocaleString()}</div></div>
      </div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="label">Orders This Month</div><div className="value">{ordersThisMonth}</div></div>
        <div className="stat-card"><div className="label">Pending Orders</div><div className="value">{pendingOrders}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-secondary btn-block" onClick={() => navigate('/orders/new')}>
          <i className="fas fa-plus" /> New Order
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate('/vehicles')}>
          <i className="fas fa-car" /> Vehicles
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>Recent Orders</span>
        <button className="btn btn-secondary" onClick={() => navigate('/orders')} style={{ padding: '6px 12px', minHeight: 0 }}>View All</button>
      </div>
      {recentOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentOrders.map((o) => (
            <div key={o.id} className="card" role="button" tabIndex={0} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontFamily: 'monospace' }}>{o.batch_id}</strong>
                <span className={`badge ${o.status === 'Paid' ? 'badge-green' : o.status === 'Partially Paid' ? 'badge-yellow' : 'badge-gray'}`}>{o.status}</span>
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>{customerName(o.customer_id)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

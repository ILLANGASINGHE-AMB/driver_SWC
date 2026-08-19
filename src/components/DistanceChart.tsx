import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Trip } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// Distance-over-time line chart, shared by VehicleDetail and ProfilePage —
// both TransportTab.md/driverApp.md's "non-linear graph" requirement for
// vehicle/driver profiles.
export function DistanceChart({ trips }: { trips: Trip[] }) {
  const completed = trips
    .filter((t) => t.status === 'Completed' && t.distance_km != null)
    .sort((a, b) => new Date(a.end_date || a.start_date).getTime() - new Date(b.end_date || b.start_date).getTime());

  if (completed.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: '0.85em' }}>No completed trips yet.</div>;
  }

  const data = {
    labels: completed.map((t) => t.end_date || t.start_date),
    datasets: [
      {
        label: 'Distance (KM)',
        data: completed.map((t) => t.distance_km),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13,148,136,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }
    ]
  };

  return (
    <div style={{ height: 220 }}>
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }}
      />
    </div>
  );
}

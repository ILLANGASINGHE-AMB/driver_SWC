import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/transport', icon: 'fa-truck-fast', label: 'Transport' },
  { to: '/vehicles', icon: 'fa-car', label: 'Vehicles' },
  { to: '/customers', icon: 'fa-hotel', label: 'Customers' },
  { to: '/orders', icon: 'fa-boxes-stacked', label: 'Orders' },
  { to: '/profile', icon: 'fa-user', label: 'Profile' }
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <i className={`fas ${t.icon}`} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

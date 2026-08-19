import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Structure follows driverApp.md's own ASCII diagram exactly: logo box on
// the left, username/password stacked on the right, login button below
// spanning both — a deliberately different layout from the desktop app's
// single-column logo-on-top login-card. Colors/fonts/icons are pulled from
// the desktop app's #login-screen CSS (index.html:440-474) to keep the
// same branding across both apps.
export function LoginPage() {
  const { signIn, status, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // error surfaced via auth context's `error`
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'linear-gradient(160deg, #0a6e6e 0%, #0d9488 40%, #0891b2 100%)'
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          padding: '32px 28px',
          width: '100%',
          maxWidth: 420
        }}
      >
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="SAGA" style={{ width: 76, height: 76, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15em', fontWeight: 700, color: '#0d9488', lineHeight: 1.2 }}>
              Sagacious Washing Center
            </div>
            <div style={{ fontSize: '0.75em', color: '#94a3b8', marginTop: 4 }}>Driver App</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.72em', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-user" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="you@swc.com"
              style={{ width: '100%', height: 48, paddingLeft: 40, paddingRight: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.95em' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: '0.72em', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-lock" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Password"
              style={{ width: '100%', height: 48, paddingLeft: 40, paddingRight: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.95em' }}
            />
          </div>
        </div>

        {status === 'wrong-role' && (
          <div style={{ marginBottom: 14, fontSize: '0.85em', color: '#ef4444' }}>
            This app is for drivers only — use the main SWC system instead.
          </div>
        )}
        {status === 'unlinked' && (
          <div style={{ marginBottom: 14, fontSize: '0.85em', color: '#ef4444' }}>
            No driver profile is linked to this login yet — ask an admin to link it from the driver's profile in the main system.
          </div>
        )}
        {error && <div style={{ marginBottom: 14, fontSize: '0.85em', color: '#ef4444' }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 12,
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1em',
            cursor: submitting ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #0d9488, #0891b2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: submitting ? 0.8 : 1
          }}
        >
          <i className={submitting ? 'fas fa-spinner fa-spin' : 'fas fa-sign-in-alt'} />
          {submitting ? 'Signing in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { db } from '../api/db';
import type { Driver } from '../types';

type AuthStatus = 'loading' | 'signed-out' | 'wrong-role' | 'unlinked' | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  driver: Driver | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshDriver: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveDriver(session: Session): Promise<{ status: AuthStatus; driver: Driver | null }> {
  const role = (session.user.user_metadata as { role?: string } | undefined)?.role;
  if (role !== 'driver') {
    return { status: 'wrong-role', driver: null };
  }
  const driver = await db.getDriverByAuthUserId(session.user.id);
  if (!driver) {
    return { status: 'unlinked', driver: null };
  }
  return { status: 'ready', driver };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback(async (session: Session | null) => {
    if (!session) {
      setStatus('signed-out');
      setDriver(null);
      return;
    }
    try {
      const resolved = await resolveDriver(session);
      setStatus(resolved.status);
      setDriver(resolved.driver);
      if (resolved.status === 'wrong-role') {
        // This app is driver-only — don't leave an admin/staff session
        // sitting around logged into a screen that has nothing for them.
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Failed to resolve driver profile:', e);
      setStatus('signed-out');
      setDriver(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshDriver = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  return (
    <AuthContext.Provider value={{ status, driver, signIn, signOut, refreshDriver, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

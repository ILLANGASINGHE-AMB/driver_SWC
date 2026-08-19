import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal } from './Modal';

type ConfirmFn = (message: string) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback<ConfirmFn>((message) => {
    return new Promise((resolve) => setState({ message, resolve }));
  }, []);

  const handle = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal title="Please confirm" onClose={() => handle(false)}>
          <p style={{ marginTop: 0, marginBottom: 20 }}>{state.message}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => handle(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => handle(true)}>Confirm</button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

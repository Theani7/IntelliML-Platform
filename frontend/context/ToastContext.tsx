'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextType {
  notify: (kind: ToastKind, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const item: ToastItem = { id, kind, title, message };
    setToasts((prev) => [...prev, item]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[200] space-y-2 w-[320px] max-w-[90vw] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg bg-white ${
              toast.kind === 'success'
                ? 'border-emerald-200'
                : toast.kind === 'error'
                  ? 'border-rose-200'
                  : 'border-[#FFEDC1]'
            }`}
          >
            <p className="text-sm font-bold text-[#470102]">{toast.title}</p>
            {toast.message && <p className="text-xs text-[#8A5A5A] mt-1">{toast.message}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

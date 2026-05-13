'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

type ToastContextValue = {
  show: (message: string, type?: Toast['type']) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = String(Date.now()) + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${
              t.type === 'success'
                ? 'bg-green-600 text-white'
                : t.type === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-ink text-canvas'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: (msg: string) => {
        if (typeof window !== 'undefined') {
          // SSR/no-provider safe fallback
          console.warn('Toast (no provider):', msg);
        }
      },
    } satisfies ToastContextValue;
  }
  return ctx;
}

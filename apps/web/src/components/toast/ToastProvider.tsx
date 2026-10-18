'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import styles from './Toast.module.css';

type ToastTone = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const DURATION: Record<ToastTone, number> = { success: 2500, error: 5000 };
const MAX_VISIBLE = 3;

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone) => {
      const id = ++nextId.current;
      setItems((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, message, tone }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), DURATION[tone]));
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(() => ({ success: (message) => show(message, 'success'), error: (message) => show(message, 'error') }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region}>
        {items.map((item) => (
          <div key={item.id} role={item.tone === 'error' ? 'alert' : 'status'} className={`${styles.toast} ${styles[item.tone]}`}>
            {item.tone === 'success' ? <CircleCheck className={styles.icon} width={20} height={20} aria-hidden="true" /> : <CircleAlert className={styles.icon} width={20} height={20} aria-hidden="true" />}
            <p className={styles.message}>{item.message}</p>
            <button type="button" className={styles.close} aria-label="Dismiss notification" onClick={() => dismiss(item.id)}>
              <X width={16} height={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
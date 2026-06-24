'use client';
import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import styles from './Toast.module.css';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={styles.container}>
        {toasts.map(t => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
            {t.type === 'success' && '✓ '}
            {t.type === 'error'   && '✕ '}
            {t.type === 'info'    && 'ℹ '}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

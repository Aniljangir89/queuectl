// src/contexts/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', ttl = 5000) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts(current => [...current, { id, message, type }]);

    // Auto-remove toast after ttl milliseconds
    if (ttl > 0) {
      setTimeout(() => {
        setToasts(current => current.filter(toast => toast.id !== id));
      }, ttl);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container" role="alert" aria-live="polite" style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999
      }}>
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
            style={{
              minWidth: 220,
              padding: '10px 12px',
              borderRadius: 8,
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              background: toast.type === 'error' ? '#fee2e2' : '#111827',
              color: toast.type === 'error' ? '#b91c1c' : '#fff',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <div className="toast-content">{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired
};

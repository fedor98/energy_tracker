/**
 * ToastContext - Global Toast State Management with Container
 * 
 * Provides a global toast notification system with:
 * - Multiple toast types: success, error, info
 * - Auto-dismiss after 5 seconds (except errors) - managed by Toast component
 * - Manual close via X button or click (success/info only)
 * - Hover pauses auto-dismiss, leaving resets the timer
 * - Stacked toast support
 * - Responsive positioning (mobile: full-width top, desktop: top-right)
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastComponent } from './index';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const AUTO_DISMISS_DELAY = 5000; // 5 seconds

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      type,
      message,
      createdAt: Date.now(),
    };

    setToasts(prev => [...prev, newToast]);

    return id;
  }, []);

  const success = useCallback((message: string) => {
    addToast('success', message);
  }, [addToast]);

  const error = useCallback((message: string) => {
    addToast('error', message);
  }, [addToast]);

  const info = useCallback((message: string) => {
    addToast('info', message);
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        success,
        error,
        info,
      }}
    >
      {children}
      
      {/* Toast Container - rendered directly in the provider */}
      {toasts.length > 0 && (
        <div
          className="
            fixed z-50 flex flex-col gap-2
            /* Mobile: Full width at top */
            top-0 left-0 right-0
            /* Desktop: Top-right corner */
            sm:top-4 sm:right-4 sm:left-auto sm:max-w-sm
            /* Padding */
            p-4 sm:p-0
          "
          aria-live="polite"
          aria-atomic="true"
        >
          {toasts.map((toast) => (
            <ToastComponent
              key={toast.id}
              id={toast.id}
              type={toast.type}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

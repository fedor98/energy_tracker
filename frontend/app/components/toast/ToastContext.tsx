/**
 * ToastContext - Global Toast State Management with Container
 * 
 * Provides a global toast notification system with:
 * - Multiple toast types: success, error, info
 * - Auto-dismiss after 5 seconds (except errors)
 * - Manual close via X button or click (success/info only)
 * - Stacked toast support
 * - Responsive positioning (mobile: full-width top, desktop: top-right)
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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

const AUTO_DISMISS_DELAY = 5000; // 5 seconds

// Internal ToastContainer component that uses the context
function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;
  
  // We need to access toasts from the provider's internal state
  // Since we can't access state directly from context value,
  // we'll use a different approach - the container will be rendered inside the provider
  return null;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const removeToast = useCallback((id: string) => {
    // Clear any existing timeout for this toast
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
    
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

    // Auto-dismiss after delay for success and info (not errors)
    if (type !== 'error') {
      timeoutsRef.current[id] = setTimeout(() => {
        removeToast(id);
      }, AUTO_DISMISS_DELAY);
    }

    return id;
  }, [removeToast]);

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

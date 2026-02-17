/**
 * Toast Component - Individual Toast Notification
 *
 * Features:
 * - Slide-in animation from top
 * - Different styling for success, error, and info types
 * - Auto-dismiss with hover pause and reset on leave (Option 2)
 *   - Success/Info: Auto-dismiss after 5 seconds
 *   - Hover pauses the timer
 *   - Leaving resets the timer to full 5 seconds
 *   - Error: No auto-dismiss
 * - Close behavior:
 *   - Success/Info: Click anywhere on toast to close, or X button
 *   - Error: Only X button closes (no click-to-close)
 * - CheckCircle icon for success, XCircle for error, Info for info
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { ToastType } from './ToastContext';
import { AUTO_DISMISS_DELAY } from './ToastContext';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: () => void;
}

const toastConfig = {
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-500',
    Icon: CheckCircle,
  },
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
    Icon: XCircle,
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500',
    Icon: Info,
  },
};

export function Toast({ id, type, message, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const config = toastConfig[type];
  const Icon = config.Icon;

  // Auto-dismiss timer ref
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);

  // Start auto-dismiss timer (for success and info only)
  const startDismissTimer = useCallback(() => {
    // Only auto-dismiss for success and info, not errors
    if (type === 'error') return;

    // Clear any existing timer first
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    // Start new timer with full delay (Option 2: reset on leave)
    dismissTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        handleClose();
      }
    }, AUTO_DISMISS_DELAY);
  }, [type]);

  // Clear auto-dismiss timer
  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Trigger enter animation after mount and start dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);

    // Start auto-dismiss timer for non-error toasts
    if (type !== 'error') {
      startDismissTimer();
    }

    return () => {
      clearTimeout(timer);
      clearDismissTimer();
    };
  }, [type, startDismissTimer, clearDismissTimer]);

  const handleClose = () => {
    setIsLeaving(true);
    clearDismissTimer();
    // Wait for exit animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = () => {
    // Only allow click-to-close for success and info, not errors
    if (type !== 'error') {
      handleClose();
    }
  };

  const handleMouseEnter = () => {
    // Pause the timer when hovering
    if (type !== 'error') {
      isPausedRef.current = true;
      clearDismissTimer();
    }
  };

  const handleMouseLeave = () => {
    // Resume timer (reset to full duration) when leaving (Option 2)
    if (type !== 'error') {
      isPausedRef.current = false;
      startDismissTimer();
    }
  };

  const cursorStyle = type !== 'error' ? 'cursor-pointer' : 'cursor-default';

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-lg shadow-lg border
        ${config.bgColor} ${config.borderColor} ${cursorStyle}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
      `}
      role="alert"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <p className={`flex-1 text-sm font-medium ${config.textColor}`}>
        {message}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className={`
          flex-shrink-0 p-1 rounded-full transition-colors
          hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-1
          ${type === 'success' ? 'focus:ring-green-500' : ''}
          ${type === 'error' ? 'focus:ring-red-500' : ''}
          ${type === 'info' ? 'focus:ring-blue-500' : ''}
        `}
        aria-label="Close notification"
      >
        <X className={`w-4 h-4 ${config.textColor}`} />
      </button>
    </div>
  );
}

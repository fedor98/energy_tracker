/**
 * Toggle Component
 * 
 * A flexible toggle switch component that supports two variants:
 * - 'standard': Simple on/off toggle (green/gray) - used for custom meter IDs
 * - 'water': Specialized toggle with blue/red for cold/warm water selection
 * 
 * Styled after the original legacy design from setup.js
 */

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  variant?: 'standard' | 'water';
}

export function Toggle({ checked, onChange, variant = 'standard' }: ToggleProps) {
  if (variant === 'water') {
    return (
      <div
        className="flex items-center justify-center gap-3 py-2 px-4 rounded-full"
        style={{
          background: '#f3f4f6',
          cursor: 'pointer',
        }}
        onClick={onChange}
      >
        {/* Cold Label */}
        <span
          className="text-sm font-medium transition-all"
          style={{
            minWidth: '3rem',
            textAlign: 'center',
            fontWeight: !checked ? 700 : 400,
            opacity: !checked ? 1 : 0.4,
            color: !checked ? '#2563eb' : '#6b7280',
          }}
        >
          🔵 Cold
        </span>

        {/* Toggle Switch */}
        <div
          style={{
            width: '2.75rem',
            height: '1.5rem',
            background: checked ? '#ef4444' : '#3b82f6',
            borderRadius: '1.5rem',
            position: 'relative',
            transition: 'background 0.2s ease',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '1.25rem',
              height: '1.25rem',
              background: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '0.125rem',
              left: checked ? 'calc(100% - 1.375rem)' : '0.125rem',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </div>

        {/* Warm Label */}
        <span
          className="text-sm font-medium transition-all"
          style={{
            minWidth: '3rem',
            textAlign: 'center',
            fontWeight: checked ? 700 : 400,
            opacity: checked ? 1 : 0.4,
            color: checked ? '#dc2626' : '#6b7280',
          }}
        >
          🔴 Warm
        </span>
      </div>
    );
  }

  // Standard variant
  return (
    <div
      onClick={onChange}
      className="cursor-pointer"
      style={{
        width: '2.75rem',
        height: '1.5rem',
        background: checked ? '#22c55e' : '#d1d5db',
        borderRadius: '1.5rem',
        position: 'relative',
        transition: 'background 0.2s ease',
      }}
    >
      <div
        style={{
          width: '1.25rem',
          height: '1.25rem',
          background: 'white',
          borderRadius: '50%',
          position: 'absolute',
          top: '0.125rem',
          left: checked ? 'calc(100% - 1.375rem)' : '0.125rem',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

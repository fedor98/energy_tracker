/**
 * MonthFilterInput Component - Reusable date filter input with browser compatibility
 *
 * Renders a month/year selector input with:
 * - Firefox compatibility (uses date input with conversion)
 * - Modern browsers (uses native month input)
 * - Custom styling for consistent appearance
 * - Click-to-open picker on desktop
 *
 * Props:
 * - id: HTML id for the input element
 * - label: Display label for the filter
 * - value: Current value in YYYY-MM format
 * - onChange: Callback when value changes
 */

import { useRef } from 'react';

interface MonthFilterInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Detect Firefox for browser-specific input handling
// Firefox doesn't support type="month" inputs properly, so we use type="date" and extract year/month
const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');

export function MonthFilterInput({ id, label, value, onChange }: MonthFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle date input changes for Firefox
   * Converts full date (YYYY-MM-DD) to month format (YYYY-MM)
   */
  const handleFirefoxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const [year, month] = dateValue.split('-');
      onChange(`${year}-${month}`);
    } else {
      onChange('');
    }
  };

  return (
    <div className="w-full sm:flex-1 min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {/* Render appropriate input based on browser */}
        {isFirefox ? (
          <input
            type="date"
            id={id}
            ref={inputRef}
            value={value ? `${value}-01` : ''}
            onChange={handleFirefoxChange}
            className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
            style={{ WebkitAppearance: 'none' }}
          />
        ) : (
          <input
            type="month"
            id={id}
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
            style={{ WebkitAppearance: 'none' }}
          />
        )}
        {/* Overlay to trigger native date picker on click (desktop only) */}
        <div
          className="absolute inset-0 cursor-pointer sm:block hidden"
          onClick={() => inputRef.current?.showPicker?.()}
          style={{ zIndex: 10 }}
        />
      </div>
    </div>
  );
}

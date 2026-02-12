/**
 * DateSection Component
 *
 * A reusable date input section with consistent styling.
 * Used in Add, Reset, and Edit routes for date selection.
 *
 * Features:
 * - Gray background container
 * - Label with customizable text
 * - Date input with native picker support
 * - Optional helper text (e.g., for date change notifications)
 */

import React, { useRef } from 'react';

export interface DateSectionProps {
  /** Label text displayed above the input */
  label?: string;
  /** Current date value (YYYY-MM-DD format) */
  value: string;
  /** Callback when date changes */
  onChange: (value: string) => void;
  /** Optional helper text displayed below the input */
  helperText?: string;
}

export function DateSection({
  label = 'Date',
  value,
  onChange,
  helperText,
}: DateSectionProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          ref={dateInputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative"
          style={{ WebkitAppearance: 'none' }}
        />
        <div
          className="absolute inset-0 cursor-pointer sm:block hidden"
          onClick={() => dateInputRef.current?.showPicker?.()}
          style={{ zIndex: 10 }}
        />
      </div>
      {helperText && (
        <p className="mt-2 text-sm text-blue-600">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default DateSection;

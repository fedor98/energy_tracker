/**
 * FormFooter Component
 *
 * A reusable footer for form pages with cancel/save actions.
 * Used in Add, Reset, and Edit routes.
 *
 * Features:
 * - Border-top separator
 * - Cancel button on the left
 * - Counter + Save button on the right
 * - Responsive layout (counter above buttons on mobile)
 * - Loading state support
 */

import React from 'react';

export interface FormFooterProps {
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Callback when save is clicked */
  onSave: () => void;
  /** Label for the save button */
  saveLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Number to display in the counter */
  counter?: number;
  /** Label for the counter (singular/plural handled by caller) */
  counterLabel?: string;
  /** Whether the form is currently saving */
  saving?: boolean;
}

export function FormFooter({
  onCancel,
  onSave,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  counter,
  counterLabel = 'item(s)',
  saving = false,
}: FormFooterProps) {
  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      {/* Counter - Full width on mobile, inline on desktop */}
      {counter !== undefined && (
        <div className="text-center sm:text-right mb-4 sm:mb-0 sm:hidden">
          <span className="text-sm text-gray-500">
            {counter} {counterLabel}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelLabel}
        </button>

        <div className="flex items-center gap-4">
          {/* Counter - Hidden on mobile, visible on desktop */}
          {counter !== undefined && (
            <span className="text-sm text-gray-500 hidden sm:inline">
              {counter} {counterLabel}
            </span>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormFooter;

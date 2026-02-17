/**
 * DeleteConfirmationDialog Component
 *
 * A modal dialog for confirming deletion of readings for a specific date.
 * Shows a summary of what will be deleted (counts by type).
 * Supports three deletion scopes: all readings, by energy type, or by specific meter.
 *
 * Features:
 * - Loading state while fetching counts
 * - Clear summary of items to be deleted
 * - Scope selection via dropdown
 * - Cancel and Delete buttons
 * - Accessible modal with focus trap
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ReadingCounts } from '../lib/api';
import { countReadingsByDate } from '../lib/api';
import { ElectricityIcon, WaterIcon, GasIcon, WarmWaterIndicator, ColdWaterIndicator } from './icons/MeterIcons';

type DeleteScope = 'all' | 'energy_type' | 'meter';

interface DeleteConfirmationDialogProps {
  date: string;
  meterType: 'electricity' | 'water' | 'gas';
  meterId: string;
  meterDisplayName: string;
  isWarmWater?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: DeleteScope) => void;
}

export function DeleteConfirmationDialog({
  date,
  meterType,
  meterId,
  meterDisplayName,
  isWarmWater,
  isOpen,
  onClose,
  onConfirm
}: DeleteConfirmationDialogProps) {
  const [counts, setCounts] = useState<ReadingCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<DeleteScope>('meter');

  useEffect(() => {
    if (isOpen && date) {
      fetchCounts();
    }
  }, [isOpen, date, selectedScope]);

  const fetchCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: ReadingCounts;
      if (selectedScope === 'all') {
        data = await countReadingsByDate(date);
      } else if (selectedScope === 'energy_type') {
        data = await countReadingsByDate(date, undefined, meterType);
      } else {
        data = await countReadingsByDate(date, undefined, meterType, meterId);
      }
      setCounts(data);
    } catch (err) {
      setError('Failed to load reading counts');
    } finally {
      setLoading(false);
    }
  };

  const energyConfig = {
    electricity: { label: 'Electricity', icon: <ElectricityIcon size={16} />, countColor: 'bg-yellow-400' },
    water: { label: 'water', icon: <WaterIcon size={16} />, countColor: 'bg-blue-400' },
    gas: { label: 'gas', icon: <GasIcon size={16} />, countColor: 'bg-red-400' },
  } as const;

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4  backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2
              id="delete-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Confirm Deletion
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchCounts}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Scope Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deletion Scope
                </label>
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value as DeleteScope)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                >
                  <option value="all">All energy types</option>
                  <option value="energy_type">{energyConfig[meterType].label} only</option>
                  <option value="meter">Selected Meter only</option>
                </select>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {/* Date Tag - Purple */}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {formatShortDate(date)}
                  </span>
                  
                  {/* Scope Tag - Yellow */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {selectedScope === 'all' && 'all meters'}
                    {selectedScope === 'energy_type' && (
                      <>just: {energyConfig[meterType].icon}</>
                    )}
                    {selectedScope === 'meter' && (
                      <>
                        {meterType === 'water' && isWarmWater !== undefined && (
                          isWarmWater ? <WarmWaterIndicator /> : <ColdWaterIndicator />
                        )}
                        {meterDisplayName}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {counts && counts.total > 0 ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Items to be deleted:
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {(Object.keys(energyConfig) as Array<keyof typeof energyConfig>).map((type) => (
                        counts[type] > 0 && (
                          <li key={type} className="flex items-center text-gray-600">
                            <span className={`w-2 h-2 ${energyConfig[type].countColor} rounded-full mr-2`} />
                            {counts[type]} {energyConfig[type].label} reading
                            {counts[type] !== 1 ? 's' : ''}
                          </li>
                        )
                      ))}
                    </ul>
                    <p className="mt-3 pt-3 border-t border-gray-200 text-sm font-medium text-gray-900">
                      Total: {counts.total} reading{counts.total !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <p className="text-sm text-red-600">
                    This action cannot be undone.
                  </p>
                </>
              ) : (
                <p className="text-gray-600 text-center py-4">
                  No readings found for this deletion scope.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedScope)}
            disabled={loading || !counts || counts.total === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Readings
          </button>
        </div>
      </div>
    </div>
  );
}

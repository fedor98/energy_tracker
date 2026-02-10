/**
 * Edit Route
 * 
 * Allows editing of all meter readings for a specific date.
 * Uses the same design pattern as Add Reading and Reset routes for consistency.
 * 
 * URL Parameters:
 * - date: The date to edit (YYYY-MM-DD)
 * - period: The period to return to (YYYY-MM)
 * 
 * Features:
 * - Loads all readings for the specified date
 * - Shows only accordion sections for energy types with data
 * - Date field is editable
 * - Reset entries are marked with badge
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { AccordionSection } from '../components/AccordionSection';
import { ElectricityMeterForm } from '../components/ElectricityMeterForm';
import { WaterMeterForm } from '../components/WaterMeterForm';
import { GasMeterForm } from '../components/GasMeterForm';
import type {
  ReadingsByDateResponse,
  ElectricityReading,
  WaterReading,
  GasReading,
  ReadingUpdateItem
} from '../lib/api';
import { getReadingsByDate, updateReadingsByDate } from '../lib/api';

type OpenSection = 'electricity' | 'water' | 'gas' | null;

export default function EditRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const date = searchParams.get('date') || '';
  const period = searchParams.get('period') || '';

  const [originalDate, setOriginalDate] = useState(date);
  const [newDate, setNewDate] = useState(date);
  const [readings, setReadings] = useState<ReadingsByDateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Accordion state - only one section open at a time
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Readings state for editing - meter_id -> { value, comment }
  const [editReadings, setEditReadings] = useState<{
    electricity: Record<string, { value: string; comment: string }>;
    water: Record<string, { value: string; comment: string }>;
    gas: Record<string, { value: string; comment: string }>;
  }>({
    electricity: {},
    water: {},
    gas: {}
  });

  // ID maps to track reading IDs for saving
  const [idMaps, setIdMaps] = useState<{
    electricity: Record<string, number>;
    water: Record<string, number>;
    gas: Record<string, number>;
  }>({
    electricity: {},
    water: {},
    gas: {}
  });

  // Load readings for the date
  const loadReadings = useCallback(async () => {
    if (!date) {
      setError('No date specified');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getReadingsByDate(date);
      setReadings(data);

      // Transform readings into editable format
      const editable = {
        electricity: {} as Record<string, { value: string; comment: string }>,
        water: {} as Record<string, { value: string; comment: string }>,
        gas: {} as Record<string, { value: string; comment: string }>
      };

      const ids = {
        electricity: {} as Record<string, number>,
        water: {} as Record<string, number>,
        gas: {} as Record<string, number>
      };

      // Transform electricity readings
      data.electricity.forEach((reading: ElectricityReading) => {
        editable.electricity[reading.meter_id] = {
          value: reading.value.toString(),
          comment: reading.comment || ''
        };
        ids.electricity[reading.meter_id] = reading.id;
      });

      // Transform water readings
      data.water.forEach((reading: WaterReading) => {
        editable.water[reading.meter_id] = {
          value: reading.value.toString(),
          comment: reading.comment || ''
        };
        ids.water[reading.meter_id] = reading.id;
      });

      // Transform gas readings
      data.gas.forEach((reading: GasReading) => {
        editable.gas[reading.meter_id] = {
          value: reading.value.toString(),
          comment: reading.comment || ''
        };
        ids.gas[reading.meter_id] = reading.id;
      });

      setEditReadings(editable);
      setIdMaps(ids);

      // Open first section that has data
      if (data.electricity.length > 0) {
        setOpenSection('electricity');
      } else if (data.water.length > 0) {
        setOpenSection('water');
      } else if (data.gas.length > 0) {
        setOpenSection('gas');
      }
    } catch (err) {
      setError('Failed to load readings');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Toggle accordion section
  function toggleSection(section: OpenSection) {
    setOpenSection(openSection === section ? null : section);
  }

  // Update reading value for a specific meter
  function updateReadingValue(type: 'electricity' | 'water' | 'gas', meterId: string, value: string) {
    setEditReadings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [meterId]: {
          ...prev[type][meterId],
          value
        }
      }
    }));
  }

  // Update comment for a specific meter
  function updateComment(type: 'electricity' | 'water' | 'gas', meterId: string, comment: string) {
    setEditReadings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [meterId]: {
          ...prev[type][meterId],
          comment
        }
      }
    }));
  }

  // Count readings for a type
  function countReadings(type: 'electricity' | 'water' | 'gas'): number {
    return readings ? readings[type].length : 0;
  }

  // Check if there are any readings
  function hasAnyReadings(): boolean {
    return countReadings('electricity') > 0 || 
           countReadings('water') > 0 || 
           countReadings('gas') > 0;
  }

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const electricityUpdates: ReadingUpdateItem[] = [];
      const waterUpdates: ReadingUpdateItem[] = [];
      const gasUpdates: ReadingUpdateItem[] = [];

      // Collect electricity updates
      Object.entries(editReadings.electricity).forEach(([meterId, data]) => {
        const readingId = idMaps.electricity[meterId];
        if (readingId) {
          electricityUpdates.push({
            id: readingId,
            value: parseFloat(data.value) || 0,
            comment: data.comment
          });
        }
      });

      // Collect water updates
      Object.entries(editReadings.water).forEach(([meterId, data]) => {
        const readingId = idMaps.water[meterId];
        if (readingId) {
          waterUpdates.push({
            id: readingId,
            value: parseFloat(data.value) || 0,
            comment: data.comment
          });
        }
      });

      // Collect gas updates
      Object.entries(editReadings.gas).forEach(([meterId, data]) => {
        const readingId = idMaps.gas[meterId];
        if (readingId) {
          gasUpdates.push({
            id: readingId,
            value: parseFloat(data.value) || 0,
            comment: data.comment
          });
        }
      });

      // Check if date changed
      const dateChanged = newDate !== originalDate;

      await updateReadingsByDate(originalDate, {
        new_date: dateChanged ? newDate : undefined,
        electricity: electricityUpdates,
        water: waterUpdates,
        gas: gasUpdates
      });

      setSuccessMessage('Readings updated successfully');

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        if (period) {
          navigate(`/?period=${period}`);
        } else {
          navigate('/');
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save readings');
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading readings...</span>
        </div>
      </div>
    );
  }

  // No readings state
  if (!hasAnyReadings()) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Edit Readings
            </h1>
            <p className="text-gray-600 text-center mb-8">
              No readings found for this date.
            </p>
            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Edit Readings
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Editing readings for {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {successMessage}
            </div>
          )}

          {/* Date Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-20"
                style={{ WebkitAppearance: 'none' }}
              />
              <div
                className="absolute inset-0 cursor-pointer sm:block hidden"
                onClick={() => dateInputRef.current?.showPicker?.()}
                style={{ zIndex: 10 }}
              />
            </div>
            {newDate !== originalDate && (
              <p className="mt-2 text-sm text-blue-600">
                Date will be changed from {originalDate} to {newDate}
              </p>
            )}
          </div>

          {/* Accordion Sections */}
          <div className="space-y-0">
            {/* Electricity Section */}
            {countReadings('electricity') > 0 && (
              <AccordionSection
                title="Electricity"
                icon="⚡"
                isOpen={openSection === 'electricity'}
                onToggle={() => toggleSection('electricity')}
                badge={countReadings('electricity')}
              >
                <ElectricityMeterForm
                  meters={readings?.electricity.map(r => ({ name: r.meter_name, meter_id: r.meter_id })) || []}
                  onChange={() => {}} // Not used in edit mode
                  useCustomMeterIds={false}
                  mode="edit"
                  editData={Object.fromEntries(
                    Object.entries(editReadings.electricity).map(([id, data]) => [
                      id,
                      { value: data.value, comment: data.comment, isReset: readings?.electricity.find(r => r.meter_id === id)?.is_reset || false }
                    ])
                  )}
                  onEditChange={(meterId, field, value) => {
                    if (field === 'value') {
                      updateReadingValue('electricity', meterId, value);
                    } else {
                      updateComment('electricity', meterId, value);
                    }
                  }}
                />
              </AccordionSection>
            )}

            {/* Water Section */}
            {countReadings('water') > 0 && (
              <AccordionSection
                title="Water"
                icon="💧"
                isOpen={openSection === 'water'}
                onToggle={() => toggleSection('water')}
                badge={countReadings('water')}
              >
                <WaterMeterForm
                  meters={readings?.water.map(r => ({ room: r.room, meter_id: r.meter_id, is_warm_water: r.is_warm_water })) || []}
                  onChange={() => {}} // Not used in edit mode
                  useCustomMeterIds={false}
                  mode="edit"
                  editData={Object.fromEntries(
                    Object.entries(editReadings.water).map(([id, data]) => [
                      id,
                      { value: data.value, comment: data.comment, isReset: readings?.water.find(r => r.meter_id === id)?.is_reset || false }
                    ])
                  )}
                  onEditChange={(meterId, field, value) => {
                    if (field === 'value') {
                      updateReadingValue('water', meterId, value);
                    } else {
                      updateComment('water', meterId, value);
                    }
                  }}
                />
              </AccordionSection>
            )}

            {/* Gas Section */}
            {countReadings('gas') > 0 && (
              <AccordionSection
                title="Gas"
                icon="🔥"
                isOpen={openSection === 'gas'}
                onToggle={() => toggleSection('gas')}
                badge={countReadings('gas')}
              >
                <GasMeterForm
                  meters={readings?.gas.map(r => ({ room: r.room, meter_id: r.meter_id })) || []}
                  onChange={() => {}} // Not used in edit mode
                  useCustomMeterIds={false}
                  mode="edit"
                  editData={Object.fromEntries(
                    Object.entries(editReadings.gas).map(([id, data]) => [
                      id,
                      { value: data.value, comment: data.comment, isReset: readings?.gas.find(r => r.meter_id === id)?.is_reset || false }
                    ])
                  )}
                  onEditChange={(meterId, field, value) => {
                    if (field === 'value') {
                      updateReadingValue('gas', meterId, value);
                    } else {
                      updateComment('gas', meterId, value);
                    }
                  }}
                />
              </AccordionSection>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* Counter - Full width on mobile, inline on desktop */}
            <div className="text-center sm:text-right mb-4 sm:mb-0 sm:hidden">
              <span className="text-sm text-gray-500">
                {countReadings('electricity') + countReadings('water') + countReadings('gas')} reading(s)
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (period) {
                    navigate(`/?period=${period}`);
                  } else {
                    navigate('/');
                  }
                }}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 hidden sm:inline">
                  {countReadings('electricity') + countReadings('water') + countReadings('gas')} reading(s)
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

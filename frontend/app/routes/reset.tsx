/**
 * Reset Meter Route
 * 
 * Form for creating meter reset entries when a meter is replaced.
 * Uses accordion layout matching Setup and Add Reading routes.
 * 
 * Flow:
 * 1. Date selection (when the meter was replaced)
 * 2. Accordion sections for Electricity, Water, and Gas
 * 3. For each reset: enter last reading and reset value
 * 4. Save creates two entries per reset: (last reading, reset value)
 * 
 * Features:
 * - Accordion pattern (only one section open at a time)
 * - Reset value defaults to 0 but can be changed
 * - Badge shows count of resets configured per section
 * - Only submitted meters are processed
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AccordionSection } from '../components/AccordionSection';
import { ElectricityMeterForm } from '../components/ElectricityMeterForm';
import { WaterMeterForm } from '../components/WaterMeterForm';
import { GasMeterForm } from '../components/GasMeterForm';
import { getConfig, saveResets, type AppConfig, type MeterResetsInput } from '../lib/api';

type OpenSection = 'electricity' | 'water' | 'gas' | null;

// Reset data structure - meter_id -> { last_reading, reset_value }
type ResetData = {
  last_reading: string;
  reset_value: string;
};

export default function ResetMeter() {
  const navigate = useNavigate();
  
  // Config loaded from backend
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Accordion state - only one section open at a time
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  
  // Date for all resets
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Resets state - meter_id -> reset data
  const [resets, setResets] = useState<{
    electricity: Record<string, ResetData>;
    water: Record<string, ResetData>;
    gas: Record<string, ResetData>;
  }>({
    electricity: {},
    water: {},
    gas: {}
  });

  // Load config on mount
  useEffect(() => {
    getConfig().then(cfg => {
      if (!cfg) {
        navigate('/setup');
        return;
      }
      setConfig(cfg);
      setLoading(false);
    });
  }, [navigate]);

  // Toggle accordion section
  function toggleSection(section: OpenSection) {
    setOpenSection(openSection === section ? null : section);
  }

  // Update reset data for a specific meter
  function updateReset(
    type: 'electricity' | 'water' | 'gas', 
    meterId: string, 
    field: 'last_reading' | 'reset_value',
    value: string
  ) {
    setResets(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [meterId]: {
          ...prev[type][meterId],
          [field]: value
        }
      }
    }));
  }

  // Count resets with last_reading entered for a type
  function countResets(type: 'electricity' | 'water' | 'gas'): number {
    return Object.values(resets[type]).filter(r => r.last_reading?.trim() !== '').length;
  }

  // Check if at least one reset has been configured
  function hasAnyReset(): boolean {
    return countResets('electricity') > 0 || 
           countResets('water') > 0 || 
           countResets('gas') > 0;
  }

  // Submit all resets
  async function handleSave() {
    if (!hasAnyReset()) {
      setError('Please configure at least one meter reset before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const resetInput: MeterResetsInput = {
        date,
        electricity: [],
        water: [],
        gas: []
      };

      // Collect electricity resets
      Object.entries(resets.electricity).forEach(([meterId, data]) => {
        if (data.last_reading?.trim()) {
          const meter = config?.electricity.meters.find(m => m.meter_id === meterId);
          if (meter) {
            resetInput.electricity.push({
              meter_id: meterId,
              meter_name: meter.name,
              last_reading: parseFloat(data.last_reading),
              reset_value: data.reset_value?.trim() ? parseFloat(data.reset_value) : 0
            });
          }
        }
      });

      // Collect water resets
      Object.entries(resets.water).forEach(([meterId, data]) => {
        if (data.last_reading?.trim()) {
          const meter = config?.water.meters.find(m => m.meter_id === meterId);
          if (meter) {
            resetInput.water.push({
              meter_id: meterId,
              room: meter.room,
              is_warm_water: meter.is_warm_water,
              last_reading: parseFloat(data.last_reading),
              reset_value: data.reset_value?.trim() ? parseFloat(data.reset_value) : 0
            });
          }
        }
      });

      // Collect gas resets
      Object.entries(resets.gas).forEach(([meterId, data]) => {
        if (data.last_reading?.trim()) {
          const meter = config?.gas.meters.find(m => m.meter_id === meterId);
          if (meter) {
            resetInput.gas.push({
              meter_id: meterId,
              room: meter.room,
              last_reading: parseFloat(data.last_reading),
              reset_value: data.reset_value?.trim() ? parseFloat(data.reset_value) : 0
            });
          }
        }
      });

      await saveResets(resetInput);
      setSuccessMessage('Resets saved successfully');
      
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resets');
      setSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Reset Meters
          </h1>
          <p className="text-gray-600 text-center mb-2">
            Record meter replacements and reset values.
          </p>
          <p className="text-sm text-gray-500 text-center mb-8">
            For each replaced meter, enter the last reading from the old meter and the starting value of the new meter.
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
              Replacement Date
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-20"
                style={{ WebkitAppearance: 'none' }}
              />
              <div
                className="absolute inset-0 cursor-pointer sm:block hidden"
                onClick={() => dateInputRef.current?.showPicker?.()}
                style={{ zIndex: 10 }}
              />
            </div>
          </div>

          {/* Accordion Sections */}
          <div className="space-y-0">
            {/* Electricity Section */}
            <AccordionSection
              title="Electricity"
              icon="⚡"
              isOpen={openSection === 'electricity'}
              onToggle={() => toggleSection('electricity')}
              badge={countResets('electricity')}
            >
              <ElectricityMeterForm
                meters={config?.electricity.meters || []}
                onChange={() => {}}
                useCustomMeterIds={false}
                mode="reset"
                resets={resets.electricity}
                onResetChange={(meterId, field, value) => updateReset('electricity', meterId, field, value)}
              />
            </AccordionSection>

            {/* Water Section */}
            <AccordionSection
              title="Water"
              icon="💧"
              isOpen={openSection === 'water'}
              onToggle={() => toggleSection('water')}
              badge={countResets('water')}
            >
              <WaterMeterForm
                meters={config?.water.meters || []}
                onChange={() => {}}
                useCustomMeterIds={false}
                mode="reset"
                resets={resets.water}
                onResetChange={(meterId, field, value) => updateReset('water', meterId, field, value)}
              />
            </AccordionSection>

            {/* Gas Section */}
            <AccordionSection
              title="Gas"
              icon="🔥"
              isOpen={openSection === 'gas'}
              onToggle={() => toggleSection('gas')}
              badge={countResets('gas')}
            >
              <GasMeterForm
                meters={config?.gas.meters || []}
                onChange={() => {}}
                useCustomMeterIds={false}
                mode="reset"
                resets={resets.gas}
                onResetChange={(meterId, field, value) => updateReset('gas', meterId, field, value)}
              />
            </AccordionSection>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* Counter - Full width on mobile, inline on desktop */}
            <div className="text-center sm:text-right mb-4 sm:mb-0 sm:hidden">
              <span className="text-sm text-gray-500">
                {countResets('electricity') + countResets('water') + countResets('gas')} reset(s) configured
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 hidden sm:inline">
                  {countResets('electricity') + countResets('water') + countResets('gas')} reset(s) configured
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="py-2 px-6 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Resets'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

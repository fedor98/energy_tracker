/**
 * Add Reading Route
 * 
 * Entry form for adding new utility readings using an accordion layout.
 * Matches the design of the Setup route for consistency.
 * 
 * Flow:
 * 1. Date selection (fixed card at top)
 * 2. Accordion sections for Electricity, Water, and Gas
 * 3. Save all readings at once via bulk API
 * 
 * Features:
 * - Accordion pattern (only one section open at a time)
 * - Reuses Setup components in 'reading' mode
 * - Validates that at least one reading is entered
 * - Shows count badge for meters with values entered
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AccordionSection } from '../components/AccordionSection';
import { ElectricityMeterForm } from '../components/ElectricityMeterForm';
import { WaterMeterForm } from '../components/WaterMeterForm';
import { GasMeterForm } from '../components/GasMeterForm';
import { getConfig, saveReadings, type AppConfig, type ReadingInput } from '../lib/api';

type OpenSection = 'electricity' | 'water' | 'gas' | null;

export default function AddReading() {
  const navigate = useNavigate();
  
  // Config loaded from backend
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Accordion state - only one section open at a time
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  
  // Date for all readings
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Readings state - meter_id -> value (as string for input handling)
  const [readings, setReadings] = useState<{
    electricity: Record<string, string>;
    water: Record<string, string>;
    gas: Record<string, string>;
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

  // Update reading for a specific meter
  function updateReading(type: 'electricity' | 'water' | 'gas', meterId: string, value: string) {
    setReadings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [meterId]: value
      }
    }));
  }

  // Count readings with values entered for a type
  function countReadings(type: 'electricity' | 'water' | 'gas'): number {
    return Object.values(readings[type]).filter(v => v.trim() !== '').length;
  }

  // Check if at least one reading has been entered
  function hasAnyReading(): boolean {
    return countReadings('electricity') > 0 || 
           countReadings('water') > 0 || 
           countReadings('gas') > 0;
  }

  // Submit all readings
  async function handleSave() {
    if (!hasAnyReading()) {
      setError('Please enter at least one reading before saving.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const period = date.slice(0, 7); // YYYY-MM
      const readingInputs: ReadingInput[] = [];

      // Collect electricity readings
      Object.entries(readings.electricity).forEach(([meterId, value]) => {
        if (value.trim()) {
          const meter = config?.electricity.meters.find(m => m.meter_id === meterId);
          if (meter) {
            readingInputs.push({
              period,
              date,
              type: 'electricity',
              meter: meter.name,
              meter_id: meterId,
              value: parseFloat(value)
            });
          }
        }
      });

      // Collect water readings
      Object.entries(readings.water).forEach(([meterId, value]) => {
        if (value.trim()) {
          const meter = config?.water.meters.find(m => m.meter_id === meterId);
          if (meter) {
            readingInputs.push({
              period,
              date,
              type: 'water',
              meter: meter.room,
              meter_id: meterId,
              channel: meter.is_warm_water ? 'warm' : 'cold',
              value: parseFloat(value)
            });
          }
        }
      });

      // Collect gas readings
      Object.entries(readings.gas).forEach(([meterId, value]) => {
        if (value.trim()) {
          const meter = config?.gas.meters.find(m => m.meter_id === meterId);
          if (meter) {
            readingInputs.push({
              period,
              date,
              type: 'gas',
              meter: meter.room,
              meter_id: meterId,
              value: parseFloat(value)
            });
          }
        }
      });

      await saveReadings(readingInputs);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save readings');
      setSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Add Readings
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Enter your meter readings below.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Date Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Measurement Date
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
              badge={countReadings('electricity')}
            >
              <ElectricityMeterForm
                meters={config?.electricity.meters || []}
                onChange={() => {}} // Not used in reading mode
                useCustomMeterIds={false}
                mode="reading"
                readings={readings.electricity}
                onReadingChange={(meterId, value) => updateReading('electricity', meterId, value)}
              />
            </AccordionSection>

            {/* Water Section */}
            <AccordionSection
              title="Water"
              icon="💧"
              isOpen={openSection === 'water'}
              onToggle={() => toggleSection('water')}
              badge={countReadings('water')}
            >
              <WaterMeterForm
                meters={config?.water.meters || []}
                onChange={() => {}} // Not used in reading mode
                useCustomMeterIds={false}
                mode="reading"
                readings={readings.water}
                onReadingChange={(meterId, value) => updateReading('water', meterId, value)}
              />
            </AccordionSection>

            {/* Gas Section */}
            <AccordionSection
              title="Gas"
              icon="🔥"
              isOpen={openSection === 'gas'}
              onToggle={() => toggleSection('gas')}
              badge={countReadings('gas')}
            >
              <GasMeterForm
                meters={config?.gas.meters || []}
                onChange={() => {}} // Not used in reading mode
                useCustomMeterIds={false}
                mode="reading"
                readings={readings.gas}
                onReadingChange={(meterId, value) => updateReading('gas', meterId, value)}
              />
            </AccordionSection>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {countReadings('electricity') + countReadings('water') + countReadings('gas')} reading(s) entered
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Readings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Add Reading Route
 * 
 * Entry form for adding new utility readings using an accordion layout.
 * Uses page-layout components for consistent design with Reset and Edit routes.
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AccordionSection } from '../components/AccordionSection';
import { ElectricityMeterForm } from '../components/ElectricityMeterForm';
import { WaterMeterForm } from '../components/WaterMeterForm';
import { GasMeterForm } from '../components/GasMeterForm';
import { PageLayout, DateSection, FormFooter } from '../components/accordion-page-layout';
import { getConfig, createElectricityReading, createWaterReading, createGasReading, type AppConfig, type ElectricityReadingInput, type WaterReadingInput, type GasReadingInput } from '../lib/api';
import { ElectricityIcon, WaterIcon, GasIcon } from '../components/icons/MeterIcons';

type OpenSection = 'electricity' | 'water' | 'gas' | null;

export default function AddReading() {
  const navigate = useNavigate();
  
  // Config loaded from backend
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Accordion state - only one section open at a time
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  
  // Date for all readings
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  
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
    setSuccessMessage(null);

    try {
      // Save electricity readings
      const electricityPromises: Promise<unknown>[] = [];
      Object.entries(readings.electricity).forEach(([meterId, value]) => {
        if (value.trim()) {
          const meter = config?.electricity.meters.find(m => m.meter_id === meterId);
          if (meter) {
            const reading: ElectricityReadingInput = {
              date,
              meter_name: meter.name,
              meter_id: meterId,
              value: parseFloat(value)
            };
            electricityPromises.push(createElectricityReading(reading));
          }
        }
      });

      // Save water readings
      const waterPromises: Promise<unknown>[] = [];
      Object.entries(readings.water).forEach(([meterId, value]) => {
        if (value.trim()) {
          const meter = config?.water.meters.find(m => m.meter_id === meterId);
          if (meter) {
            const reading: WaterReadingInput = {
              date,
              room: meter.room,
              meter_id: meterId,
              value: parseFloat(value),
              is_warm_water: meter.is_warm_water
            };
            waterPromises.push(createWaterReading(reading));
          }
        }
      });

      // Save gas readings
      const gasPromises: Promise<unknown>[] = [];
      Object.entries(readings.gas).forEach(([meterId, value]) => {
        if (value.trim()) {
          const meter = config?.gas.meters.find(m => m.meter_id === meterId);
          if (meter) {
            const reading: GasReadingInput = {
              date,
              room: meter.room,
              meter_id: meterId,
              value: parseFloat(value)
            };
            gasPromises.push(createGasReading(reading));
          }
        }
      });

      // Execute all saves in parallel
      await Promise.all([...electricityPromises, ...waterPromises, ...gasPromises]);
      
      setSuccessMessage('Readings saved successfully');
      
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save readings');
      setSaving(false);
    }
  }

  return (
    <PageLayout
      title="Add Readings"
      description="Enter your meter readings below."
      loading={loading}
      loadingText="Loading..."
      error={error}
      success={successMessage}
    >
      <DateSection
        label="Measurement Date"
        value={date}
        onChange={setDate}
      />

      {/* Accordion Sections */}
      <div className="space-y-0">
        {/* Electricity Section */}
        <AccordionSection
          title="Electricity"
          icon={<ElectricityIcon className="w-5 h-5" />}
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
          icon={<WaterIcon className="w-5 h-5" />}
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
          icon={<GasIcon className="w-5 h-5" />}
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

      <FormFooter
        onCancel={() => navigate('/')}
        onSave={handleSave}
        saveLabel="Save Readings"
        counter={countReadings('electricity') + countReadings('water') + countReadings('gas')}
        counterLabel="reading(s) entered"
        saving={saving}
      />
    </PageLayout>
  );
}

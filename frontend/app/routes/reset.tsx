/**
 * Reset Meter Route
 * 
 * Form for creating meter reset entries when a meter is replaced.
 * Uses accordion layout and page-layout components for consistency.
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AccordionSection } from '../components/AccordionSection';
import { ElectricityMeterForm } from '../components/ElectricityMeterForm';
import { WaterMeterForm } from '../components/WaterMeterForm';
import { GasMeterForm } from '../components/GasMeterForm';
import { PageLayout, DateSection, FormFooter } from '../components/accordion-page-layout';
import { getConfig, saveResets, type AppConfig, type MeterResetsInput } from '../lib/api';
import { ElectricityIcon, WaterIcon, GasIcon } from '../components/icons/MeterIcons';

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

  return (
    <PageLayout
      title="Reset Meters"
      description="Record meter replacements and reset values."
      loading={loading}
      loadingText="Loading..."
      error={error}
      success={successMessage}
    >
      <DateSection
        label="Replacement Date"
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
          icon={<WaterIcon className="w-5 h-5" />}
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
          icon={<GasIcon className="w-5 h-5" />}
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

      <FormFooter
        onCancel={() => navigate('/')}
        onSave={handleSave}
        saveLabel="Save Resets"
        counter={countResets('electricity') + countResets('water') + countResets('gas')}
        counterLabel="reset(s) configured"
        saving={saving}
      />
    </PageLayout>
  );
}

/**
 * Setup Route
 * 
 * The initial setup wizard for configuring energy meters.
 * Uses an accordion pattern where only one section (Electricity/Water/Gas)
 * can be expanded at a time. Collects all meter configurations and saves
 * them to the backend via the initConfig API.
 * 
 * Flow:
 * 1. Check if config exists - redirect to dashboard if yes
 * 2. Intro with option to use custom meter IDs
 * 3. Accordion sections for Electricity, Water, and Gas
 * 4. Save configuration and redirect to dashboard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AccordionSection } from '../components/AccordionSection';
import { ElectricityMeterForm } from '../components/ElectricityMeterForm';
import { WaterMeterForm } from '../components/WaterMeterForm';
import { GasMeterForm } from '../components/GasMeterForm';
import { Toggle } from '../components/Toggle';
import { initConfig, getConfig, type AppConfig } from '../lib/api';
import { ElectricityIcon, WaterIcon, GasIcon } from '../components/icons/MeterIcons';

// Track which accordion section is currently open
type OpenSection = 'electricity' | 'water' | 'gas' | null;

export default function Setup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Intro step state
  const [showIntro, setShowIntro] = useState(true);
  const [useCustomMeterIds, setUseCustomMeterIds] = useState(false);
  
  // Accordion state - only one section open at a time
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  
  // Meter configuration state
  const [config, setConfig] = useState<AppConfig>({
    electricity: { meters: [] },
    water: { meters: [] },
    gas: { meters: [] }
  });

  /**
   * Check if app is already configured on mount - redirect to dashboard if yes
   */
  useEffect(() => {
    async function checkExistingConfig() {
      try {
        const existingConfig = await getConfig();
        // If config exists, redirect to dashboard
        if (existingConfig) {
          navigate('/', { replace: true });
          return;
        }
      } catch (err) {
        // If we can't check config, allow setup to proceed (fail open)
        console.error('Failed to check config:', err);
      } finally {
        setCheckingConfig(false);
      }
    }

    checkExistingConfig();
  }, [navigate]);

  // Toggle accordion section - closes others when opening one
  function toggleSection(section: OpenSection) {
    setOpenSection(openSection === section ? null : section);
  }

  // Update electricity meters
  function updateElectricityMeters(meters: AppConfig['electricity']['meters']) {
    setConfig(prev => ({ ...prev, electricity: { meters } }));
  }

  // Update water meters
  function updateWaterMeters(meters: AppConfig['water']['meters']) {
    setConfig(prev => ({ ...prev, water: { meters } }));
  }

  // Update gas meters
  function updateGasMeters(meters: AppConfig['gas']['meters']) {
    setConfig(prev => ({ ...prev, gas: { meters } }));
  }

  // Save configuration to backend
  async function handleSave() {
    // Validation: At least one meter must be configured
    const totalMeters = 
      config.electricity.meters.length + 
      config.water.meters.length + 
      config.gas.meters.length;
    
    if (totalMeters === 0) {
      setError('Please configure at least one meter before continuing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await initConfig(config);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate total configured meters
  const totalMeters = 
    config.electricity.meters.length + 
    config.water.meters.length + 
    config.gas.meters.length;

  // Show loading screen while checking if config exists
  if (checkingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Intro screen
  if (showIntro) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Welcome to Energy Tracker
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Let's set up your energy tracking system. We'll configure your meters
              for electricity, water, and gas.
            </p>

            {/* Custom Meter IDs Toggle */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-gray-800">
                  Use custom meter numbers
                </span>
                <Toggle
                  checked={useCustomMeterIds}
                  onChange={() => setUseCustomMeterIds(!useCustomMeterIds)}
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {useCustomMeterIds
                  ? 'You can enter custom meter numbers for each device.'
                  : 'Automatic IDs will be generated for each meter.'}
              </p>
              
              {/* Preview of auto-generated ID */}
              {!useCustomMeterIds && (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={'E-' + Math.random().toString(36).substring(2, 8).toUpperCase()}
                    disabled
                    className="bg-gray-200 text-gray-500 px-3 py-1 rounded font-mono text-sm w-28 text-center"
                  />
                  <span className="text-xs text-gray-500">Example auto-generated ID</span>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={() => setShowIntro(false)}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main setup wizard with accordion
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Setup Your Meters
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Configure your electricity, water, and gas meters below.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Accordion Sections */}
          <div className="space-y-0">
            {/* Electricity Section */}
            <AccordionSection
              title="Electricity"
              icon={<ElectricityIcon className="w-5 h-5" />}
              isOpen={openSection === 'electricity'}
              onToggle={() => toggleSection('electricity')}
              badge={config.electricity.meters.length}
            >
              <ElectricityMeterForm
                meters={config.electricity.meters}
                onChange={updateElectricityMeters}
                useCustomMeterIds={useCustomMeterIds}
              />
            </AccordionSection>

            {/* Water Section */}
            <AccordionSection
              title="Water"
              icon={<WaterIcon className="w-5 h-5" />}
              isOpen={openSection === 'water'}
              onToggle={() => toggleSection('water')}
              badge={config.water.meters.length}
            >
              <WaterMeterForm
                meters={config.water.meters}
                onChange={updateWaterMeters}
                useCustomMeterIds={useCustomMeterIds}
              />
            </AccordionSection>

            {/* Gas Section */}
            <AccordionSection
              title="Gas"
              icon={<GasIcon className="w-5 h-5" />}
              isOpen={openSection === 'gas'}
              onToggle={() => toggleSection('gas')}
              badge={config.gas.meters.length}
            >
              <GasMeterForm
                meters={config.gas.meters}
                onChange={updateGasMeters}
                useCustomMeterIds={useCustomMeterIds}
              />
            </AccordionSection>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* Counter - Full width on mobile, inline on desktop */}
            <div className="text-center sm:text-right mb-4 sm:mb-0 sm:hidden">
              <span className="text-sm text-gray-500">
                {totalMeters} meter{totalMeters !== 1 ? 's' : ''} configured
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowIntro(true)}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 hidden sm:inline">
                  {totalMeters} meter{totalMeters !== 1 ? 's' : ''} configured
                </span>
                <button
                  onClick={handleSave}
                  disabled={isLoading || totalMeters === 0}
                  className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Finish Setup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

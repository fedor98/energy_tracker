/**
 * Dashboard Route - Main entry point of the Energy Tracker application
 * 
 * Displays energy consumption data across different utility types with:
 * - Date range filtering (start/end month)
 * - 5 tabs: Consumption (chart), Calc (calculation tables), Electricity, Water, Gas (data tables)
 * - Responsive layout optimized for mobile and desktop
 * - Skeleton loading states and error handling
 * 
 * Data fetching is triggered when filter dates change. Each tab displays
 * its data independently, with the Calc tab requiring separate API calls
 * for calculation details.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, RotateCcw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  getElectricityReadings,
  getWaterReadings,
  getGasReadings,
  getElectricityCalculations,
  getWaterCalculations,
  getGasCalculations,
  getConfig,
} from '../lib/api';
import type {
  ElectricityReading,
  WaterReading,
  GasReading,
  CalculationData,
} from '../lib/api';
import { ConsumptionChart } from '../components/ConsumptionChart';
import { CalculationTables } from '../components/CalculationTables';
import { MeterDataTable } from '../components/MeterDataTable';

// Tab configuration for the dashboard - matches original layout
const DASHBOARD_TABS = [
  { id: 'consumption', label: 'Consumption 📈', position: 'left' },
  { id: 'calc', label: 'Calc 🔢', position: 'left' },
  { id: 'electricity', label: 'Electricity ⚡️', position: 'right' },
  { id: 'water', label: 'Water 💧', position: 'right' },
  { id: 'gas', label: 'Gas 💨', position: 'right' },
];

// Skeleton component for loading states
function FilterSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

/**
 * DashboardTabs Component
 * Custom tabs implementation with specific layout requirements:
 * - Desktop: Consumption + Calc on left, others pushed to right
 * - Mobile: Two rows (Consumption/Calc | Electricity/Water/Gas)
 */
interface DashboardTabsProps {
  activeTab: string;
  onChange: (tabId: string) => void;
}

function DashboardTabs({ activeTab, onChange }: DashboardTabsProps) {
  const leftTabs = DASHBOARD_TABS.filter((t) => t.position === 'left');
  const rightTabs = DASHBOARD_TABS.filter((t) => t.position === 'right');

  // Common button classes for consistent sizing
  const buttonBaseClasses =
    'px-4 py-2 font-medium transition-colors rounded-lg text-sm sm:text-base';

  return (
    <div className="flex flex-col gap-2 pb-4">
      {/* Mobile: Two rows layout */}
      <div className="flex sm:hidden flex-col gap-2">
        {/* Row 1: Consumption & Calc */}
        <div className="flex gap-2">
          {leftTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`${buttonBaseClasses} flex-1 border ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 border-b-0 -mb-[1px] z-10'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 2: Electricity, Water, Gas */}
        <div className="flex gap-2">
          {rightTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`${buttonBaseClasses} flex-1 border ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 border-b-0 -mb-[1px] z-10'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {tab.label.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Single row with left/right alignment */}
      <div className="hidden sm:flex flex-row gap-2">
        {/* Left group */}
        <div className="flex gap-2">
          {leftTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`${buttonBaseClasses} border ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 border-b-0 -mb-[1px] z-10'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Spacer pushes right group to end */}
        <div className="flex-1"></div>

        {/* Right group */}
        <div className="flex gap-2">
          {rightTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`${buttonBaseClasses} border ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 border-b-0 -mb-[1px] z-10'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Filter state for date range selection
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');

  // Refs for date picker interactions
  const startMonthRef = useRef<HTMLInputElement>(null);
  const endMonthRef = useRef<HTMLInputElement>(null);

  // Navigation state for active tab
  const [activeTab, setActiveTab] = useState<string>('consumption');

  // Cumulated water toggle - only affects consumption chart
  const [cumulatedWater, setCumulatedWater] = useState<boolean>(true);

  // Data states for meter readings
  const [electricityData, setElectricityData] = useState<ElectricityReading[]>([]);
  const [waterData, setWaterData] = useState<WaterReading[]>([]);
  const [gasData, setGasData] = useState<GasReading[]>([]);

  // Data states for calculations (loaded separately for Calc tab)
  const [elecCalcData, setElecCalcData] = useState<CalculationData>({ periods: [] });
  const [waterCalcData, setWaterCalcData] = useState<CalculationData>({ periods: [] });
  const [gasCalcData, setGasCalcData] = useState<CalculationData>({ periods: [] });

  // Loading and error states
  const [loadingReadings, setLoadingReadings] = useState<boolean>(false);
  const [loadingCalculations, setLoadingCalculations] = useState<boolean>(false);
  const [checkingConfig, setCheckingConfig] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if app is configured on mount - redirect to setup if not
   */
  useEffect(() => {
    async function checkConfig() {
      try {
        const config = await getConfig();
        // If no config exists, redirect to setup
        if (!config) {
          navigate('/setup', { replace: true });
          return;
        }
      } catch (err) {
        // If we can't check config, still show dashboard (fail open)
        console.error('Failed to check config:', err);
      } finally {
        setCheckingConfig(false);
      }
    }

    checkConfig();
  }, [navigate]);

  /**
   * Initialize default date range on mount (last 12 months)
   */
  useEffect(() => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 7); // YYYY-MM format
    const start = new Date(now.setFullYear(now.getFullYear() - 1));
    const startStr = start.toISOString().slice(0, 7);

    setStartMonth(startStr);
    setEndMonth(endStr);
  }, []);

  /**
   * Fetch meter readings when date filters change
   */
  useEffect(() => {
    if (!startMonth || !endMonth) return;

    async function fetchReadings() {
      setLoadingReadings(true);
      setError(null);

      try {
        const [elecData, waterDataResult, gasDataResult] = await Promise.all([
          getElectricityReadings({ start: startMonth, end: endMonth }),
          getWaterReadings({ start: startMonth, end: endMonth }),
          getGasReadings({ start: startMonth, end: endMonth }),
        ]);

        setElectricityData(elecData);
        setWaterData(waterDataResult);
        setGasData(gasDataResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoadingReadings(false);
      }
    }

    fetchReadings();
  }, [startMonth, endMonth]);

  /**
   * Fetch calculation data only when Calc tab becomes active
   * This avoids unnecessary API calls for unused tabs
   */
  useEffect(() => {
    if (activeTab !== 'calc') return;

    async function fetchCalculations() {
      setLoadingCalculations(true);
      setError(null);

      try {
        const [elecCalc, waterCalc, gasCalc] = await Promise.all([
          getElectricityCalculations(),
          getWaterCalculations(),
          getGasCalculations(),
        ]);

        setElecCalcData(elecCalc);
        setWaterCalcData(waterCalc);
        setGasCalcData(gasCalc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch calculations');
      } finally {
        setLoadingCalculations(false);
      }
    }

    fetchCalculations();
  }, [activeTab]);

  /**
   * Reset filters to default (last 12 months)
   */
  const handleResetFilters = () => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 7);
    const start = new Date(now.setFullYear(now.getFullYear() - 1));
    const startStr = start.toISOString().slice(0, 7);

    setStartMonth(startStr);
    setEndMonth(endStr);
  };

  /**
   * Render the appropriate content based on active tab
   */
  const renderTabContent = () => {
    // Show skeleton while loading
    if (activeTab === 'calc' && loadingCalculations) {
      return <ContentSkeleton />;
    }

    if (activeTab !== 'calc' && loadingReadings) {
      return <ContentSkeleton />;
    }

    // Render content based on active tab
    switch (activeTab) {
      case 'consumption':
        return (
          <ConsumptionChart
            electricityData={electricityData}
            waterData={waterData}
            gasData={gasData}
            cumulatedWater={cumulatedWater}
          />
        );

      case 'calc':
        return (
          <CalculationTables
            electricityData={elecCalcData}
            waterData={waterCalcData}
            gasData={gasCalcData}
          />
        );

      case 'electricity':
        return <MeterDataTable data={electricityData} type="electricity" />;

      case 'water':
        return <MeterDataTable data={waterData} type="water" />;

      case 'gas':
        return <MeterDataTable data={gasData} type="gas" />;

      default:
        return null;
    }
  };

  // Show loading screen while checking config
  if (checkingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container min-h-screen bg-gray-50">
      {/* Page Header */}
      <header className="bg-white px-4 sm:px-6 lg:px-8 py-4 shadow-sm mb-6">
        <h1 className="text-xl font-bold text-indigo-600 tracking-tight">
          Energy Tracker
        </h1>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-8">
        {/* Filter Section */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            {/* Start Month Input */}
            <div className="w-full sm:flex-1 min-w-0">
              <label
                htmlFor="start-month"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Month
              </label>
              <div className="relative">
                <input
                  type="month"
                  id="start-month"
                  ref={startMonthRef}
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
                  style={{ WebkitAppearance: 'none' }}
                />
                <div
                  className="absolute inset-0 cursor-pointer sm:block hidden"
                  onClick={() => startMonthRef.current?.showPicker?.()}
                  style={{ zIndex: 10 }}
                />
              </div>
            </div>

            {/* End Month Input */}
            <div className="w-full sm:flex-1 min-w-0">
              <label
                htmlFor="end-month"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                End Month
              </label>
              <div className="relative">
                <input
                  type="month"
                  id="end-month"
                  ref={endMonthRef}
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
                  style={{ WebkitAppearance: 'none' }}
                />
                <div
                  className="absolute inset-0 cursor-pointer sm:block hidden"
                  onClick={() => endMonthRef.current?.showPicker?.()}
                  style={{ zIndex: 10 }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                onClick={() => {}}
                variant="primary"
                className="flex-1 sm:flex-none whitespace-nowrap"
              >
                Apply
              </Button>
              <Button
                onClick={handleResetFilters}
                variant="secondary"
                className="flex-1 sm:flex-none whitespace-nowrap"
              >
                Last 12 Months
              </Button>
            </div>
          </div>
        </Card>

        {/* Action Buttons - directly on gray background */}
        <div className="flex justify-end gap-3 mt-4 mb-6">
          <button
            onClick={() => navigate('/add')}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium text-sm rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Reading
          </button>
          <button
            onClick={() => navigate('/reset')}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium text-sm rounded-full transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Meter
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">Error loading data: {error}</p>
          </div>
        )}

        {/* Main Content Area */}
        <Card>
          {/* Tab Navigation */}
          <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

          {/* Cumulated Water Checkbox - Only in Consumption tab */}
          {activeTab === 'consumption' && (
            <div className="mb-4 inline-flex items-center gap-2">
              <input
                type="checkbox"
                id="cumulated-water"
                checked={cumulatedWater}
                onChange={(e) => setCumulatedWater(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor="cumulated-water"
                className="text-sm text-gray-700 cursor-pointer select-none whitespace-nowrap"
              >
                Cumulated Water
              </label>
            </div>
          )}

          {/* Tab Content */}
          <div className="dashboard-content border-t border-gray-300 pt-6 overflow-x-auto">
            {renderTabContent()}
          </div>
        </Card>
      </main>
    </div>
  );
}

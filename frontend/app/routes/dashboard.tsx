/**
 * Dashboard Route - Main entry point of the Energy Tracker application
 * 
 * This component serves as the primary dashboard displaying energy consumption data
 * across different utility types (Electricity, Water, Gas). It features:
 * - Date range filtering (start/end month)
 * - Tab-based navigation between consumption chart and detailed tables
 * - Responsive layout optimized for both mobile and desktop
 * - Skeleton loading states while fetching data
 * - Cumulated water toggle for consumption view
 * 
 * The dashboard fetches data from the backend API and manages the active tab state
 * and filter parameters using React hooks.
 */

import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getElectricityReadings, getWaterReadings, getGasReadings } from '../lib/api';
import type { ElectricityReading, WaterReading, GasReading } from '../lib/api';

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
 * Custom tabs implementation to match the original layout:
 * - Desktop: Consumption + Calc on left, Electricity/Water/Gas pushed to right
 * - Mobile: Row 1 (Consumption + Calc), Row 2 (Electricity + Water + Gas)
 * - Active tab connects visually with content area below
 * - Consistent height and styling across all tabs
 */
interface DashboardTabsProps {
  activeTab: string;
  onChange: (tabId: string) => void;
}

function DashboardTabs({ activeTab, onChange }: DashboardTabsProps) {
  const leftTabs = DASHBOARD_TABS.filter(t => t.position === 'left');
  const rightTabs = DASHBOARD_TABS.filter(t => t.position === 'right');
  
  // Common button classes for consistent sizing and rounded corners
  const buttonBaseClasses = "px-4 py-2 font-medium transition-colors rounded-lg text-sm sm:text-base";
  
  return (
    <div className="flex flex-col gap-2 pb-4">
      {/* Mobile: Two rows layout */}
      <div className="flex sm:hidden flex-col gap-2">
        {/* Row 1: Consumption & Calc - full width, equal size */}
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
        
        {/* Row 2: Electricity, Water, Gas - equal width, icon only on mobile */}
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
        {/* Left group: Consumption & Calc */}
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
        
        {/* Right group: Electricity, Water, Gas */}
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
  // Filter state - manages the date range selection
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  
  // Refs for programmatically opening date pickers
  const startMonthRef = useRef<HTMLInputElement>(null);
  const endMonthRef = useRef<HTMLInputElement>(null);
  
  // Navigation state - tracks which tab is currently active
  const [activeTab, setActiveTab] = useState<string>('consumption');
  
  // Cumulated water toggle state - only affects consumption view
  const [cumulatedWater, setCumulatedWater] = useState<boolean>(true);
  
  // Data state - stores fetched readings and loading/error states
  const [electricityData, setElectricityData] = useState<ElectricityReading[]>([]);
  const [waterData, setWaterData] = useState<WaterReading[]>([]);
  const [gasData, setGasData] = useState<GasReading[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize default date range on component mount
   * Sets the filter to the last 12 months by default
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
   * Fetch data whenever the date filters change
   * Uses Promise.all to fetch all three reading types in parallel
   */
  useEffect(() => {
    if (!startMonth || !endMonth) return;
    
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all reading types concurrently for better performance
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
        setLoading(false);
      }
    }
    
    fetchData();
  }, [startMonth, endMonth]);

  /**
   * Reset filters to the last 12 months
   * Called when user clicks "Last 12 Months" button
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
   * Format month value for display in input
   * Ensures the value is in YYYY-MM format for proper display
   */
  const formatMonthValue = (value: string): string => {
    if (!value) return '';
    // Ensure value is in YYYY-MM format
    if (value.length === 7 && value.includes('-')) {
      return value;
    }
    return value;
  };

  return (
    <div className="dashboard-container min-h-screen bg-gray-50">
      {/* Page Header - Matches original styling with Indigo color */}
      <header className="bg-white px-4 sm:px-6 lg:px-8 py-4 shadow-sm mb-6">
        <h1 className="text-xl font-bold text-indigo-600 tracking-tight">
          Energy Tracker
        </h1>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-8">
        {/* Filter Section - Responsive layout: stacked on mobile, inline on desktop */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            {/* Start Month Input - min-w-0 prevents overflow on iOS Safari */}
            <div className="w-full sm:flex-1 min-w-0">
              <label htmlFor="start-month" className="block text-sm font-medium text-gray-700 mb-1">
                Start Month
              </label>
              <div className="relative">
                <input
                  type="month"
                  id="start-month"
                  ref={startMonthRef}
                  value={formatMonthValue(startMonth)}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
                  style={{ WebkitAppearance: 'none' }}
                />
                {/* Invisible overlay to capture clicks on the entire input area */}
                <div 
                  className="absolute inset-0 cursor-pointer sm:block hidden"
                  onClick={() => startMonthRef.current?.showPicker?.()}
                  style={{ zIndex: 10 }}
                />
              </div>
            </div>
            
            {/* End Month Input - min-w-0 prevents overflow on iOS Safari */}
            <div className="w-full sm:flex-1 min-w-0">
              <label htmlFor="end-month" className="block text-sm font-medium text-gray-700 mb-1">
                End Month
              </label>
              <div className="relative">
                <input
                  type="month"
                  id="end-month"
                  ref={endMonthRef}
                  value={formatMonthValue(endMonth)}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
                  style={{ WebkitAppearance: 'none' }}
                />
                {/* Invisible overlay to capture clicks on the entire input area */}
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

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">Error loading data: {error}</p>
          </div>
        )}

        {/* Main Content Area */}
        <Card>
          {/* Tab Navigation with custom layout */}
          <DashboardTabs 
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          
          {/* Cumulated Water Checkbox - Only show in Consumption tab */}
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
          
          {/* Tab Content Container - border-top connects with tabs */}
          <div className="dashboard-content border-t border-gray-300 pt-6 overflow-x-auto">
            {loading ? (
              <ContentSkeleton />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">Tab content coming in the next step</p>
                <p className="text-sm">Active tab: {activeTab}</p>
                <p className="text-xs mt-4 text-gray-400">
                  Data loaded: {electricityData.length} electricity, {waterData.length} water, {gasData.length} gas readings
                </p>
                {activeTab === 'consumption' && (
                  <p className="text-xs mt-2 text-gray-400">
                    Cumulated water: {cumulatedWater ? 'On' : 'Off'}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

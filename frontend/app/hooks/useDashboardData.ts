/**
 * useDashboardData Hook - Manages all dashboard data fetching and state
 * 
 * This custom hook centralizes:
 * - Date range filtering state (start/end month)
 * - Meter readings data (electricity, water, gas)
 * - Calculation data for charts and tables
 * - Loading and error states
 * - Dashboard transform settings (scale/offset)
 * - Delete confirmation dialog state
 * 
 * Handles all API interactions and provides a clean interface for the Dashboard component.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getElectricityReadings,
  getWaterReadings,
  getGasReadings,
  getElectricityCalculations,
  getWaterCalculations,
  getGasCalculations,
  getConfig,
  deleteReadingsByDate,
  getDashboardTransform,
  saveDashboardTransform,
} from '../lib/api';
import type {
  ElectricityReading,
  WaterReading,
  GasReading,
  CalculationData,
  DashboardTransform,
} from '../lib/api';

/**
 * State interface for dashboard data management
 * Organized by functional areas for clarity
 */
interface DashboardState {
  // Filter state - date range selection
  startMonth: string;
  endMonth: string;
  
  // Raw meter readings data for data tables
  electricityData: ElectricityReading[];
  waterData: WaterReading[];
  gasData: GasReading[];
  elecCalcData: CalculationData;
  waterCalcData: CalculationData;
  gasCalcData: CalculationData;
  
  // Loading states for different data fetching operations
  loadingReadings: boolean;
  loadingCalculations: boolean;
  checkingConfig: boolean;
  
  // Error state
  error: string | null;
  successMessage: string | null;
  
  // UI state
  deleteDialogOpen: boolean;
  dateToDelete: string | null;
  
  // Transform settings
  transform: DashboardTransform;
}

const defaultCalculationData: CalculationData = { periods: [] };

const defaultTransform: DashboardTransform = {
  electricity_scale: 1.0,
  electricity_offset: 0.0,
  gas_scale: 1.0,
  gas_offset: 0.0,
  water_scale: 1.0,
  water_offset: 0.0,
};

export function useDashboardData(navigate: (path: string, options?: { replace?: boolean; state?: Record<string, unknown> }) => void) {
  // Filter state
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');

  // Data states
  const [electricityData, setElectricityData] = useState<ElectricityReading[]>([]);
  const [waterData, setWaterData] = useState<WaterReading[]>([]);
  const [gasData, setGasData] = useState<GasReading[]>([]);
  
  const [elecCalcData, setElecCalcData] = useState<CalculationData>(defaultCalculationData);
  const [waterCalcData, setWaterCalcData] = useState<CalculationData>(defaultCalculationData);
  const [gasCalcData, setGasCalcData] = useState<CalculationData>(defaultCalculationData);

  // Loading states
  const [loadingReadings, setLoadingReadings] = useState<boolean>(false);
  const [loadingCalculations, setLoadingCalculations] = useState<boolean>(false);
  const [checkingConfig, setCheckingConfig] = useState<boolean>(true);

  // Error and success states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  // Transform settings
  const [transform, setTransform] = useState<DashboardTransform>(defaultTransform);

  /**
   * Check if app is configured on mount
   * Redirects to setup page if no configuration exists
   */
  useEffect(() => {
    async function checkConfig() {
      try {
        const config = await getConfig();
        if (!config) {
          navigate('/setup', { replace: true });
          return;
        }
      } catch (err) {
        console.error('Failed to check config:', err);
      } finally {
        setCheckingConfig(false);
      }
    }

    checkConfig();
  }, [navigate]);

  /**
   * Load dashboard transform settings (scale/offset) on mount
   * Used for adjusting visualization of consumption data
   */
  useEffect(() => {
    async function loadTransform() {
      try {
        const savedTransform = await getDashboardTransform();
        setTransform(savedTransform);
      } catch (err) {
        console.error('Failed to load dashboard transform:', err);
      }
    }

    loadTransform();
  }, []);

  /**
   * Initialize default date range on mount (last 12 months)
   * Sets both start and end month to create a default view
   */
  useEffect(() => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 7);
    const start = new Date(now.setFullYear(now.getFullYear() - 1));
    const startStr = start.toISOString().slice(0, 7);

    setStartMonth(startStr);
    setEndMonth(endStr);
  }, []);

  /**
   * Fetch meter readings and calculation data when date filters change
   * Fetches both raw readings (for tables) and calculations (for charts)
   * Uses Promise.all for parallel API calls to improve performance
   */
  useEffect(() => {
    if (!startMonth || !endMonth) return;

    async function fetchData() {
      setLoadingReadings(true);
      setError(null);

      try {
        // Fetch raw readings for data tables
        const [elecData, waterDataResult, gasDataResult] = await Promise.all([
          getElectricityReadings({ start: startMonth, end: endMonth }),
          getWaterReadings({ start: startMonth, end: endMonth }),
          getGasReadings({ start: startMonth, end: endMonth }),
        ]);

        setElectricityData(elecData);
        setWaterData(waterDataResult);
        setGasData(gasDataResult);

        // Fetch calculations for the chart (includes consumption with reset handling)
        const [elecCalc, waterCalc, gasCalc] = await Promise.all([
          getElectricityCalculations({ start: startMonth, end: endMonth }),
          getWaterCalculations({ start: startMonth, end: endMonth }),
          getGasCalculations({ start: startMonth, end: endMonth }),
        ]);

        setElecCalcData(elecCalc);
        setWaterCalcData(waterCalc);
        setGasCalcData(gasCalc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoadingReadings(false);
      }
    }

    fetchData();
  }, [startMonth, endMonth]);

  /**
   * Reset filters to default (last 12 months)
   * Used by the "Last 12 Months" button in the UI
   */
  const handleResetFilters = useCallback(() => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 7);
    const start = new Date(now.setFullYear(now.getFullYear() - 1));
    const startStr = start.toISOString().slice(0, 7);

    setStartMonth(startStr);
    setEndMonth(endStr);
  }, []);

  /**
   * Handle confirmed delete action
   * Deletes readings for the selected date and refreshes the data
   * Shows success message and auto-hides it after 3 seconds
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!dateToDelete) return;

    try {
      await deleteReadingsByDate(dateToDelete);
      setSuccessMessage('Readings deleted successfully');
      setDeleteDialogOpen(false);
      setDateToDelete(null);

      // Refresh all meter data after deletion
      const [elecData, waterDataResult, gasDataResult] = await Promise.all([
        getElectricityReadings({ start: startMonth, end: endMonth }),
        getWaterReadings({ start: startMonth, end: endMonth }),
        getGasReadings({ start: startMonth, end: endMonth }),
      ]);

      setElectricityData(elecData);
      setWaterData(waterDataResult);
      setGasData(gasDataResult);

      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete readings');
      setDeleteDialogOpen(false);
    }
  }, [dateToDelete, startMonth, endMonth]);

  /**
   * Handle cancel delete action
   * Closes the confirmation dialog without deleting
   */
  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDateToDelete(null);
  }, []);

  /**
   * Handle scale factor changes for visualization
   * Updates the transform state and persists to backend
   * Validates that value is a positive number
   */
  const handleTransformChange = useCallback(async (
    type: 'electricity_scale' | 'gas_scale' | 'water_scale',
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    const newTransform = { ...transform, [type]: numValue };
    setTransform(newTransform);

    try {
      await saveDashboardTransform(newTransform);
    } catch (err) {
      console.error('Failed to save transform:', err);
    }
  }, [transform]);

  /**
   * Handle offset changes for visualization
   * Updates the transform state and persists to backend
   * Used to shift consumption values up or down for better comparison
   */
  const handleOffsetChange = useCallback(async (
    type: 'electricity_offset' | 'gas_offset' | 'water_offset',
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newTransform = { ...transform, [type]: numValue };
    setTransform(newTransform);

    try {
      await saveDashboardTransform(newTransform);
    } catch (err) {
      console.error('Failed to save offset:', err);
    }
  }, [transform]);

  return {
    // State
    startMonth,
    endMonth,
    electricityData,
    waterData,
    gasData,
    elecCalcData,
    waterCalcData,
    gasCalcData,
    loadingReadings,
    loadingCalculations,
    checkingConfig,
    error,
    successMessage,
    deleteDialogOpen,
    dateToDelete,
    transform,
    
    // Setters
    setStartMonth,
    setEndMonth,
    setDeleteDialogOpen,
    setDateToDelete,
    setError,
    
    // Actions
    handleResetFilters,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleTransformChange,
    handleOffsetChange,
  };
}

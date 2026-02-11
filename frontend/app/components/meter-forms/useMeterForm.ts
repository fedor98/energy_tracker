/**
 * useMeterForm Hook
 * 
 * Custom hook for managing meter form state and logic.
 * Provides reusable state management across all meter types.
 */

import { useState, useCallback } from 'react';
import type { MeterConfig, MeterTypeConfig, ResetData } from './types';
import { generateMeterId } from './types';

interface UseMeterFormProps<T extends MeterConfig> {
  meters: T[];
  onChange: (meters: T[]) => void;
  config: MeterTypeConfig;
  useCustomMeterIds: boolean;
}

interface UseMeterFormReturn<T extends MeterConfig> {
  // Setup mode state
  displayName: string;
  setDisplayName: (value: string) => void;
  meterId: string;
  setMeterId: (value: string) => void;
  isWarmWater: boolean;
  setIsWarmWater: (value: boolean) => void;
  
  // Actions
  addMeter: () => void;
  removeMeter: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useMeterForm<T extends MeterConfig>({
  config,
  useCustomMeterIds,
}: UseMeterFormProps<T>): UseMeterFormReturn<T> {
  const [displayName, setDisplayName] = useState('');
  const [meterId, setMeterId] = useState('');
  const [isWarmWater, setIsWarmWater] = useState(false);

  const addMeter = useCallback(() => {
    if (!displayName.trim()) return;

    // Note: This is a placeholder - the actual implementation
    // is in SetupModeRenderer which has access to the meters array
    // This hook is kept for future extensibility
  }, [displayName]);

  const removeMeter = useCallback((index: number) => {
    // Placeholder - actual implementation in SetupModeRenderer
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMeter();
    }
  }, [addMeter]);

  return {
    displayName,
    setDisplayName,
    meterId,
    setMeterId,
    isWarmWater,
    setIsWarmWater,
    addMeter,
    removeMeter,
    handleKeyDown,
  };
}

/**
 * Hook for managing reading form state
 */
interface UseReadingFormProps {
  readings: Record<string, string>;
  onReadingChange?: (meterId: string, value: string) => void;
}

interface UseReadingFormReturn {
  getReading: (meterId: string) => string;
  setReading: (meterId: string, value: string) => void;
}

export function useReadingForm({
  readings = {},
  onReadingChange,
}: UseReadingFormProps): UseReadingFormReturn {
  const getReading = useCallback((meterId: string) => {
    return readings[meterId] || '';
  }, [readings]);

  const setReading = useCallback((meterId: string, value: string) => {
    onReadingChange?.(meterId, value);
  }, [onReadingChange]);

  return { getReading, setReading };
}

/**
 * Hook for managing reset form state
 */
interface UseResetFormProps {
  resets: Record<string, ResetData>;
  onResetChange?: (meterId: string, field: 'last_reading' | 'reset_value', value: string) => void;
}

interface UseResetFormReturn {
  getResetValue: (meterId: string, field: 'last_reading' | 'reset_value') => string;
  setResetValue: (meterId: string, field: 'last_reading' | 'reset_value', value: string) => void;
}

export function useResetForm({
  resets = {},
  onResetChange,
}: UseResetFormProps): UseResetFormReturn {
  const getResetValue = useCallback((meterId: string, field: 'last_reading' | 'reset_value') => {
    return resets[meterId]?.[field] || '';
  }, [resets]);

  const setResetValue = useCallback((meterId: string, field: 'last_reading' | 'reset_value', value: string) => {
    onResetChange?.(meterId, field, value);
  }, [onResetChange]);

  return { getResetValue, setResetValue };
}

/**
 * Generic Meter Form Types
 * 
 * Shared types and configuration for all meter forms (Gas, Water, Electricity).
 * This enables DRY implementation across different meter types.
 */

import type { GasMeterConfig, WaterMeterConfig, ElectricityMeterConfig } from '../../lib/api';

// Base meter config that all meter types share
export interface BaseMeterConfig {
  meter_id: string;
}

// Union type for all meter configs
export type MeterConfig = GasMeterConfig | WaterMeterConfig | ElectricityMeterConfig;

// Meter type identifiers
export type MeterType = 'gas' | 'water' | 'electricity';

// Form modes
export type FormMode = 'setup' | 'reading' | 'reset' | 'edit';

// Reset data structure
export interface ResetData {
  last_reading: string;
  reset_value: string;
}

// Edit data structure for edit mode
export interface EditData {
  value: string;
  comment: string;
  isReset: boolean;
}

// Configuration for each meter type
export interface MeterTypeConfig {
  type: MeterType;
  label: string;
  unit: string;
  step: string;
  meterIdPrefix: string;
  displayNameField: 'room' | 'name'; // Gas/Water use 'room', Electricity uses 'name'
  placeholderText: string;
  emptyStateMessage: string;
  hasWaterTypeToggle?: boolean;
}

// Type-specific configurations
export const METER_TYPE_CONFIGS: Record<MeterType, MeterTypeConfig> = {
  gas: {
    type: 'gas',
    label: 'Gas',
    unit: 'm³',
    step: '0.01',
    meterIdPrefix: 'G',
    displayNameField: 'room',
    placeholderText: 'Room Name (e.g., Living Room, Kitchen)',
    emptyStateMessage: 'No gas meters configured',
  },
  water: {
    type: 'water',
    label: 'Water',
    unit: 'm³',
    step: '0.001',
    meterIdPrefix: 'W',
    displayNameField: 'room',
    placeholderText: 'Room Name (e.g., Bathroom, Kitchen)',
    emptyStateMessage: 'No water meters configured',
    hasWaterTypeToggle: true,
  },
  electricity: {
    type: 'electricity',
    label: 'Electricity',
    unit: 'kWh',
    step: '0.01',
    meterIdPrefix: 'E',
    displayNameField: 'name',
    placeholderText: 'Meter Name (e.g., Main Meter, Solar)',
    emptyStateMessage: 'No electricity meters configured',
  },
};

// Generic props for meter forms
export interface GenericMeterFormProps<T extends MeterConfig> {
  meters: T[];
  onChange?: (meters: T[]) => void;
  useCustomMeterIds?: boolean;
  mode?: FormMode;
  readings?: Record<string, string>;
  onReadingChange?: (meterId: string, value: string) => void;
  resets?: Record<string, ResetData>;
  onResetChange?: (meterId: string, field: 'last_reading' | 'reset_value', value: string) => void;
  editData?: Record<string, EditData>;
  onEditChange?: (meterId: string, field: 'value' | 'comment', value: string) => void;
}

// Props for mode renderers
export interface ModeRendererProps<T extends MeterConfig> {
  meters: T[];
  config: MeterTypeConfig;
  readings?: Record<string, string>;
  onReadingChange?: (meterId: string, value: string) => void;
  resets?: Record<string, ResetData>;
  onResetChange?: (meterId: string, field: 'last_reading' | 'reset_value', value: string) => void;
  editData?: Record<string, EditData>;
  onEditChange?: (meterId: string, field: 'value' | 'comment', value: string) => void;
}

// Props for setup mode
export interface SetupModeProps<T extends MeterConfig> {
  meters: T[];
  onChange: (meters: T[]) => void;
  config: MeterTypeConfig;
  useCustomMeterIds: boolean;
}

// Helper to get display name from a meter config
export function getMeterDisplayName<T extends MeterConfig>(
  meter: T, 
  config: MeterTypeConfig
): string {
  if (config.displayNameField === 'room') {
    return (meter as GasMeterConfig | WaterMeterConfig).room;
  }
  return (meter as ElectricityMeterConfig).name;
}

// Helper to generate a unique meter ID
export function generateMeterId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Type guards
export function isWaterMeterConfig(meter: MeterConfig): meter is WaterMeterConfig {
  return 'is_warm_water' in meter;
}

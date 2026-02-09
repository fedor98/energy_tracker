/**
 * ElectricityMeterForm Component (Refactored)
 *
 * Uses the generic meter form architecture for consistency
 * and maintainability across all meter types.
 */

import React from 'react';
import { GenericMeterForm, METER_TYPE_CONFIGS } from './meter-forms';
import type { ElectricityMeterConfig } from '../lib/api';
import type { ResetData } from './meter-forms';

interface ElectricityMeterFormProps {
  meters: ElectricityMeterConfig[];
  onChange: (meters: ElectricityMeterConfig[]) => void;
  useCustomMeterIds: boolean;
  mode?: 'setup' | 'reading' | 'reset';
  readings?: Record<string, string>;
  onReadingChange?: (meterId: string, value: string) => void;
  resets?: Record<string, ResetData>;
  onResetChange?: (meterId: string, field: 'last_reading' | 'reset_value', value: string) => void;
}

export function ElectricityMeterForm({
  meters,
  onChange,
  useCustomMeterIds,
  mode = 'setup',
  readings,
  onReadingChange,
  resets,
  onResetChange,
}: ElectricityMeterFormProps) {
  return (
    <GenericMeterForm
      meters={meters}
      onChange={onChange}
      useCustomMeterIds={useCustomMeterIds}
      mode={mode}
      readings={readings}
      onReadingChange={onReadingChange}
      resets={resets}
      onResetChange={onResetChange}
      config={METER_TYPE_CONFIGS.electricity}
    />
  );
}

export default ElectricityMeterForm;

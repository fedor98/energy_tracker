/**
 * GasMeterForm Component (Refactored)
 *
 * Uses the generic meter form architecture for consistency
 * and maintainability across all meter types.
 */

import React from 'react';
import { GenericMeterForm, METER_TYPE_CONFIGS } from './meter-forms';
import type { GasMeterConfig } from '../lib/api';
import type { ResetData, EditData } from './meter-forms';

interface GasMeterFormProps {
  meters: GasMeterConfig[];
  onChange: (meters: GasMeterConfig[]) => void;
  useCustomMeterIds: boolean;
  mode?: 'setup' | 'reading' | 'reset' | 'edit';
  readings?: Record<string, string>;
  onReadingChange?: (meterId: string, value: string) => void;
  resets?: Record<string, ResetData>;
  onResetChange?: (meterId: string, field: 'last_reading' | 'reset_value', value: string) => void;
  editData?: Record<string, EditData>;
  onEditChange?: (meterId: string, field: 'value' | 'comment', value: string) => void;
}

export function GasMeterForm({
  meters,
  onChange,
  useCustomMeterIds,
  mode = 'setup',
  readings,
  onReadingChange,
  resets,
  onResetChange,
  editData,
  onEditChange,
}: GasMeterFormProps) {
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
      editData={editData}
      onEditChange={onEditChange}
      config={METER_TYPE_CONFIGS.gas}
    />
  );
}

export default GasMeterForm;

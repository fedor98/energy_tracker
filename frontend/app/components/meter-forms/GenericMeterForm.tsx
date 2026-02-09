/**
 * GenericMeterForm Component
 * 
 * A reusable, type-safe meter form component that works with any meter type
 * (Gas, Water, Electricity) and supports three modes: setup, reading, and reset.
 * 
 * This component follows the Strategy Pattern for rendering different modes,
 * eliminating code duplication across meter form implementations.
 */

import React from 'react';
import { SetupModeRenderer } from './SetupModeRenderer';
import { ReadingModeRenderer } from './ReadingModeRenderer';
import { ResetModeRenderer } from './ResetModeRenderer';
import type { MeterConfig, GenericMeterFormProps, MeterTypeConfig, FormMode } from './types';

// Mode renderer registry using Strategy Pattern
const modeRenderers: Record<
  FormMode,
  React.FC<any>
> = {
  setup: SetupModeRenderer,
  reading: ReadingModeRenderer,
  reset: ResetModeRenderer,
};

interface GenericMeterFormComponentProps<T extends MeterConfig> extends GenericMeterFormProps<T> {
  config: MeterTypeConfig;
}

export function GenericMeterForm<T extends MeterConfig>({
  meters,
  onChange,
  useCustomMeterIds,
  mode = 'setup',
  readings,
  onReadingChange,
  resets,
  onResetChange,
  config,
}: GenericMeterFormComponentProps<T>) {
  // Select the appropriate renderer based on mode
  const ModeRenderer = modeRenderers[mode];

  // Render the appropriate mode
  if (mode === 'setup') {
    return (
      <SetupModeRenderer
        meters={meters}
        onChange={onChange}
        config={config}
        useCustomMeterIds={useCustomMeterIds}
      />
    );
  }

  if (mode === 'reading') {
    return (
      <ReadingModeRenderer
        meters={meters}
        config={config}
        readings={readings}
        onReadingChange={onReadingChange}
      />
    );
  }

  if (mode === 'reset') {
    return (
      <ResetModeRenderer
        meters={meters}
        config={config}
        resets={resets}
        onResetChange={onResetChange}
      />
    );
  }

  // Fallback (should never reach here)
  return null;
}

export default GenericMeterForm;

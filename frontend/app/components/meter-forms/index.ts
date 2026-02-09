/**
 * Meter Forms - Barrel Export
 * 
 * Central export point for all meter form components.
 * Use this to import meter form related functionality:
 * 
 * import { GenericMeterForm, METER_TYPE_CONFIGS } from './meter-forms';
 */

export { GenericMeterForm } from './GenericMeterForm';
export { SetupModeRenderer } from './SetupModeRenderer';
export { ReadingModeRenderer } from './ReadingModeRenderer';
export { ResetModeRenderer } from './ResetModeRenderer';
export { useMeterForm, useReadingForm, useResetForm } from './useMeterForm';
export {
  METER_TYPE_CONFIGS,
  generateMeterId,
  getMeterDisplayName,
  isWaterMeterConfig,
} from './types';
export type {
  BaseMeterConfig,
  MeterConfig,
  MeterType,
  FormMode,
  ResetData,
  MeterTypeConfig,
  GenericMeterFormProps,
  ModeRendererProps,
  SetupModeProps,
} from './types';

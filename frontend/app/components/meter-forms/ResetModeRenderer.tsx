/**
 * Reset Mode Renderer
 * 
 * Displays input fields for meter resets (2 fields per meter: last_reading, reset_value).
 * Used across all meter types (Gas, Water, Electricity).
 */

import React from 'react';
import type { MeterConfig, ModeRendererProps } from './types';
import { getMeterDisplayName, isWaterMeterConfig } from './types';
import { WarmWaterIndicator, ColdWaterIndicator } from '../icons/MeterIcons';

export function ResetModeRenderer<T extends MeterConfig>({
  meters,
  config,
  resets = {},
  onResetChange,
}: ModeRendererProps<T>) {
  const renderMeterLabel = (meter: T) => {
    const displayName = getMeterDisplayName(meter, config);
    
    if (isWaterMeterConfig(meter)) {
      return (
        <span className="flex items-center gap-2">
          {displayName}
          {meter.is_warm_water ? <WarmWaterIndicator /> : <ColdWaterIndicator />}
          <span className="text-gray-500 font-normal">({config.unit})</span>
        </span>
      );
    }
    
    return (
      <>
        {displayName} <span className="text-gray-500 font-normal">({config.unit})</span>
      </>
    );
  };

  return (
    <div className="space-y-4">
      {meters.length > 0 ? (
        meters.map((meter) => (
          <div key={meter.meter_id} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">
                {renderMeterLabel(meter)}
              </span>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                {meter.meter_id}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Last Reading ({config.unit})
                </label>
                <input
                  type="number"
                  step={config.step}
                  min="0"
                  placeholder="e.g. 1500"
                  value={resets[meter.meter_id]?.last_reading || ''}
                  onChange={(e) => onResetChange?.(meter.meter_id, 'last_reading', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Reset Value ({config.unit})
                </label>
                <input
                  type="number"
                  step={config.step}
                  min="0"
                  placeholder="0"
                  value={resets[meter.meter_id]?.reset_value || ''}
                  onChange={(e) => onResetChange?.(meter.meter_id, 'reset_value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          {config.emptyStateMessage}. Configure meters in Settings.
        </p>
      )}
    </div>
  );
}

/**
 * Reading Mode Renderer
 * 
 * Displays input fields for entering readings from configured meters.
 * Used across all meter types (Gas, Water, Electricity).
 */

import React from 'react';
import type { MeterConfig, ModeRendererProps, MeterTypeConfig } from './types';
import { getMeterDisplayName, isWaterMeterConfig } from './types';
import { WarmWaterIndicator, ColdWaterIndicator } from '../icons/MeterIcons';

export function ReadingModeRenderer<T extends MeterConfig>({
  meters,
  config,
  readings = {},
  onReadingChange,
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
            <input
              type="number"
              step={config.step}
              value={readings[meter.meter_id] || ''}
              onChange={(e) => onReadingChange?.(meter.meter_id, e.target.value)}
              placeholder="Enter reading"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

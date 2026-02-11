/**
 * Setup Mode Renderer
 * 
 * Displays the setup interface for adding/removing meters.
 * Used across all meter types (Gas, Water, Electricity).
 */

import React, { useState } from 'react';
import { Toggle } from '../Toggle';
import type { MeterConfig, SetupModeProps, MeterTypeConfig } from './types';
import { generateMeterId, getMeterDisplayName, isWaterMeterConfig } from './types';
import type { GasMeterConfig, WaterMeterConfig, ElectricityMeterConfig } from '../../lib/api';
import { WarmWaterLabel, ColdWaterLabel } from '../icons/MeterIcons';

export function SetupModeRenderer<T extends MeterConfig>({
  meters,
  onChange,
  config,
  useCustomMeterIds,
}: SetupModeProps<T>) {
  const [displayName, setDisplayName] = useState('');
  const [meterId, setMeterId] = useState('');
  const [isWarmWater, setIsWarmWater] = useState(false);

  const handleAddMeter = () => {
    if (!displayName.trim()) return;

    let newMeter: T;

    if (config.type === 'water') {
      newMeter = {
        room: displayName.trim(),
        is_warm_water: isWarmWater,
        meter_id: useCustomMeterIds && meterId.trim() ? meterId.trim() : generateMeterId(config.meterIdPrefix),
      } as T;
    } else if (config.type === 'electricity') {
      newMeter = {
        name: displayName.trim(),
        meter_id: useCustomMeterIds && meterId.trim() ? meterId.trim() : generateMeterId(config.meterIdPrefix),
      } as T;
    } else {
      // Gas
      newMeter = {
        room: displayName.trim(),
        meter_id: useCustomMeterIds && meterId.trim() ? meterId.trim() : generateMeterId(config.meterIdPrefix),
      } as T;
    }

    onChange([...meters, newMeter]);
    setDisplayName('');
    setMeterId('');
    // Keep warm/cold setting for convenience when adding multiple water meters
  };

  const handleRemoveMeter = (index: number) => {
    onChange(meters.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMeter();
    }
  };

  const renderMeterListItem = (meter: T, index: number) => {
    const displayName = getMeterDisplayName(meter, config);
    
    return (
      <div
        key={index}
        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
      >
        <div className="flex flex-col">
          <span className="font-medium text-gray-800">
            {displayName}
            {isWaterMeterConfig(meter) && (
              <span className="ml-2">
                {meter.is_warm_water ? <WarmWaterLabel /> : <ColdWaterLabel />}
              </span>
            )}
          </span>
          {meter.meter_id && (
            <span className="text-xs text-gray-500 font-mono">ID: {meter.meter_id}</span>
          )}
        </div>
        <button
          onClick={() => handleRemoveMeter(index)}
          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Meter</h4>
        
        <div className="space-y-3">
          {/* Water Type Toggle - only for water meters */}
          {config.hasWaterTypeToggle && (
            <Toggle
              checked={isWarmWater}
              onChange={() => setIsWarmWater(!isWarmWater)}
              variant="water"
            />
          )}

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholderText}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {useCustomMeterIds && (
            <input
              type="text"
              value={meterId}
              onChange={(e) => setMeterId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Meter ID (optional, auto-generated if empty)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          
          <button
            onClick={handleAddMeter}
            disabled={!displayName.trim()}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            + Add Meter
          </button>
        </div>
      </div>

      {/* List of Configured Meters */}
      {meters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Configured Meters</h4>
          {meters.map((meter, index) => renderMeterListItem(meter, index))}
        </div>
      )}

      {/* Empty State */}
      {meters.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          {config.emptyStateMessage} yet. Add at least one meter to continue.
        </p>
      )}
    </div>
  );
}

/**
 * WaterSetup Component
 * 
 * Configures water meters for the setup wizard.
 * Allows adding meters per room with a warm/cold water toggle.
 * Each room can have both warm and cold water meters.
 */

import React, { useState } from 'react';
import { Toggle } from './Toggle';
import type { WaterMeterConfig } from '../lib/api';

interface WaterSetupProps {
  meters: WaterMeterConfig[];
  onChange: (meters: WaterMeterConfig[]) => void;
  useCustomMeterIds: boolean;
}

export function WaterSetup({ meters, onChange, useCustomMeterIds }: WaterSetupProps) {
  const [room, setRoom] = useState('');
  const [isWarmWater, setIsWarmWater] = useState(false);
  const [meterId, setMeterId] = useState('');

  // Generate a unique meter ID
  function generateMeterId(): string {
    return 'W-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Add a new water meter
  function addMeter() {
    if (!room.trim()) return;
    
    const newMeter: WaterMeterConfig = {
      room: room.trim(),
      is_warm_water: isWarmWater,
      meter_id: useCustomMeterIds && meterId.trim() ? meterId.trim() : generateMeterId()
    };
    
    onChange([...meters, newMeter]);
    setRoom('');
    setMeterId('');
    // Keep warm/cold setting for convenience when adding multiple meters
  }

  // Remove a meter by index
  function removeMeter(index: number) {
    onChange(meters.filter((_, i) => i !== index));
  }

  // Handle Enter key press
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMeter();
    }
  }

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Meter</h4>
        
        <div className="space-y-3">
          {/* Warm/Cold Water Toggle */}
          <Toggle
            checked={isWarmWater}
            onChange={() => setIsWarmWater(!isWarmWater)}
            variant="water"
          />

          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Room Name (e.g., Bathroom, Kitchen)"
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
            onClick={addMeter}
            disabled={!room.trim()}
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
          {meters.map((meter, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
            >
              <div className="flex flex-col">
                <span className="font-medium text-gray-800">
                  {meter.room}{' '}
                  <span className={`text-xs ${meter.is_warm_water ? 'text-red-500' : 'text-blue-500'}`}>
                    {meter.is_warm_water ? '🔴 Warm' : '🔵 Cold'}
                  </span>
                </span>
                {meter.meter_id && (
                  <span className="text-xs text-gray-500 font-mono">ID: {meter.meter_id}</span>
                )}
              </div>
              <button
                onClick={() => removeMeter(index)}
                className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {meters.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No water meters configured yet. Add at least one meter to continue.
        </p>
      )}
    </div>
  );
}

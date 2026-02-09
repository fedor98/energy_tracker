/**
 * GasSetup Component
 * 
 * Configures gas meters for the setup wizard.
 * Allows adding meters per room. This is the base layout pattern
 * also used for Water and Electricity setup for consistency.
 */

import React, { useState } from 'react';
import type { GasMeterConfig } from '../lib/api';

interface GasSetupProps {
  meters: GasMeterConfig[];
  onChange: (meters: GasMeterConfig[]) => void;
  useCustomMeterIds: boolean;
}

export function GasSetup({ meters, onChange, useCustomMeterIds }: GasSetupProps) {
  const [room, setRoom] = useState('');
  const [meterId, setMeterId] = useState('');

  // Generate a unique meter ID
  function generateMeterId(): string {
    return 'G-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Add a new gas meter
  function addMeter() {
    if (!room.trim()) return;
    
    const newMeter: GasMeterConfig = {
      room: room.trim(),
      meter_id: useCustomMeterIds && meterId.trim() ? meterId.trim() : generateMeterId()
    };
    
    onChange([...meters, newMeter]);
    setRoom('');
    setMeterId('');
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
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Room Name (e.g., Living Room, Kitchen)"
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
                <span className="font-medium text-gray-800">{meter.room}</span>
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
          No gas meters configured yet. Add at least one meter to continue.
        </p>
      )}
    </div>
  );
}

/**
 * ElectricityMeterForm Component
 * 
 * Dual-mode component for both setup and reading entry.
 * 
 * Setup Mode (mode='setup'):
 * - Configures electricity meters for the setup wizard
 * - Allows adding/removing multiple meters with custom names and meter IDs
 * 
 * Reading Mode (mode='reading'):
 * - Displays input fields for entering readings from configured meters
 * - Shows meter name and allows entering kWh values
 * 
 * Uses the same layout pattern as Gas and Water forms for consistency.
 */

import React, { useState } from 'react';
import type { ElectricityMeterConfig } from '../lib/api';

interface ResetData {
  last_reading: string;
  reset_value: string;
}

interface ElectricityMeterFormProps {
  meters: ElectricityMeterConfig[];
  onChange: (meters: ElectricityMeterConfig[]) => void;
  useCustomMeterIds: boolean;
  mode?: 'setup' | 'reading' | 'reset';
  readings?: Record<string, string>; // meter_id -> value
  onReadingChange?: (meterId: string, value: string) => void;
  resets?: Record<string, ResetData>; // meter_id -> { last_reading, reset_value }
  onResetChange?: (meterId: string, field: 'last_reading' | 'reset_value', value: string) => void;
}

export function ElectricityMeterForm({
  meters,
  onChange,
  useCustomMeterIds,
  mode = 'setup',
  readings = {},
  onReadingChange,
  resets = {},
  onResetChange
}: ElectricityMeterFormProps) {
  const [name, setName] = useState('');
  const [meterId, setMeterId] = useState('');

  // Generate a unique meter ID
  function generateMeterId(): string {
    return 'E-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Add a new electricity meter (setup mode only)
  function addMeter() {
    if (!name.trim()) return;
    
    const newMeter: ElectricityMeterConfig = {
      name: name.trim(),
      meter_id: useCustomMeterIds && meterId.trim() ? meterId.trim() : generateMeterId()
    };
    
    onChange([...meters, newMeter]);
    setName('');
    setMeterId('');
  }

  // Remove a meter by index (setup mode only)
  function removeMeter(index: number) {
    onChange(meters.filter((_, i) => i !== index));
  }

  // Handle Enter key press (setup mode only)
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMeter();
    }
  }

  // Reset Mode: Display input fields for meter resets (2 fields per meter)
  if (mode === 'reset') {
    return (
      <div className="space-y-4">
        {meters.length > 0 ? (
          meters.map((meter) => (
            <div key={meter.meter_id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">
                  {meter.name} <span className="text-gray-500 font-normal">(kWh)</span>
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {meter.meter_id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Last Reading (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 1500"
                    value={resets[meter.meter_id]?.last_reading || ''}
                    onChange={(e) => onResetChange?.(meter.meter_id, 'last_reading', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Reset Value (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
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
            No electricity meters configured. Configure meters in Settings.
          </p>
        )}
      </div>
    );
  }

  // Reading Mode: Display input fields for existing meters
  if (mode === 'reading') {
    return (
      <div className="space-y-4">
        {meters.length > 0 ? (
          meters.map((meter) => (
            <div key={meter.meter_id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">
                  {meter.name} <span className="text-gray-500 font-normal">(kWh)</span>
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {meter.meter_id}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                value={readings[meter.meter_id] || ''}
                onChange={(e) => onReadingChange?.(meter.meter_id, e.target.value)}
                placeholder="Enter reading"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No electricity meters configured. Configure meters in Settings.
          </p>
        )}
      </div>
    );
  }

  // Setup Mode: Configure meters
  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Meter</h4>
        
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Meter Name (e.g., Main Meter, Solar)"
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
            disabled={!name.trim()}
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
                <span className="font-medium text-gray-800">{meter.name}</span>
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
          No electricity meters configured yet. Add at least one meter to continue.
        </p>
      )}
    </div>
  );
}

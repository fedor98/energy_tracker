/**
 * DashboardTransformControls Component
 *
 * Provides a collapsible control panel for adjusting chart transformation settings.
 * Allows users to configure scale factors and offset values for electricity, gas, and water
 * to improve visual comparability of consumption curves in the dashboard chart.
 *
 * Features:
 * - Chevron toggle to expand/collapse controls (initially collapsed)
 * - Separate rows for Offset and Scale values
 * - Color-coded icons (Yellow=Electricity, Green=Gas, Blue=Water)
 * - Auto-save on value change
 * - Smooth 200ms CSS transitions
 *
 * The component displays icons only when expanded, positioned above their respective input fields.
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ElectricityIcon, GasIcon, WaterIcon } from './icons/MeterIcons';
import type { DashboardTransform } from '../lib/api';

interface DashboardTransformControlsProps {
  transform: DashboardTransform;
  onTransformChange: (type: 'electricity_scale' | 'gas_scale' | 'water_scale', value: string) => void;
  onOffsetChange: (type: 'electricity_offset' | 'gas_offset' | 'water_offset', value: string) => void;
}

export function DashboardTransformControls({
  transform,
  onTransformChange,
  onOffsetChange,
}: DashboardTransformControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      {/* Header with Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        {/* Chevron */}
        <div className="text-gray-500">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
        
        {/* Label */}
        <span className="text-sm font-medium text-gray-700">Transform</span>
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 space-y-3 bg-white">
          {/* Icons Header */}
          <div className="flex items-center pl-14">
            <div className="flex items-center gap-3">
              <div className="w-16 flex justify-center">
                <ElectricityIcon size={16} />
              </div>
              <div className="w-16 flex justify-center">
                <GasIcon size={16} />
              </div>
              <div className="w-16 flex justify-center">
                <WaterIcon size={16} />
              </div>
            </div>
          </div>

          {/* Offset Row */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 w-14">Offset:</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="1"
                value={transform.electricity_offset}
                onChange={(e) => onOffsetChange('electricity_offset', e.target.value)}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
              <input
                type="number"
                step="1"
                value={transform.gas_offset}
                onChange={(e) => onOffsetChange('gas_offset', e.target.value)}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
              <input
                type="number"
                step="1"
                value={transform.water_offset}
                onChange={(e) => onOffsetChange('water_offset', e.target.value)}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Scale Row */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 w-14">Scale:</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={transform.electricity_scale}
                onChange={(e) => onTransformChange('electricity_scale', e.target.value)}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="1.0"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={transform.gas_scale}
                onChange={(e) => onTransformChange('gas_scale', e.target.value)}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="1.0"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={transform.water_scale}
                onChange={(e) => onTransformChange('water_scale', e.target.value)}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="1.0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

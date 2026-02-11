/**
 * EditModeRenderer Component
 * 
 * Renders editable meter reading values and comments for edit mode.
 * Follows the same pattern as ReadingModeRenderer and ResetModeRenderer.
 * 
 * Features:
 * - Displays each meter with its reading value and optional comment
 * - Shows reset indicator badge for reset entries
 * - Two-column layout for value and comment fields
 * - Consistent styling with other mode renderers
 */

import React from 'react';
import type { ModeRendererProps, MeterConfig, EditData } from './types';
import { getMeterDisplayName, isWaterMeterConfig } from './types';
import { WarmWaterLabel, ColdWaterLabel } from '../icons/MeterIcons';

export function EditModeRenderer<T extends MeterConfig>({
  meters,
  config,
  editData = {},
  onEditChange,
}: ModeRendererProps<T>) {
  // Handle value change
  const handleValueChange = (meterId: string, value: string) => {
    if (onEditChange) {
      onEditChange(meterId, 'value', value);
    }
  };

  // Handle comment change
  const handleCommentChange = (meterId: string, value: string) => {
    if (onEditChange) {
      onEditChange(meterId, 'comment', value);
    }
  };

  // Empty state
  if (meters.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        {config.emptyStateMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {meters.map((meter) => {
        const meterId = meter.meter_id;
        const data = editData[meterId] || { value: '', comment: '', isReset: false };
        const displayName = getMeterDisplayName(meter, config);

        return (
          <div key={meterId} className="p-4 bg-gray-50 rounded-lg">
            {/* Header: Display Name + Meter ID + Reset Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">
                  {displayName}
                </span>
                {isWaterMeterConfig(meter) && (
                  <span>
                    {meter.is_warm_water ? <WarmWaterLabel /> : <ColdWaterLabel />}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {data.isReset && (
                  <span className="text-xs font-medium px-2 py-1 bg-orange-100 text-orange-700 rounded">
                    Reset
                  </span>
                )}
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {meterId}
                </span>
              </div>
            </div>

            {/* Input Fields: Value + Comment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Value ({config.unit})
                </label>
                <input
                  type="number"
                  step={config.step}
                  value={data.value}
                  onChange={(e) => handleValueChange(meterId, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${config.label.toLowerCase()} reading...`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Comment (optional)
                </label>
                <input
                  type="text"
                  value={data.comment}
                  onChange={(e) => handleCommentChange(meterId, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a comment..."
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default EditModeRenderer;

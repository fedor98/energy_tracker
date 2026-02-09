/**
 * MeterDataTable Component
 * 
 * Displays meter readings in a table format with monthly grouping.
 * Supports three utility types: Electricity, Water, and Gas.
 * 
 * Features:
 * - Groups readings by period (month) with visual dividers
 * - Shows date, meter/room name, and value
 * - Water readings include warm/cold indicators (🔴/🔵)
 * - Sorts meters alphabetically within each month
 * - Displays values with 2 decimal precision
 * 
 * The table shows readings in reverse chronological order (newest first).
 */

import type { ElectricityReading, WaterReading, GasReading } from '../lib/api';

type MeterData = ElectricityReading | WaterReading | GasReading;

interface MeterDataTableProps {
  data: MeterData[];
  type: 'electricity' | 'water' | 'gas';
}

/**
 * Type guard to check if a reading is a WaterReading
 */
function isWaterReading(reading: MeterData): reading is WaterReading {
  return 'is_warm_water' in reading;
}

/**
 * Type guard to check if a reading is an ElectricityReading
 */
function isElectricityReading(reading: MeterData): reading is ElectricityReading {
  return 'meter_name' in reading;
}

/**
 * Type guard to check if a reading is a GasReading
 */
function isGasReading(reading: MeterData): reading is GasReading {
  return 'room' in reading && !('is_warm_water' in reading);
}

/**
 * Groups meter readings by their period (YYYY-MM format).
 * Returns an object with periods as keys and arrays of readings as values.
 */
function groupByPeriod(data: MeterData[]): Record<string, MeterData[]> {
  const grouped: Record<string, MeterData[]> = {};

  data.forEach((row) => {
    const period = row.period || 'Unknown';
    if (!grouped[period]) {
      grouped[period] = [];
    }
    grouped[period].push(row);
  });

  return grouped;
}

/**
 * Sorts meters alphabetically by their display name (room or meter_name).
 * Used to maintain consistent ordering within each month.
 */
function sortByMeterName(a: MeterData, b: MeterData): number {
  const nameA = (isElectricityReading(a) ? a.meter_name : a.room) || '';
  const nameB = (isElectricityReading(b) ? b.meter_name : b.room) || '';
  return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
}

/**
 * Renders the appropriate header columns based on utility type.
 * Electricity: Date | Meter | Value
 * Water: Date | Room | Value (with warm/cold indicator)
 * Gas: Date | Room | Value
 */
function renderTableHeader(type: 'electricity' | 'water' | 'gas') {
  const baseHeaderClass =
    'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider';

  if (type === 'electricity') {
    return (
      <>
        <th className={baseHeaderClass}>Date</th>
        <th className={baseHeaderClass}>Meter</th>
        <th className={`${baseHeaderClass} text-right`}>Value</th>
      </>
    );
  }

  // Water and Gas both use 'Room' terminology
  return (
    <>
      <th className={baseHeaderClass}>Date</th>
      <th className={baseHeaderClass}>Room</th>
      <th className={`${baseHeaderClass} text-right`}>Value</th>
    </>
  );
}

/**
 * Renders a single table row for a meter reading.
 * Handles type-specific formatting (electricity meter names vs room names).
 * Water readings include emoji indicators for warm/cold water.
 */
function renderTableRow(
  row: MeterData,
  type: 'electricity' | 'water' | 'gas',
  isFirstInMonth: boolean
) {
  const baseCellClass = 'px-4 py-3 text-sm';

  // Format the value with 2 decimal places and appropriate unit
  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  // Get unit based on type
  const unit = type === 'electricity' ? 'kWh' : 'm³';

  // Render meter/room name with type-specific formatting
  const renderMeterName = () => {
    if (type === 'electricity' && isElectricityReading(row)) {
      return row.meter_name || '-';
    }

    if (type === 'water' && isWaterReading(row)) {
      // Show warm/cold indicator for water
      const emoji = row.is_warm_water ? '🔴' : '🔵';
      return `${emoji} ${row.room || '-'}`;
    }

    // Gas uses room field
    if (isGasReading(row)) {
      return row.room || '-';
    }
    
    return '-';
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td
        className={`${baseCellClass} text-gray-900 whitespace-nowrap ${
          isFirstInMonth ? 'border-t-2 border-gray-300' : ''
        }`}
      >
        {row.date || '-'}
      </td>
      <td
        className={`${baseCellClass} text-gray-700 ${
          isFirstInMonth ? 'border-t-2 border-gray-300' : ''
        }`}
      >
        {renderMeterName()}
      </td>
      <td
        className={`${baseCellClass} text-gray-900 text-right font-medium ${
          isFirstInMonth ? 'border-t-2 border-gray-300' : ''
        }`}
      >
        {formatValue(row.value)} {unit}
      </td>
    </tr>
  );
}

/**
 * Main component that renders a data table for meter readings.
 * Organizes data by period with visual separators between months.
 */
export function MeterDataTable({ data, type }: MeterDataTableProps) {
  // Handle empty state
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No {type} readings available</p>
        <p className="text-sm mt-2">
          Try adjusting your date filters or add new readings.
        </p>
      </div>
    );
  }

  // Group and sort the data
  const grouped = groupByPeriod(data);
  const sortedPeriods = Object.keys(grouped).sort().reverse(); // Newest first

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-full">
        <thead className="bg-gray-50">
          <tr>{renderTableHeader(type)}</tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {sortedPeriods.map((period) => {
            const periodRows = grouped[period];
            // Sort meters alphabetically within this period
            const sortedRows = [...periodRows].sort(sortByMeterName);

            return sortedRows.map((row, index) =>
              renderTableRow(row, type, index === 0)
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

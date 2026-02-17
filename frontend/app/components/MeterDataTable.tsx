/**
 * MeterDataTable Component
 * 
 * Displays meter readings in a table format with monthly grouping.
 * Supports three utility types: Electricity, Water, and Gas.
 * Reset pairs are automatically merged into single rows.
 */

import { RotateCcw } from 'lucide-react';
import type { ElectricityReading, WaterReading, GasReading } from '../lib/api';
import { TableActionsMenu } from './TableActionsMenu';
import { WarmWaterIndicator, ColdWaterIndicator } from './icons/MeterIcons';

type MeterData = ElectricityReading | WaterReading | GasReading;

interface MeterDataTableProps {
  data: MeterData[];
  type: 'electricity' | 'water' | 'gas';
  showActions?: boolean;
  onEdit?: (date: string) => void;
  onDelete?: (date: string, meterType: 'electricity' | 'water' | 'gas', meterId: string, meterDisplayName: string, isWarmWater?: boolean) => void;
}

interface TableRow {
  id: number;
  date: string;
  displayName: string;
  meterId: string;
  meterType: 'electricity' | 'water' | 'gas';
  value: string;
  period: string;
  isReset: boolean;
  isWarmWater?: boolean;
}

const isWaterReading = (r: MeterData): r is WaterReading => 'is_warm_water' in r;
const isElectricityReading = (r: MeterData): r is ElectricityReading => 'meter_name' in r;
const getDisplayName = (r: MeterData): string => isElectricityReading(r) ? (r.meter_name || '') : (r.room || '');
const getMeterId = (r: MeterData): string => r.meter_id;
const getDatePart = (d: string): string => d.split(' ')[0];
const formatValue = (v: number | null | undefined): string => v == null ? '-' : v.toFixed(2);

/**
 * Merges reset pairs into single rows. Reset pairs share the same date and meter.
 */
function mergeResetPairs(data: MeterData[], type: 'electricity' | 'water' | 'gas'): TableRow[] {
  const result: TableRow[] = [];
  const processed = new Set<number>();
  const unit = data[0] && 'meter_name' in data[0] ? 'kWh' : 'm³';

  for (let i = 0; i < data.length; i++) {
    if (processed.has(i)) continue;

    const current = data[i];
    const currentIsReset = current.is_reset === true;
    const currentDate = getDatePart(current.date);
    const currentName = getDisplayName(current);
    const currentMeterId = getMeterId(current);

    if (!currentIsReset) {
      result.push({
        id: current.id,
        date: current.date,
        displayName: currentName,
        meterId: currentMeterId,
        meterType: type,
        value: `${formatValue(current.value)} ${unit}`,
        period: current.period,
        isReset: false,
        isWarmWater: isWaterReading(current) ? current.is_warm_water : undefined
      });
      processed.add(i);
      continue;
    }

    // Look for reset pair
    let pairFound = false;
    for (let j = i + 1; j < data.length; j++) {
      if (processed.has(j)) continue;
      
      const other = data[j];
      if (other.is_reset === true && 
          getDatePart(other.date) === currentDate && 
          getDisplayName(other) === currentName &&
          getMeterId(other) === currentMeterId) {
        
        // Determine old/new by time
        const currentTime = current.date.includes(' ') ? current.date.split(' ')[1] : '';
        const otherTime = other.date.includes(' ') ? other.date.split(' ')[1] : '';
        const [oldVal, newVal] = currentTime <= otherTime 
          ? [current.value, other.value] 
          : [other.value, current.value];

        result.push({
          id: current.id,
          date: currentDate,
          displayName: currentName,
          meterId: currentMeterId,
          meterType: type,
          value: `${formatValue(oldVal)} ${unit} → ${formatValue(newVal)} ${unit}`,
          period: current.period,
          isReset: true,
          isWarmWater: isWaterReading(current) ? current.is_warm_water : undefined
        });
        processed.add(i);
        processed.add(j);
        pairFound = true;
        break;
      }
    }

    // No pair found - add as single reset
    if (!pairFound) {
      result.push({
        id: current.id,
        date: currentDate,
        displayName: currentName,
        meterId: currentMeterId,
        meterType: type,
        value: `${formatValue(current.value)} ${unit}`,
        period: current.period,
        isReset: true,
        isWarmWater: isWaterReading(current) ? current.is_warm_water : undefined
      });
      processed.add(i);
    }
  }

  return result;
}

function groupByPeriod(rows: TableRow[]): Record<string, TableRow[]> {
  return rows.reduce((acc, row) => {
    const period = row.period || 'Unknown';
    acc[period] = acc[period] || [];
    acc[period].push(row);
    return acc;
  }, {} as Record<string, TableRow[]>);
}

function renderTableHeader(type: 'electricity' | 'water' | 'gas', showActions?: boolean) {
  const baseHeaderClass = 'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider';
  const nameLabel = type === 'electricity' ? 'Meter' : 'Room';

  return (
    <>
      <th className={baseHeaderClass}>Date</th>
      <th className={baseHeaderClass}>{nameLabel}</th>
      <th className={`${baseHeaderClass} text-right`}>Value</th>
      {showActions && <th className={`${baseHeaderClass} w-8`}></th>}
    </>
  );
}

function renderTableRow(
  row: TableRow,
  type: 'electricity' | 'water' | 'gas',
  isFirstInMonth: boolean,
  showActions?: boolean,
  onEdit?: (date: string) => void,
  onDelete?: (date: string, meterType: 'electricity' | 'water' | 'gas', meterId: string, meterDisplayName: string, isWarmWater?: boolean) => void
) {
  const baseCellClass = 'px-4 py-3 text-sm';
  const borderClass = isFirstInMonth ? 'border-t-2 border-gray-300' : '';

  const renderName = () => {
    if (type === 'water') {
      const indicator = row.isWarmWater ? <WarmWaterIndicator /> : <ColdWaterIndicator />;
      return <span className="flex items-center gap-2">{indicator}{row.displayName}</span>;
    }
    return row.displayName;
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className={`${baseCellClass} text-gray-900 whitespace-nowrap ${borderClass}`}>
        {row.date}
        {row.isReset && <RotateCcw className="w-3 h-3 text-orange-500 inline ml-1" />}
      </td>
      <td className={`${baseCellClass} text-gray-700 ${borderClass}`}>{renderName()}</td>
      <td className={`${baseCellClass} text-gray-900 text-right font-medium ${borderClass}`}>
        {row.isReset && <RotateCcw className="w-3 h-3 text-orange-500 inline mr-1" />}
        {row.value}
      </td>
      {showActions && onEdit && onDelete && (
        <td className={`${baseCellClass} px-1 text-center ${borderClass}`}>
          <TableActionsMenu 
            date={row.date} 
            meterType={row.meterType}
            meterId={row.meterId}
            meterDisplayName={row.displayName}
            isWarmWater={row.isWarmWater}
            onEdit={onEdit} 
            onDelete={onDelete} 
          />
        </td>
      )}
    </tr>
  );
}

export function MeterDataTable({
  data,
  type,
  showActions = false,
  onEdit,
  onDelete
}: MeterDataTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No {type} readings available</p>
        <p className="text-sm mt-2">Try adjusting your date filters or add new readings.</p>
      </div>
    );
  }

  const mergedRows = mergeResetPairs(data, type);
  const grouped = groupByPeriod(mergedRows);
  const sortedPeriods = Object.keys(grouped).sort().reverse();

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-full">
        <thead className="bg-gray-50">
          <tr>{renderTableHeader(type, showActions)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedPeriods.map((period) => {
            const periodRows = grouped[period].sort((a, b) => 
              a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
            );
            return periodRows.map((row, index) => 
              renderTableRow(row, type, index === 0, showActions, onEdit, onDelete)
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

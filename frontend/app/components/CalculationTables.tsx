/**
 * CalculationTables Component
 * 
 * Displays detailed consumption calculations for all three utility types.
 * Shows a table for each type (Electricity, Water, Gas) with:
 * - Period columns (rows)
 * - Individual meter consumption and segment counts
 * - Total consumption per period
 * 
 * Water meters are displayed with visual indicators (🔴 warm, 🔵 cold).
 * Tables are horizontally scrollable on mobile devices.
 */

import type { CalculationData, CalculationPeriod } from '../lib/api';
import { ElectricityIcon, WaterIcon, GasIcon } from './icons/MeterIcons';

interface CalculationTablesProps {
  electricityData: CalculationData;
  waterData: CalculationData;
  gasData: CalculationData;
}

interface TableSectionProps {
  title: string;
  icon: React.ReactNode;
  unit: string;
  data: CalculationData;
}

/**
 * Renders a single calculation table for one utility type.
 * Dynamically adjusts columns based on available meters.
 * Uses consistent styling with MeterDataTable.
 */
function CalcTableSection({ title, icon, unit, data }: TableSectionProps) {
  // Handle empty data state
  if (!data.periods || data.periods.length === 0) {
    return (
      <div className="mb-8 last:mb-0">
        <h3 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-indigo-600">
          {icon} {title}
        </h3>
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  // Extract all unique meter names across all periods for consistent columns
  const allMeters = new Set<string>();
  data.periods.forEach((period: CalculationPeriod) => {
    period.meters.forEach((meter) => {
      allMeters.add(meter.entity_id);
    });
  });
  const meterList = Array.from(allMeters).sort();

  /**
   * Transforms water meter names to use visual indicators.
   * "Room (Warm)" → "🔴 Room"
   * "Room (Cold)" → "🔵 Room"
   */
  const formatMeterName = (meterName: string): React.ReactNode => {
    if (title === 'Water') {
      const isWarm = meterName.includes('(Warm)');
      const isCold = meterName.includes('(Cold)');
      const baseName = meterName.replace(' (Warm)', '').replace(' (Cold)', '');

      return (
        <span className="flex items-center gap-1">
          {isWarm && <span className="inline-block w-2 h-2 rounded-full bg-red-500" />}
          {isCold && <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />}
          {baseName}
        </span>
      );
    }
    return meterName;
  };

  const headerClass = 'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider';
  const cellClass = 'px-4 py-3 text-sm';

  return (
    <div className="mb-8 last:mb-0">
      <h3 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-indigo-600 flex items-center gap-2">
        {icon} {title}
      </h3>

      {/* Horizontal scroll container for mobile */}
      <div className="overflow-x-auto">
        <table className="data-table min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={headerClass}>Period</th>
              
              {/* Header columns: Meter (unit) + Segs for each meter */}
              {meterList.map((meter) => (
                <>
                  <th key={meter} className={headerClass}>
                    {formatMeterName(meter)} ({unit})
                  </th>
                  <th key={`${meter}-segs`} className={`${headerClass} seg-col`}>
                    Segs
                  </th>
                </>
              ))}
              
              <th className={`${headerClass} text-right`}>Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {data.periods.map((period: CalculationPeriod) => {
              // Create lookup map for quick meter access
              const meterMap: Record<string, { consumption: number; segments: number }> = {};
              period.meters.forEach((m) => {
                meterMap[m.entity_id] = m;
              });

              // Calculate period total
              const periodTotal = period.meters.reduce(
                (sum, m) => sum + (m.consumption || 0),
                0
              );

              return (
                <tr key={period.period} className="hover:bg-gray-50 transition-colors">
                  <td className={`${cellClass} text-gray-900 whitespace-nowrap`}>
                    {period.period}
                  </td>

                  {/* Add consumption + segments cells for each meter */}
                  {meterList.map((meter) => {
                    const meterData = meterMap[meter];
                    return (
                      <>
                        <td className={`${cellClass} text-gray-900 text-center`}>
                          {meterData && meterData.consumption !== null
                            ? `${meterData.consumption.toFixed(2)} ${unit}`
                            : '-'}
                        </td>
                        <td className={`${cellClass} text-gray-600 text-center seg-col`}>
                          {meterData ? meterData.segments : '-'}
                        </td>
                      </>
                    );
                  })}

                  {/* Total column */}
                  <td className={`${cellClass} text-gray-900 text-right font-semibold`}>
                    <strong>{periodTotal.toFixed(2)} {unit}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Main component that renders all three calculation tables.
 * Organizes data by utility type with appropriate icons and units.
 */
export function CalculationTables({
  electricityData,
  waterData,
  gasData,
}: CalculationTablesProps) {
  return (
    <div className="space-y-6">
      <CalcTableSection
        title="Electricity"
        icon={<ElectricityIcon size={20} />}
        unit="kWh"
        data={electricityData}
      />

      <CalcTableSection
        title="Water"
        icon={<WaterIcon size={20} />}
        unit="m³"
        data={waterData}
      />

      <CalcTableSection
        title="Gas"
        icon={<GasIcon size={20} />}
        unit="m³"
        data={gasData}
      />
    </div>
  );
}

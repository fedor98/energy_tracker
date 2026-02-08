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

interface CalculationTablesProps {
  electricityData: CalculationData;
  waterData: CalculationData;
  gasData: CalculationData;
}

interface TableSectionProps {
  title: string;
  icon: string;
  unit: string;
  data: CalculationData;
}

/**
 * Renders a single calculation table for one utility type.
 * Dynamically adjusts columns based on available meters.
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
   * Transforms water meter names to use emoji indicators.
   * "Room (Warm)" → "🔴 Room"
   * "Room (Cold)" → "🔵 Room"
   */
  const formatMeterName = (meterName: string): string => {
    if (title === 'Water') {
      return meterName.replace(' (Warm)', ' 🔴').replace(' (Cold)', ' 🔵');
    }
    return meterName;
  };

  return (
    <div className="mb-8 last:mb-0">
      <h3 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-indigo-600">
        {icon} {title}
      </h3>

      {/* Horizontal scroll container for mobile */}
      <div className="overflow-x-auto">
        <table className="data-table min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Period
              </th>

              {/* Dynamic meter columns - each meter has consumption + segments */}
              {meterList.map((meter) => (
                <th
                  key={meter}
                  colSpan={2}
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-l border-gray-200"
                >
                  {formatMeterName(meter)}
                </th>
              ))}

              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-l border-gray-200">
                Total
              </th>
            </tr>

            {/* Sub-header for Consumption/Segments */}
            <tr className="bg-gray-50">
              <th></th>
              {meterList.map((meter) => (
                <th
                  key={`${meter}-sub`}
                  colSpan={2}
                  className="border-l border-gray-200"
                >
                  <div className="grid grid-cols-2">
                    <span className="px-2 py-1 text-xs text-gray-500 text-center">
                      {unit}
                    </span>
                    <span className="seg-col px-2 py-1 text-xs text-gray-500 text-center bg-gray-100">
                      Segs
                    </span>
                  </div>
                </th>
              ))}
              <th className="border-l border-gray-200"></th>
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
                <tr key={period.period} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {period.period}
                  </td>

                  {/* Render cells for each meter */}
                  {meterList.map((meter) => {
                    const meterData = meterMap[meter];
                    return (
                      <td
                        key={`${period.period}-${meter}`}
                        colSpan={2}
                        className="border-l border-gray-200"
                      >
                        <div className="grid grid-cols-2">
                          <span className="px-2 py-3 text-sm text-gray-900 text-center">
                            {meterData && meterData.consumption !== null
                              ? meterData.consumption.toFixed(2)
                              : '-'}
                          </span>
                          <span className="seg-col px-2 py-3 text-sm text-gray-600 text-center bg-gray-50">
                            {meterData ? meterData.segments : '-'}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Total column */}
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right border-l border-gray-200">
                    {periodTotal.toFixed(2)} {unit}
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
        icon="⚡️"
        unit="kWh"
        data={electricityData}
      />

      <CalcTableSection title="Water" icon="💧" unit="m³" data={waterData} />

      <CalcTableSection title="Gas" icon="💨" unit="m³" data={gasData} />
    </div>
  );
}

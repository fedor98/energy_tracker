/**
 * TabContent Component - Renders the appropriate content based on active tab
 *
 * This component centralizes the tab content rendering logic:
 * - Shows loading skeletons while data is being fetched
 * - Renders ConsumptionChart for 'consumption' tab with calculations data
 * - Renders CalculationTables for 'calc' tab
 * - Renders MeterDataTable for individual meter tabs (electricity/water/gas)
 *
 * Props include both calculation data (for charts) and raw reading data (for tables)
 * along with callbacks for edit/delete actions.
 */

import type { ElectricityReading, WaterReading, GasReading, CalculationData, DashboardTransform } from '../lib/api';
import { ConsumptionChart } from './ConsumptionChart';
import { CalculationTables } from './CalculationTables';
import { MeterDataTable } from './MeterDataTable';

interface TabContentProps {
  activeTab: string;
  loadingReadings: boolean;
  loadingCalculations: boolean;
  // Calculation data for consumption and calc tabs
  elecCalcData: CalculationData;
  waterCalcData: CalculationData;
  gasCalcData: CalculationData;
  // Reading data for meter tabs
  electricityData: ElectricityReading[];
  waterData: WaterReading[];
  gasData: GasReading[];
  // Props for consumption chart
  cumulatedWater: boolean;
  transform: DashboardTransform;
  // Callbacks for meter tables
  onEdit: (date: string) => void;
  onDelete: (date: string) => void;
}

export function TabContent({
  activeTab,
  loadingReadings,
  loadingCalculations,
  elecCalcData,
  waterCalcData,
  gasCalcData,
  electricityData,
  waterData,
  gasData,
  cumulatedWater,
  transform,
  onEdit,
  onDelete,
}: TabContentProps) {
  // Show loading skeleton
  if (activeTab === 'calc' && loadingCalculations) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (activeTab !== 'calc' && loadingReadings) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Render appropriate content based on active tab
  switch (activeTab) {
    case 'consumption':
      return (
        <ConsumptionChart
          electricityData={elecCalcData}
          waterData={waterCalcData}
          gasData={gasCalcData}
          cumulatedWater={cumulatedWater}
          transform={transform}
        />
      );

    case 'calc':
      return (
        <CalculationTables
          electricityData={elecCalcData}
          waterData={waterCalcData}
          gasData={gasCalcData}
        />
      );

    case 'electricity':
      return (
        <MeterDataTable
          data={electricityData}
          type="electricity"
          showActions={true}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

    case 'water':
      return (
        <MeterDataTable
          data={waterData}
          type="water"
          showActions={true}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

    case 'gas':
      return (
        <MeterDataTable
          data={gasData}
          type="gas"
          showActions={true}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

    default:
      return null;
  }
}

/**
 * DashboardTabs Component - Custom tab navigation with responsive layout
 *
 * Features:
 * - Split layout: Consumption/Calc on left, meter tabs on right (desktop)
 * - Two-row layout for mobile (Consumption/Calc first row, meters second row)
 * - Visual icons for each tab type
 * - Active state styling with distinct visual indicator
 *
 * The tab configuration is centralized in DASHBOARD_TABS constant
 * for easy modification of tab order or labels.
 */

import { ConsumptionIcon, CalcIcon, ElectricityIcon, WaterIcon, GasIcon } from './icons/MeterIcons';

export interface DashboardTab {
  id: string;
  label: string;
  position: 'left' | 'right';
  icon: (isActive: boolean) => React.ReactNode;
}

/**
 * Tab configuration for the dashboard
 * position: 'left' or 'right' determines layout placement on desktop
 */
export const DASHBOARD_TABS: DashboardTab[] = [
  { id: 'consumption', label: 'Consumption', position: 'left', icon: (isActive) => <ConsumptionIcon size={16} className={isActive ? '!text-white' : ''} /> },
  { id: 'calc', label: 'Calc', position: 'left', icon: (isActive) => <CalcIcon size={16} className={isActive ? '!text-white' : ''} /> },
  { id: 'electricity', label: 'Electricity', position: 'right', icon: (isActive) => <ElectricityIcon size={16} className={isActive ? '!text-white' : ''} /> },
  { id: 'water', label: 'Water', position: 'right', icon: (isActive) => <WaterIcon size={16} className={isActive ? '!text-white' : ''} /> },
  { id: 'gas', label: 'Gas', position: 'right', icon: (isActive) => <GasIcon size={16} className={isActive ? '!text-white' : ''} /> },
];

interface DashboardTabsProps {
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function DashboardTabs({ activeTab, onChange }: DashboardTabsProps) {
  // Split tabs by position for responsive layout
  const leftTabs = DASHBOARD_TABS.filter((t) => t.position === 'left');
  const rightTabs = DASHBOARD_TABS.filter((t) => t.position === 'right');

  const TabButton = ({ tab, showLabel = true, flex = false }: { tab: DashboardTab; showLabel?: boolean; flex?: boolean }) => (
    <button
      key={tab.id}
      onClick={() => onChange(tab.id)}
      className={`px-4 py-2 rounded-lg font-medium text-sm sm:text-base border transition-colors ${
        activeTab === tab.id
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
      } ${flex ? 'flex-1' : ''} ${!showLabel ? 'flex items-center justify-center' : ''}`}
    >
      <span className={`flex items-center justify-center w-full ${showLabel ? 'gap-2' : ''}`}>
        {tab.icon(activeTab === tab.id)}
        {showLabel && tab.label}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-2 pb-4">
      {/* Mobile layout: Two rows with icons only for meter tabs */}
      <div className="flex sm:hidden flex-col gap-2">
        <div className="flex gap-2">
          {leftTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} showLabel flex />
          ))}
        </div>
        <div className="flex gap-2">
          {rightTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} showLabel={false} flex />
          ))}
        </div>
      </div>

      {/* Desktop layout: Single row with left/right separation */}
      <div className="hidden sm:flex flex-row gap-2">
        <div className="flex gap-2">
          {leftTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} />
          ))}
        </div>
        <div className="flex-1"></div>
        <div className="flex gap-2">
          {rightTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} />
          ))}
        </div>
      </div>
    </div>
  );
}

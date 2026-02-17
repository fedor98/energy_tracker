/**
 * Dashboard Route - Main entry point of the Energy Tracker application
 * 
 * Displays energy consumption data across different utility types with:
 * - Date range filtering (start/end month)
 * - 5 tabs: Consumption (chart), Calc (calculation tables), Electricity, Water, Gas (data tables)
 * - Responsive layout optimized for mobile and desktop
 * - Skeleton loading states and error handling
 * 
 * Data fetching is triggered when filter dates change. Each tab displays
 * its data independently, with the Calc tab requiring separate API calls
 * for calculation details.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Plus, RotateCcw, Settings } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDashboardData } from '../hooks/useDashboardData';
import { MonthFilterInput } from '../components/MonthFilterInput';
import { DashboardTabs } from '../components/DashboardTabs';
import { TabContent } from '../components/TabContent';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';
import { DashboardTransformControls } from '../components/DashboardTransformControls';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('consumption');
  const [cumulatedWater, setCumulatedWater] = useState<boolean>(true);
  
  const {
    startMonth,
    endMonth,
    electricityData,
    waterData,
    gasData,
    elecCalcData,
    waterCalcData,
    gasCalcData,
    loadingReadings,
    loadingCalculations,
    checkingConfig,
    error,
    successMessage,
    deleteDialogOpen,
    dateToDelete,
    transform,
    setStartMonth,
    setEndMonth,
    setDeleteDialogOpen,
    setDateToDelete,
    handleResetFilters,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleTransformChange,
    handleOffsetChange,
  } = useDashboardData(navigate);

  /**
   * Handle preselected period from navigation state
   * When returning from edit page, restore the selected period
   */
  useEffect(() => {
    const preselectedPeriod = location.state?.preselectedPeriod;
    if (preselectedPeriod) {
      setStartMonth(preselectedPeriod);
      setEndMonth(preselectedPeriod);
      // Clear the state so it doesn't persist on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, setStartMonth, setEndMonth]);

  /**
   * Navigate to edit page for a specific date
   * Passes return period for navigation back to dashboard
   */
  const handleEdit = (date: string) => {
    navigate(`/edit?date=${date}`, { state: { returnPeriod: startMonth || endMonth } });
  };

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = (date: string) => {
    setDateToDelete(date);
    setDeleteDialogOpen(true);
  };

  // Show loading spinner while checking if app is configured
  if (checkingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container min-h-screen bg-gray-50">
      {/* Page Header */}
      <header className="bg-white px-4 sm:px-6 lg:px-8 py-4 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600 tracking-tight">
            Energy Tracker
          </h1>
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center h-9 px-3 mr-2 hover:bg-indigo-200 text-indigo-700 font-medium text-sm rounded-full transition-colors"
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-8">
        {/* Filter Section */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <MonthFilterInput
              id="start-month"
              label="Start Month"
              value={startMonth}
              onChange={setStartMonth}
            />
            <MonthFilterInput
              id="end-month"
              label="End Month"
              value={endMonth}
              onChange={setEndMonth}
            />
            {/* Action buttons */}
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                onClick={() => {}}
                variant="primary"
                className="flex-1 sm:flex-none whitespace-nowrap"
              >
                Apply
              </Button>
              <Button
                onClick={handleResetFilters}
                variant="secondary"
                className="flex-1 sm:flex-none whitespace-nowrap"
              >
                Last 12 Months
              </Button>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4 mb-6">
          <button
            onClick={() => navigate('/add')}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium text-sm rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Reading
          </button>
          <button
            onClick={() => navigate('/reset')}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium text-sm rounded-full transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Meter
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">Error loading data: {error}</p>
          </div>
        )}

        {/* Success Message Display */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          date={dateToDelete || ''}
          isOpen={deleteDialogOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />

        {/* Main Content Area */}
        <Card>
          {/* Tab Navigation */}
          <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

          {/* Transform Controls - Only in Consumption tab */}
          {activeTab === 'consumption' && (
            <DashboardTransformControls
              transform={transform}
              onTransformChange={handleTransformChange}
              onOffsetChange={handleOffsetChange}
            />
          )}

          {/* Cumulated Water Checkbox - Only in Consumption tab */}
          {activeTab === 'consumption' && (
            <div className="mb-4 inline-flex items-center gap-2">
              <input
                type="checkbox"
                id="cumulated-water"
                checked={cumulatedWater}
                onChange={(e) => setCumulatedWater(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor="cumulated-water"
                className="text-sm text-gray-700 cursor-pointer select-none whitespace-nowrap"
              >
                Cumulated Water
              </label>
            </div>
          )}

          {/* Tab Content */}
          <div className="dashboard-content border-t border-gray-300 pt-6 overflow-x-auto">
            <TabContent
              activeTab={activeTab}
              loadingReadings={loadingReadings}
              loadingCalculations={loadingCalculations}
              elecCalcData={elecCalcData}
              waterCalcData={waterCalcData}
              gasCalcData={gasCalcData}
              electricityData={electricityData}
              waterData={waterData}
              gasData={gasData}
              cumulatedWater={cumulatedWater}
              transform={transform}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          </div>
        </Card>
      </main>
    </div>
  );
}

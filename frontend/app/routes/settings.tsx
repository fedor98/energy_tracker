/**
 * Settings Route
 * 
 * Application settings page with:
 * - Database maintenance (backup & reorganize)
 * - Restore from backup
 * - App data reset (complete database reset)
 * - About section
 * 
 * Design follows the same patterns as /add, /edit, /reset routes:
 * - PageLayout wrapper with consistent styling
 * - Card-based sections
 * - Tailwind for layout, Button component for actions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Database,
  RotateCcw,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Archive,
  RotateCcw as RestoreIcon,
  Trash2,
  Calculator,
  Loader2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  reorganizeDatabase,
  resetConfig,
  listBackups,
  restoreFromBackup,
  recalculateAllConsumption,
  type BackupInfo
} from '../lib/api';

export default function Settings() {
  const navigate = useNavigate();
  
  // Loading states
  const [reorganizing, setReorganizing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [loadingBackups, setLoadingBackups] = useState(true);

  // Status messages
  const [reorganizeStatus, setReorganizeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [recalculateStatus, setRecalculateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Backups
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  
  // Confirmation dialog states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);

  // Load backups on mount
  useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      const response = await listBackups();
      setBackups(response.backups);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  }

  // Handle database reorganization
  async function handleReorganize() {
    if (!confirm('A backup will be created first, then your current database will be reorganized with newest entries first. Continue?')) {
      return;
    }

    setReorganizing(true);
    setReorganizeStatus(null);

    try {
      const result = await reorganizeDatabase();
      setReorganizeStatus({
        type: 'success',
        message: result.message
      });
      // Reload backups list after reorganization
      await loadBackups();
    } catch (err) {
      setReorganizeStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reorganize database'
      });
    } finally {
      setReorganizing(false);
    }
  }

  // Handle recalculate all consumption
  async function handleRecalculate() {
    if (!confirm('This will clear all consumption calculations and recalculate them from scratch. This may take a moment for large databases. Continue?')) {
      return;
    }

    setRecalculating(true);
    setRecalculateStatus(null);

    try {
      const result = await recalculateAllConsumption();
      setRecalculateStatus({
        type: 'success',
        message: `${result.message} (${result.stats.electricity} electricity, ${result.stats.water_warm + result.stats.water_cold} water, ${result.stats.gas} gas entries)`
      });
    } catch (err) {
      setRecalculateStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to recalculate consumption'
      });
    } finally {
      setRecalculating(false);
    }
  }

  // Handle restore from backup
  function handleRestoreClick(backup: BackupInfo) {
    setSelectedBackup(backup);
    setShowRestoreConfirm(true);
  }

  async function handleConfirmRestore() {
    if (!selectedBackup) return;
    
    setShowRestoreConfirm(false);
    setRestoring(true);
    setRestoreStatus(null);

    try {
      const result = await restoreFromBackup(selectedBackup.path);
      setRestoreStatus({
        type: 'success',
        message: `${result.message}. Reloading...`
      });
      // Reload after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setRestoreStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to restore from backup'
      });
      setRestoring(false);
    }
  }

  function handleCancelRestore() {
    setShowRestoreConfirm(false);
    setSelectedBackup(null);
  }

  // Handle app reset confirmation
  function handleResetClick() {
    setShowResetConfirm(true);
  }

  // Handle actual app reset
  async function handleConfirmReset() {
    setShowResetConfirm(false);
    setResetting(true);
    setResetStatus(null);

    try {
      await resetConfig();
      setResetStatus({
        type: 'success',
        message: 'Database reset successfully. Reloading...'
      });
      // Reload after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setResetStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reset database'
      });
      setResetting(false);
    }
  }

  // Cancel reset
  function handleCancelReset() {
    setShowResetConfirm(false);
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="min-h-screen bg-gray-50 dashboard-container">
      {/* Page Header */}
      <header className="bg-white px-4 sm:px-6 lg:px-8 py-4 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600 tracking-tight">
            Settings
          </h1>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 h-9 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-full transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-8 max-w-3xl mx-auto space-y-6">
        {/* Database Maintenance Section */}
        <Card className="bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Database Maintenance
            </h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Creates a backup of your current database, then reorganizes it to store entries 
            with newest dates first. This optimizes performance for recent data queries.
          </p>

          <Button
            onClick={handleReorganize}
            disabled={reorganizing}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {reorganizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating backup & reorganizing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Backup & Reorganize Database
              </>
            )}
          </Button>

          {reorganizeStatus && (
            <div className={`mt-4 p-3 rounded-md flex items-center gap-2 ${
              reorganizeStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {reorganizeStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{reorganizeStatus.message}</span>
            </div>
          )}
        </Card>

        {/* Recalculate Consumption Section */}
        <Card className="bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calculator className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Recalculate Consumption
            </h2>
          </div>

          <p className="text-gray-600 mb-4">
            Clears all consumption calculations and recalculates them from scratch based on all readings.
            Use this after database reorganization or if you suspect calculation errors.
            This will recalculate electricity, water (warm/cold), and gas consumption for all periods.
          </p>

          <Button
            onClick={handleRecalculate}
            disabled={recalculating}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {recalculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recalculating consumption...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Recalculate All Consumption
              </>
            )}
          </Button>

          {recalculateStatus && (
            <div className={`mt-4 p-3 rounded-md flex items-center gap-2 ${
              recalculateStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {recalculateStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{recalculateStatus.message}</span>
            </div>
          )}
        </Card>

        {/* Restore from Backup Section */}
        <Card className="bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Archive className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Restore from Backup
            </h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Restore your database from a previous backup. This will replace all current data 
            with the backup data. A backup of your current state will be created first.
          </p>

          {/* Backups List */}
          <div className="space-y-2 mb-4">
            {loadingBackups ? (
              <div className="text-gray-500 text-sm py-4 text-center">
                Loading backups...
              </div>
            ) : backups.length === 0 ? (
              <div className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg">
                No backups available
              </div>
            ) : (
              backups.map((backup) => (
                <div 
                  key={backup.path}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Archive className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {backup.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {backup.created} • {formatFileSize(backup.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRestoreClick(backup)}
                    disabled={restoring}
                    variant="secondary"
                    size="small"
                  >
                    <RestoreIcon className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>

          {restoreStatus && (
            <div className={`p-3 rounded-md flex items-center gap-2 ${
              restoreStatus.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {restoreStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{restoreStatus.message}</span>
            </div>
          )}
        </Card>

        {/* App Data Reset Section */}
        <Card className="bg-white border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Danger Zone
            </h2>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Reset Application Data</p>
                <p className="text-red-700 text-sm mt-1">
                  This will create a backup of your current database and then reset 
                  the application to its initial state. All data will be cleared and 
                  you'll need to run the setup wizard again. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleResetClick}
            disabled={resetting}
            variant="danger"
            className="w-full sm:w-auto"
          >
            {resetting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset App Data
              </>
            )}
          </Button>

          {resetStatus && (
            <div className={`mt-4 p-3 rounded-md flex items-center gap-2 ${
              resetStatus.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {resetStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{resetStatus.message}</span>
            </div>
          )}
        </Card>

        {/* About Section */}
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Info className="w-5 h-5 text-amber-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              About
            </h2>
          </div>
          
          <p className="text-gray-700">
            Energy Tracker v1.0
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Track your electricity, water, and gas consumption.
          </p>
        </Card>
      </main>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Reset
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure? This will backup the current database and start a fresh setup. 
              All your data will be cleared.
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleCancelReset}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReset}
                variant="danger"
              >
                Yes, Reset Everything
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {showRestoreConfirm && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <RestoreIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Restore
              </h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to restore from this backup?
            </p>
            <div className="bg-gray-50 p-3 rounded-lg mb-6">
              <p className="text-sm font-medium text-gray-900">{selectedBackup.filename}</p>
              <p className="text-xs text-gray-500">{selectedBackup.created}</p>
            </div>
            <p className="text-amber-600 text-sm mb-6">
              Your current data will be backed up before restoring. The page will reload after restoration.
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleCancelRestore}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRestore}
                variant="primary"
              >
                Restore
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// API Base URL
const API_BASE = '/api';

// Types from backend models - aligned with backend Pydantic schemas

export interface ElectricityReading {
  id: number;
  date: string;
  meter_name: string;
  value: number;
  period: string;
  consumption?: number;
  calculation_details?: string;
  comment?: string;
  is_reset?: boolean;
}

export interface WaterReading {
  id: number;
  date: string;
  room: string;
  value: number;
  is_warm_water: boolean;
  period: string;
  calculation_details?: string;
  comment?: string;
  total_water_consumption?: number;
  warm_water_consumption?: number;
  cold_water_consumption?: number;
  is_reset?: boolean;
}

export interface GasReading {
  id: number;
  date: string;
  room: string;
  value: number;
  period: string;
  consumption?: number;
  calculation_details?: string;
  comment?: string;
  is_reset?: boolean;
}

export interface GasMeterConfig {
  room: string;
  meter_id: string;
}

export interface WaterMeterConfig {
  room: string;
  is_warm_water: boolean;
  meter_id: string;
}

export interface ElectricityMeterConfig {
  name: string;
  meter_id: string;
}

export interface AppConfig {
  gas: {
    meters: GasMeterConfig[];
  };
  water: {
    meters: WaterMeterConfig[];
  };
  electricity: {
    meters: ElectricityMeterConfig[];
  };
}

export interface ApiResponse {
  status: string;
  message?: string;
  count?: number;
}

export interface CalculationMeter {
  entity_id: string;
  consumption: number;
  segments: number;
}

export interface CalculationPeriod {
  period: string;
  meters: CalculationMeter[];
}

export interface CalculationData {
  periods: CalculationPeriod[];
}

export interface ElectricityResetInput {
  meter_id: string;
  meter_name: string;
  last_reading: number;
  reset_value: number;
}

export interface WaterResetInput {
  meter_id: string;
  room: string;
  is_warm_water: boolean;
  last_reading: number;
  reset_value: number;
}

export interface GasResetInput {
  meter_id: string;
  room: string;
  last_reading: number;
  reset_value: number;
}

export interface MeterResetsInput {
  date: string;
  electricity: ElectricityResetInput[];
  water: WaterResetInput[];
  gas: GasResetInput[];
}

export interface ResetResult {
  status: string;
  message: string;
  created_readings: number;
}

// Date-based Reading Operations

export interface ReadingCounts {
  electricity: number;
  water: number;
  gas: number;
  total: number;
}

export interface ReadingMetersForDate {
  electricity: string[];
  water: string[];
  gas: string[];
}

export interface ReadingsByDateResponse {
  date: string;
  electricity: ElectricityReading[];
  water: WaterReading[];
  gas: GasReading[];
}

export interface ReadingUpdateItem {
  id: number;
  value: number;
  comment?: string;
}

export interface UpdateReadingsByDateData {
  new_date?: string;
  electricity?: ReadingUpdateItem[];
  water?: ReadingUpdateItem[];
  gas?: ReadingUpdateItem[];
}

export interface UpdateReadingsResponse {
  moved: number;
  electricity: number;
  water: number;
  gas: number;
  old_date: string;
  new_date: string;
  message: string;
}

export interface DeleteReadingsResponse {
  deleted: number;
  electricity: number;
  water: number;
  gas: number;
  message: string;
}

export interface ReorganizeResponse {
  message: string;
  backup_created?: string;
}

export interface BackupInfo {
  filename: string;
  path: string;
  created: string;
  size: number;
}

export interface BackupsResponse {
  backups: BackupInfo[];
}

export interface RestoreResponse {
  status: string;
  message: string;
  restored_from: string;
  pre_restore_backup: string | null;
}

export interface RecalculateStats {
  electricity: number;
  water_warm: number;
  water_cold: number;
  gas: number;
  total: number;
}

export interface RecalculateResponse {
  status: string;
  message: string;
  stats: RecalculateStats;
}

// Configuration API
export async function getConfig(): Promise<AppConfig | null> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch config');
  const data = await res.json();
  if (!data || 
      (data.gas?.meters?.length === 0 && 
       data.water?.meters?.length === 0 && 
       data.electricity?.meters?.length === 0)) {
    return null;
  }
  return data;
}

export async function initConfig(config: AppConfig): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/config/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to save config');
  return res.json();
}

export async function resetConfig(): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/config/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset');
  return res.json();
}

// Individual Reading Input Types
export interface ElectricityReadingInput {
  date: string;
  meter_name: string;
  meter_id: string;
  value: number;
  comment?: string;
}

export interface WaterReadingInput {
  date: string;
  room: string;
  meter_id: string;
  value: number;
  is_warm_water: boolean;
  comment?: string;
}

export interface GasReadingInput {
  date: string;
  room: string;
  meter_id: string;
  value: number;
  comment?: string;
}

// Individual Readings API
export async function createElectricityReading(reading: ElectricityReadingInput): Promise<ElectricityReading> {
  const res = await fetch(`${API_BASE}/readings/electricity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading)
  });
  if (!res.ok) throw new Error('Failed to create electricity reading');
  return res.json();
}

export async function createWaterReading(reading: WaterReadingInput): Promise<WaterReading> {
  const res = await fetch(`${API_BASE}/readings/water`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading)
  });
  if (!res.ok) throw new Error('Failed to create water reading');
  return res.json();
}

export async function createGasReading(reading: GasReadingInput): Promise<GasReading> {
  const res = await fetch(`${API_BASE}/readings/gas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading)
  });
  if (!res.ok) throw new Error('Failed to create gas reading');
  return res.json();
}

// Monthly Readings API
export async function getMonthlyReadings(period: string): Promise<{ period: string; electricity: ElectricityReading[]; water: WaterReading[]; gas: GasReading[] }> {
  const res = await fetch(`${API_BASE}/readings/monthly/${period}`);
  if (!res.ok) throw new Error('Failed to fetch monthly readings');
  return res.json();
}

// Electricity API
export async function getElectricityReadings(filters: { start?: string; end?: string; meter?: string } = {}): Promise<ElectricityReading[]> {
  const query = new URLSearchParams();
  if (filters.start) query.append('start', filters.start);
  if (filters.end) query.append('end', filters.end);
  if (filters.meter) query.append('meter', filters.meter);
  const res = await fetch(`${API_BASE}/readings/electricity?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch electricity readings');
  return res.json();
}

export async function getElectricityReading(id: number): Promise<ElectricityReading> {
  const res = await fetch(`${API_BASE}/readings/electricity/${id}`);
  if (!res.ok) throw new Error('Failed to fetch electricity reading');
  return res.json();
}

export async function updateElectricityReading(id: number, reading: { value: number; comment?: string; date?: string }): Promise<ElectricityReading> {
  const res = await fetch(`${API_BASE}/readings/electricity/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading)
  });
  if (!res.ok) throw new Error('Failed to update electricity reading');
  return res.json();
}

export async function deleteElectricityReading(id: number): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/readings/electricity/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete electricity reading');
  return res.json();
}

// Water API
export async function getWaterReadings(filters: { start?: string; end?: string; room?: string; warm?: boolean } = {}): Promise<WaterReading[]> {
  const query = new URLSearchParams();
  if (filters.start) query.append('start', filters.start);
  if (filters.end) query.append('end', filters.end);
  if (filters.room) query.append('room', filters.room);
  if (filters.warm !== undefined) query.append('warm', String(filters.warm));
  const res = await fetch(`${API_BASE}/readings/water?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch water readings');
  return res.json();
}

export async function getWaterReading(id: number): Promise<WaterReading> {
  const res = await fetch(`${API_BASE}/readings/water/${id}`);
  if (!res.ok) throw new Error('Failed to fetch water reading');
  return res.json();
}

export async function updateWaterReading(id: number, reading: { value: number; comment?: string; date?: string }): Promise<WaterReading> {
  const res = await fetch(`${API_BASE}/readings/water/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading)
  });
  if (!res.ok) throw new Error('Failed to update water reading');
  return res.json();
}

export async function deleteWaterReading(id: number): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/readings/water/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete water reading');
  return res.json();
}

// Gas API
export async function getGasReadings(filters: { start?: string; end?: string; room?: string } = {}): Promise<GasReading[]> {
  const query = new URLSearchParams();
  if (filters.start) query.append('start', filters.start);
  if (filters.end) query.append('end', filters.end);
  if (filters.room) query.append('room', filters.room);
  const res = await fetch(`${API_BASE}/readings/gas?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch gas readings');
  return res.json();
}

export async function getGasReading(id: number): Promise<GasReading> {
  const res = await fetch(`${API_BASE}/readings/gas/${id}`);
  if (!res.ok) throw new Error('Failed to fetch gas reading');
  return res.json();
}

export async function updateGasReading(id: number, reading: { value: number; comment?: string; date?: string }): Promise<GasReading> {
  const res = await fetch(`${API_BASE}/readings/gas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading)
  });
  if (!res.ok) throw new Error('Failed to update gas reading');
  return res.json();
}

export async function deleteGasReading(id: number): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/readings/gas/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete gas reading');
  return res.json();
}

// Calculation APIs
export async function getElectricityCalculations(): Promise<CalculationData> {
  const res = await fetch(`${API_BASE}/calculations/electricity`);
  if (!res.ok) throw new Error('Failed to fetch electricity calculations');
  return res.json();
}

export async function getWaterCalculations(): Promise<CalculationData> {
  const res = await fetch(`${API_BASE}/calculations/water`);
  if (!res.ok) throw new Error('Failed to fetch water calculations');
  return res.json();
}

export async function getGasCalculations(): Promise<CalculationData> {
  const res = await fetch(`${API_BASE}/calculations/gas`);
  if (!res.ok) throw new Error('Failed to fetch gas calculations');
  return res.json();
}

// Reset API
export async function saveResets(resets: MeterResetsInput): Promise<ResetResult> {
  const res = await fetch(`${API_BASE}/readings/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resets)
  });
  if (!res.ok) throw new Error('Failed to save meter resets');
  return res.json();
}

// Date-based Reading Operations API

export async function getReadingsByDate(
  date: string,
  isReset?: boolean
): Promise<ReadingsByDateResponse> {
  const query = new URLSearchParams();
  if (isReset !== undefined) query.append('is_reset', String(isReset));
  const res = await fetch(`${API_BASE}/readings/by-date/${date}?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch readings for date');
  return res.json();
}

export async function countReadingsByDate(
  date: string,
  isReset?: boolean
): Promise<ReadingCounts> {
  const query = new URLSearchParams();
  if (isReset !== undefined) query.append('is_reset', String(isReset));
  const res = await fetch(`${API_BASE}/readings/by-date/${date}/count?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to count readings for date');
  return res.json();
}

export async function getMetersForDate(date: string): Promise<ReadingMetersForDate> {
  const res = await fetch(`${API_BASE}/readings/by-date/${date}/meters`);
  if (!res.ok) throw new Error('Failed to fetch meter names for date');
  return res.json();
}

export async function updateReadingsByDate(
  date: string,
  data: UpdateReadingsByDateData
): Promise<UpdateReadingsResponse> {
  const res = await fetch(`${API_BASE}/readings/by-date/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to update readings');
  }
  return res.json();
}

export async function deleteReadingsByDate(
  date: string,
  isReset?: boolean
): Promise<DeleteReadingsResponse> {
  const query = new URLSearchParams();
  if (isReset !== undefined) query.append('is_reset', String(isReset));
  const res = await fetch(`${API_BASE}/readings/by-date/${date}?${query.toString()}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete readings');
  return res.json();
}

// Maintenance API
export async function reorganizeDatabase(): Promise<ReorganizeResponse> {
  const res = await fetch(`${API_BASE}/maintenance/reorganize`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reorganize database');
  return res.json();
}

export async function listBackups(): Promise<BackupsResponse> {
  const res = await fetch(`${API_BASE}/maintenance/backups`);
  if (!res.ok) throw new Error('Failed to list backups');
  return res.json();
}

export async function restoreFromBackup(backupPath: string): Promise<RestoreResponse> {
  const res = await fetch(`${API_BASE}/maintenance/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backup_path: backupPath })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to restore from backup');
  }
  return res.json();
}

export async function recalculateAllConsumption(): Promise<RecalculateResponse> {
  const res = await fetch(`${API_BASE}/maintenance/recalculate`, {
    method: 'POST'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to recalculate consumption');
  }
  return res.json();
}

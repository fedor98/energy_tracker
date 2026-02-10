import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from models import AppConfig, ElectricityReadingInput, WaterReadingInput, GasReadingInput, MeterResetsInput

DB_PATH = "/app/data/energy.sqlite"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with new table structure."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    c = conn.cursor()
    
    # Config table
    c.execute('''
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    
    # Readings tables - separated by utility type
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings_electricity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            meter_name TEXT NOT NULL,
            meter_id TEXT NOT NULL,
            value REAL NOT NULL,
            comment TEXT,
            is_reset BOOLEAN NOT NULL DEFAULT 0,
            UNIQUE(date, meter_name, meter_id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS readings_water (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            room TEXT NOT NULL,
            meter_id TEXT NOT NULL,
            value REAL NOT NULL,
            is_warm_water BOOLEAN NOT NULL DEFAULT 0,
            comment TEXT,
            is_reset BOOLEAN NOT NULL DEFAULT 0,
            UNIQUE(date, room, is_warm_water, meter_id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS readings_gas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            room TEXT NOT NULL,
            meter_id TEXT NOT NULL,
            value REAL NOT NULL,
            comment TEXT,
            is_reset BOOLEAN NOT NULL DEFAULT 0,
            UNIQUE(date, room, meter_id)
        )
    ''')
    
    # Aggregated consumption data table
    c.execute('''
        CREATE TABLE IF NOT EXISTS consumption_calc (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            meter_id TEXT,
            consumption_value REAL,
            calculation_details TEXT,
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(period, entity_type, entity_id, meter_id)
        )
    ''')
    
    # Create indexes for better performance
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_electricity_date ON readings_electricity(date)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_electricity_period ON readings_electricity(SUBSTR(date, 1, 7))
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_electricity_meter ON readings_electricity(meter_name)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_electricity_meter_id ON readings_electricity(meter_id)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_date ON readings_water(date)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_period ON readings_water(SUBSTR(date, 1, 7))
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_room ON readings_water(room)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_meter_id ON readings_water(meter_id)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_gas_date ON readings_gas(date)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_gas_period ON readings_gas(SUBSTR(date, 1, 7))
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_gas_room ON readings_gas(room)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_gas_meter_id ON readings_gas(meter_id)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_consumption_period ON consumption_calc(period)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_consumption_meter_id ON consumption_calc(meter_id)
    ''')
    
    conn.commit()
    conn.close()


def _calculate_consumption_from_readings(readings: List[Dict[str, Any]]) -> tuple:
    """
    Calculate consumption from a list of readings.
    Returns (total_consumption, calculation_details_dict, segment_count)
    
    Each reading should have: date, value, comment
    """
    import json
    
    if len(readings) < 2:
        return None, None, 0
    
    segments = []
    total_consumption = 0.0
    segment_count = 0
    
    # Build segments list with all readings
    for reading in readings:
        comment_val = reading['comment'] if 'comment' in reading.keys() else ''
        segments.append({
            "date": reading['date'],
            "value": reading['value'],
            "comment": comment_val or ''
        })
    
    # Calculate consumption for each consecutive pair
    for i in range(len(readings) - 1):
        current_value = readings[i]['value']
        next_value = readings[i + 1]['value']
        
        diff = next_value - current_value
        
        if diff < 0:
            # Reset detected - new meter starts at next_value
            consumption = next_value
        else:
            consumption = diff
        
        total_consumption += consumption
        segment_count += 1
    
    calculation_details = {
        "segments": segments,
        "total_consumption": total_consumption,
        "segment_count": segment_count,
        "first_reading_date": readings[0]['date'],
        "last_reading_date": readings[-1]['date']
    }
    
    return total_consumption, calculation_details, segment_count


def _calculate_electricity_consumption(conn, meter_name: str, date: str):
    """Calculate and store electricity consumption for a specific period."""
    import json
    c = conn.cursor()
    period = date[:7]  # YYYY-MM from YYYY-MM-DD
    
    # Get meter_id for this meter
    c.execute('''
        SELECT meter_id FROM readings_electricity
        WHERE meter_name = ?
        LIMIT 1
    ''', (meter_name,))
    meter_row = c.fetchone()
    meter_id = meter_row['meter_id'] if meter_row else None
    
    # Delete old calculation
    c.execute('''
        DELETE FROM consumption_calc 
        WHERE period = ? AND entity_type = 'electricity' AND entity_id = ? AND meter_id = ?
    ''', (period, meter_name, meter_id))
    
    # Get all readings for the period
    c.execute('''
        SELECT date, value, comment FROM readings_electricity 
        WHERE meter_name = ? AND SUBSTR(date, 1, 7) = ?
        ORDER BY date ASC
    ''', (meter_name, period))
    period_readings = c.fetchall()
    
    if len(period_readings) == 0:
        conn.commit()
        return
    
    # Get first reading of next period (needed for last segment calculation)
    c.execute('''
        SELECT date, value, comment FROM readings_electricity 
        WHERE meter_name = ? AND date >= ?
        ORDER BY date ASC LIMIT 1
    ''', (meter_name, f"{period}-32"))  # Day 32 ensures we're in next month
    next_period_reading = c.fetchone()
    
    # Combine readings: period readings + next period's first reading
    all_readings = list(period_readings)
    if next_period_reading:
        all_readings.append(next_period_reading)
    
    # Calculate consumption
    consumption, calc_details, segment_count = _calculate_consumption_from_readings(all_readings)
    
    # Insert calculation result
    calc_details_json = json.dumps(calc_details) if calc_details else None
    c.execute('''
        INSERT INTO consumption_calc (period, entity_type, entity_id, meter_id, consumption_value, calculation_details)
        VALUES (?, 'electricity', ?, ?, ?, ?)
    ''', (period, meter_name, meter_id, consumption, calc_details_json))
    
    conn.commit()

def _calculate_water_consumption(conn, room: str, date: str, is_warm_water = None):
    """Calculate and store water consumption for a specific period.
    
    Args:
        conn: Database connection
        room: Room name
        date: Date in YYYY-MM-DD format
        is_warm_water: If specified, only calculate for this type (True=warm, False=cold, None=both)
    """
    import json
    c = conn.cursor()
    period = date[:7]  # YYYY-MM from YYYY-MM-DD
    
    # Determine which water types to calculate
    water_types = []
    if is_warm_water is None or is_warm_water is True:
        water_types.append(('water_warm', 1))
    if is_warm_water is None or is_warm_water is False:
        water_types.append(('water_cold', 0))
    
    for entity_type, is_warm in water_types:
        # Get meter_id for this room and type
        c.execute('''
            SELECT meter_id FROM readings_water
            WHERE room = ? AND is_warm_water = ?
            LIMIT 1
        ''', (room, is_warm))
        meter_row = c.fetchone()
        meter_id = meter_row['meter_id'] if meter_row else None
        
        # Delete old calculation for this type
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_id = ? AND entity_type = ? AND meter_id = ?
        ''', (period, room, entity_type, meter_id))
        
        # Get all readings for the period and type
        c.execute('''
            SELECT date, value, comment FROM readings_water 
            WHERE room = ? AND is_warm_water = ? AND SUBSTR(date, 1, 7) = ?
            ORDER BY date ASC
        ''', (room, is_warm, period))
        period_readings = c.fetchall()
        
        if len(period_readings) == 0:
            continue
        
        # Get first reading of next period
        c.execute('''
            SELECT date, value, comment FROM readings_water 
            WHERE room = ? AND is_warm_water = ? AND date >= ?
            ORDER BY date ASC LIMIT 1
        ''', (room, is_warm, f"{period}-32"))
        next_period_reading = c.fetchone()
        
        # Build readings list
        all_readings = list(period_readings)
        if next_period_reading:
            all_readings.append({
                'date': next_period_reading['date'],
                'value': next_period_reading['value'],
                'comment': next_period_reading['comment'] or ''
            })
        
        # Calculate consumption
        consumption, calc_details, _ = _calculate_consumption_from_readings(all_readings)
        
        # Insert calculation result
        calc_details_json = json.dumps(calc_details) if calc_details else None
        c.execute('''
            INSERT INTO consumption_calc (period, entity_type, entity_id, meter_id, consumption_value, calculation_details)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (period, entity_type, room, meter_id, consumption, calc_details_json))
    
    # Note: water_total is now calculated dynamically in the API layer
    # No need to store it in the database anymore
    
    conn.commit()

def _calculate_gas_consumption(conn, room: str, date: str):
    """Calculate and store gas consumption for a specific period."""
    import json
    c = conn.cursor()
    period = date[:7]  # YYYY-MM from YYYY-MM-DD
    
    # Get meter_id for this room
    c.execute('''
        SELECT meter_id FROM readings_gas
        WHERE room = ?
        LIMIT 1
    ''', (room,))
    meter_row = c.fetchone()
    meter_id = meter_row['meter_id'] if meter_row else None
    
    # Delete old calculation
    c.execute('''
        DELETE FROM consumption_calc 
        WHERE period = ? AND entity_type = 'gas' AND entity_id = ? AND meter_id = ?
    ''', (period, room, meter_id))
    
    # Get all readings for the period
    c.execute('''
        SELECT date, value, comment FROM readings_gas 
        WHERE room = ? AND SUBSTR(date, 1, 7) = ?
        ORDER BY date ASC
    ''', (room, period))
    period_readings = c.fetchall()
    
    if len(period_readings) == 0:
        conn.commit()
        return
    
    # Get first reading of next period
    c.execute('''
        SELECT date, value, comment FROM readings_gas 
        WHERE room = ? AND date >= ?
        ORDER BY date ASC LIMIT 1
    ''', (room, f"{period}-32"))
    next_period_reading = c.fetchone()
    
    # Combine readings
    all_readings = list(period_readings)
    if next_period_reading:
        all_readings.append(next_period_reading)
    
    # Calculate consumption
    consumption, calc_details, segment_count = _calculate_consumption_from_readings(all_readings)
    
    # Insert calculation result
    calc_details_json = json.dumps(calc_details) if calc_details else None
    c.execute('''
        INSERT INTO consumption_calc (period, entity_type, entity_id, meter_id, consumption_value, calculation_details)
        VALUES (?, 'gas', ?, ?, ?, ?)
    ''', (period, room, meter_id, consumption, calc_details_json))
    
    conn.commit()

def save_config(config: AppConfig):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', 
              ('app_config', config.model_dump_json()))
    conn.commit()
    conn.close()

def get_config() -> Optional[AppConfig]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT value FROM config WHERE key = ?', ('app_config',))
    row = c.fetchone()
    conn.close()
    
    if row:
        return AppConfig.model_validate_json(row['value'])
    return None

# Electricity CRUD Operations
def save_electricity_reading(reading: ElectricityReadingInput) -> int:
    """Save or update an electricity reading. Returns the reading ID."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        INSERT INTO readings_electricity (date, meter_name, meter_id, value, comment)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(date, meter_name, meter_id) DO UPDATE SET
            value = excluded.value,
            comment = excluded.comment
        RETURNING id
    ''', (reading.date, reading.meter_name, reading.meter_id, reading.value, reading.comment))
    
    result = c.fetchone()
    conn.commit()
    
    # Calculate consumption for current month
    _calculate_electricity_consumption(conn, reading.meter_name, reading.date)
    
    # Also recalculate previous month (if it has data)
    from datetime import datetime
    current_date = datetime.strptime(reading.date, '%Y-%m-%d')
    if current_date.month == 1:
        prev_year = current_date.year - 1
        prev_month = 12
    else:
        prev_year = current_date.year
        prev_month = current_date.month - 1
    prev_period = f"{prev_year:04d}-{prev_month:02d}"
    
    c.execute('''
        SELECT 1 FROM readings_electricity 
        WHERE meter_name = ? AND SUBSTR(date, 1, 7) = ?
        LIMIT 1
    ''', (reading.meter_name, prev_period))
    if c.fetchone():
        _calculate_electricity_consumption(conn, reading.meter_name, f"{prev_period}-01")
    
    conn.close()
    
    return result['id']

def get_electricity_reading(id: int) -> Optional[Dict[str, Any]]:
    """Get a single electricity reading by ID."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        SELECT e.*,
            SUBSTR(e.date, 1, 7) as period,
            c.consumption_value as consumption,
            c.calculation_details
        FROM readings_electricity e
        LEFT JOIN consumption_calc c ON SUBSTR(e.date, 1, 7) = c.period
            AND c.entity_type = 'electricity'
            AND c.entity_id = e.meter_name
            AND c.meter_id = e.meter_id
        WHERE e.id = ?
    ''', (id,))
    
    row = c.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_electricity_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None,
    meter_name: Optional[str] = None,
    meter_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get electricity readings with optional filters."""
    conn = get_db_connection()
    c = conn.cursor()

    query = '''
        SELECT e.*,
            SUBSTR(e.date, 1, 7) as period,
            c.consumption_value as consumption,
            c.calculation_details
        FROM readings_electricity e
        LEFT JOIN consumption_calc c ON SUBSTR(e.date, 1, 7) = c.period
            AND c.entity_type = 'electricity'
            AND c.entity_id = e.meter_name
            AND c.meter_id = e.meter_id
        WHERE 1=1
    '''
    params = []

    if start_period:
        query += " AND SUBSTR(e.date, 1, 7) >= ?"
        params.append(start_period)
    if end_period:
        query += " AND SUBSTR(e.date, 1, 7) <= ?"
        params.append(end_period)
    if meter_name:
        query += " AND e.meter_name = ?"
        params.append(meter_name)
    if meter_id:
        query += " AND e.meter_id = ?"
        params.append(meter_id)

    query += " ORDER BY e.date DESC, e.meter_name"
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def update_electricity_reading(id: int, reading: ElectricityReadingInput) -> bool:
    """Update an existing electricity reading."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        UPDATE readings_electricity
        SET date = ?, meter_name = ?, meter_id = ?, value = ?, comment = ?
        WHERE id = ?
    ''', (reading.date, reading.meter_name, reading.meter_id, reading.value, reading.comment, id))
    
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        # Recalculate consumption
        _calculate_electricity_consumption(conn, reading.meter_name, reading.date)
    
    conn.close()
    
    return updated

def delete_electricity_reading(id: int) -> bool:
    """Delete an electricity reading."""
    conn = get_db_connection()
    c = conn.cursor()

    # Get reading info before deleting
    c.execute("SELECT meter_name, meter_id, date FROM readings_electricity WHERE id = ?", (id,))
    reading = c.fetchone()

    c.execute("DELETE FROM readings_electricity WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()

    if deleted and reading:
        # Recalculate consumption for this meter
        _calculate_electricity_consumption(conn, reading['meter_name'], reading['date'])
        
        # Also recalculate previous month since the deleted reading
        # might have been the "next period" data needed for calculation
        from datetime import datetime
        current_date = datetime.strptime(reading['date'], '%Y-%m-%d')
        if current_date.month == 1:
            prev_year = current_date.year - 1
            prev_month = 12
        else:
            prev_year = current_date.year
            prev_month = current_date.month - 1
        prev_period = f"{prev_year:04d}-{prev_month:02d}"
        
        # Check if there are readings for the previous month
        c.execute('''
            SELECT 1 FROM readings_electricity 
            WHERE meter_name = ? AND SUBSTR(date, 1, 7) = ?
            LIMIT 1
        ''', (reading['meter_name'], prev_period))
        if c.fetchone():
            _calculate_electricity_consumption(conn, reading['meter_name'], f"{prev_period}-01")

    conn.close()

    return deleted

# Water CRUD Operations
def save_water_reading(reading: WaterReadingInput) -> int:
    """Save or update a water reading. Returns the reading ID."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        INSERT INTO readings_water (date, room, meter_id, value, is_warm_water, comment)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(date, room, is_warm_water, meter_id) DO UPDATE SET
            value = excluded.value,
            comment = excluded.comment
        RETURNING id
    ''', (reading.date, reading.room, reading.meter_id, reading.value, reading.is_warm_water, reading.comment))
    
    result = c.fetchone()
    conn.commit()
    
    # Calculate consumption for current month
    _calculate_water_consumption(conn, reading.room, reading.date, reading.is_warm_water)
    
    # Also recalculate previous month (if it has data) since the new reading
    # provides the "next period" data needed for the previous month's calculation
    from datetime import datetime
    current_date = datetime.strptime(reading.date, '%Y-%m-%d')
    if current_date.month == 1:
        prev_year = current_date.year - 1
        prev_month = 12
    else:
        prev_year = current_date.year
        prev_month = current_date.month - 1
    prev_period = f"{prev_year:04d}-{prev_month:02d}"
    
    # Check if there are readings for the previous month
    c.execute('''
        SELECT 1 FROM readings_water 
        WHERE room = ? AND is_warm_water = ? AND SUBSTR(date, 1, 7) = ?
        LIMIT 1
    ''', (reading.room, reading.is_warm_water, prev_period))
    if c.fetchone():
        # Recalculate previous month with the first day of that month
        _calculate_water_consumption(conn, reading.room, f"{prev_period}-01", reading.is_warm_water)
    
    conn.close()
    
    return result['id']

def get_water_reading(id: int) -> Optional[Dict[str, Any]]:
    """Get a single water reading by ID."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        SELECT w.*,
            SUBSTR(w.date, 1, 7) as period,
            c.calculation_details,
            warm_agg.consumption_value as warm_water_consumption,
            cold_agg.consumption_value as cold_water_consumption,
            COALESCE(warm_agg.consumption_value, 0) + COALESCE(cold_agg.consumption_value, 0) as total_water_consumption
        FROM readings_water w
        LEFT JOIN consumption_calc c ON SUBSTR(w.date, 1, 7) = c.period
            AND c.entity_type = CASE WHEN w.is_warm_water = 1 THEN 'water_warm' ELSE 'water_cold' END
            AND c.entity_id = w.room
            AND c.meter_id = w.meter_id
        LEFT JOIN consumption_calc warm_agg ON SUBSTR(w.date, 1, 7) = warm_agg.period
            AND warm_agg.entity_type = 'water_warm'
            AND warm_agg.entity_id = w.room
            AND warm_agg.meter_id = w.meter_id
        LEFT JOIN consumption_calc cold_agg ON SUBSTR(w.date, 1, 7) = cold_agg.period
            AND cold_agg.entity_type = 'water_cold'
            AND cold_agg.entity_id = w.room
            AND cold_agg.meter_id = w.meter_id
        WHERE w.id = ?
    ''', (id,))
    
    row = c.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_water_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None,
    room: Optional[str] = None,
    is_warm_water: Optional[bool] = None,
    meter_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get water readings with optional filters."""
    conn = get_db_connection()
    c = conn.cursor()

    query = '''
        SELECT w.*,
            SUBSTR(w.date, 1, 7) as period,
            c.calculation_details,
            warm_agg.consumption_value as warm_water_consumption,
            cold_agg.consumption_value as cold_water_consumption,
            COALESCE(warm_agg.consumption_value, 0) + COALESCE(cold_agg.consumption_value, 0) as total_water_consumption
        FROM readings_water w
        LEFT JOIN consumption_calc c ON SUBSTR(w.date, 1, 7) = c.period
            AND c.entity_type = CASE WHEN w.is_warm_water = 1 THEN 'water_warm' ELSE 'water_cold' END
            AND c.entity_id = w.room
            AND c.meter_id = w.meter_id
        LEFT JOIN consumption_calc warm_agg ON SUBSTR(w.date, 1, 7) = warm_agg.period
            AND warm_agg.entity_type = 'water_warm'
            AND warm_agg.entity_id = w.room
            AND warm_agg.meter_id = w.meter_id
        LEFT JOIN consumption_calc cold_agg ON SUBSTR(w.date, 1, 7) = cold_agg.period
            AND cold_agg.entity_type = 'water_cold'
            AND cold_agg.entity_id = w.room
            AND cold_agg.meter_id = w.meter_id
        WHERE 1=1
    '''
    params = []

    if start_period:
        query += " AND SUBSTR(w.date, 1, 7) >= ?"
        params.append(start_period)
    if end_period:
        query += " AND SUBSTR(w.date, 1, 7) <= ?"
        params.append(end_period)
    if room:
        query += " AND w.room = ?"
        params.append(room)
    if is_warm_water is not None:
        query += " AND w.is_warm_water = ?"
        params.append(1 if is_warm_water else 0)
    if meter_id:
        query += " AND w.meter_id = ?"
        params.append(meter_id)

    query += " ORDER BY w.date DESC, w.room, w.is_warm_water"
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def update_water_reading(id: int, reading: WaterReadingInput) -> bool:
    """Update an existing water reading."""
    conn = get_db_connection()
    c = conn.cursor()

    # Get current reading to check if room/date changed
    c.execute("SELECT room, date, is_warm_water, meter_id FROM readings_water WHERE id = ?", (id,))
    old_reading = c.fetchone()

    c.execute('''
        UPDATE readings_water
        SET date = ?, room = ?, meter_id = ?, value = ?, is_warm_water = ?, comment = ?
        WHERE id = ?
    ''', (reading.date, reading.room, reading.meter_id, reading.value, reading.is_warm_water, reading.comment, id))
    
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        # Recalculate consumption for new room/type
        _calculate_water_consumption(conn, reading.room, reading.date, reading.is_warm_water)
        
        # If room or type changed, recalculate old room/type too
        if old_reading and (old_reading['room'] != reading.room or old_reading['is_warm_water'] != reading.is_warm_water):
            _calculate_water_consumption(conn, old_reading['room'], old_reading['date'], old_reading['is_warm_water'])
    
    conn.close()
    
    return updated

def delete_water_reading(id: int) -> bool:
    """Delete a water reading."""
    conn = get_db_connection()
    c = conn.cursor()

    # Get reading info before deleting
    c.execute("SELECT room, date, is_warm_water, meter_id FROM readings_water WHERE id = ?", (id,))
    reading = c.fetchone()

    c.execute("DELETE FROM readings_water WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()

    if deleted and reading:
        # Recalculate consumption for this room and type
        _calculate_water_consumption(conn, reading['room'], reading['date'], reading['is_warm_water'])
        
        # Also recalculate previous month since the deleted reading
        # might have been the "next period" data needed for calculation
        from datetime import datetime
        current_date = datetime.strptime(reading['date'], '%Y-%m-%d')
        if current_date.month == 1:
            prev_year = current_date.year - 1
            prev_month = 12
        else:
            prev_year = current_date.year
            prev_month = current_date.month - 1
        prev_period = f"{prev_year:04d}-{prev_month:02d}"
        
        # Check if there are readings for the previous month
        c.execute('''
            SELECT 1 FROM readings_water 
            WHERE room = ? AND is_warm_water = ? AND SUBSTR(date, 1, 7) = ?
            LIMIT 1
        ''', (reading['room'], reading['is_warm_water'], prev_period))
        if c.fetchone():
            _calculate_water_consumption(conn, reading['room'], f"{prev_period}-01", reading['is_warm_water'])

    conn.close()

    return deleted

# Gas CRUD Operations
def save_gas_reading(reading: GasReadingInput) -> int:
    """Save or update a gas reading. Returns the reading ID."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        INSERT INTO readings_gas (date, room, meter_id, value, comment)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(date, room, meter_id) DO UPDATE SET
            value = excluded.value,
            comment = excluded.comment
        RETURNING id
    ''', (reading.date, reading.room, reading.meter_id, reading.value, reading.comment))
    
    result = c.fetchone()
    conn.commit()
    
    # Calculate consumption for current month
    _calculate_gas_consumption(conn, reading.room, reading.date)
    
    # Also recalculate previous month (if it has data)
    from datetime import datetime
    current_date = datetime.strptime(reading.date, '%Y-%m-%d')
    if current_date.month == 1:
        prev_year = current_date.year - 1
        prev_month = 12
    else:
        prev_year = current_date.year
        prev_month = current_date.month - 1
    prev_period = f"{prev_year:04d}-{prev_month:02d}"
    
    c.execute('''
        SELECT 1 FROM readings_gas 
        WHERE room = ? AND SUBSTR(date, 1, 7) = ?
        LIMIT 1
    ''', (reading.room, prev_period))
    if c.fetchone():
        _calculate_gas_consumption(conn, reading.room, f"{prev_period}-01")
    
    conn.close()
    
    return result['id']


def get_gas_reading(id: int) -> Optional[Dict[str, Any]]:
    """Get a single gas reading by ID."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        SELECT g.*,
            SUBSTR(g.date, 1, 7) as period,
            c.consumption_value as consumption,
            c.calculation_details
        FROM readings_gas g
        LEFT JOIN consumption_calc c ON SUBSTR(g.date, 1, 7) = c.period
            AND c.entity_type = 'gas'
            AND c.entity_id = g.room
            AND c.meter_id = g.meter_id
        WHERE g.id = ?
    ''', (id,))
    
    row = c.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_gas_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None,
    room: Optional[str] = None,
    meter_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get gas readings with optional filters."""
    conn = get_db_connection()
    c = conn.cursor()

    query = '''
        SELECT g.*,
            SUBSTR(g.date, 1, 7) as period,
            c.consumption_value as consumption,
            c.calculation_details
        FROM readings_gas g
        LEFT JOIN consumption_calc c ON SUBSTR(g.date, 1, 7) = c.period
            AND c.entity_type = 'gas'
            AND c.entity_id = g.room
            AND c.meter_id = g.meter_id
        WHERE 1=1
    '''
    params = []

    if start_period:
        query += " AND SUBSTR(g.date, 1, 7) >= ?"
        params.append(start_period)
    if end_period:
        query += " AND SUBSTR(g.date, 1, 7) <= ?"
        params.append(end_period)
    if room:
        query += " AND g.room = ?"
        params.append(room)
    if meter_id:
        query += " AND g.meter_id = ?"
        params.append(meter_id)

    query += " ORDER BY g.date DESC, g.room"
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def update_gas_reading(id: int, reading: GasReadingInput) -> bool:
    """Update an existing gas reading."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('''
        UPDATE readings_gas
        SET date = ?, room = ?, meter_id = ?, value = ?, comment = ?
        WHERE id = ?
    ''', (reading.date, reading.room, reading.meter_id, reading.value, reading.comment, id))
    
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        # Recalculate consumption
        _calculate_gas_consumption(conn, reading.room, reading.date)
    
    conn.close()
    
    return updated

def delete_gas_reading(id: int) -> bool:
    """Delete a gas reading."""
    conn = get_db_connection()
    c = conn.cursor()

    # Get reading info before deleting
    c.execute("SELECT room, date, meter_id FROM readings_gas WHERE id = ?", (id,))
    reading = c.fetchone()

    c.execute("DELETE FROM readings_gas WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()

    if deleted and reading:
        # Recalculate consumption for this room
        _calculate_gas_consumption(conn, reading['room'], reading['date'])
        
        # Also recalculate previous month since the deleted reading
        # might have been the "next period" data needed for calculation
        from datetime import datetime
        current_date = datetime.strptime(reading['date'], '%Y-%m-%d')
        if current_date.month == 1:
            prev_year = current_date.year - 1
            prev_month = 12
        else:
            prev_year = current_date.year
            prev_month = current_date.month - 1
        prev_period = f"{prev_year:04d}-{prev_month:02d}"
        
        # Check if there are readings for the previous month
        c.execute('''
            SELECT 1 FROM readings_gas 
            WHERE room = ? AND SUBSTR(date, 1, 7) = ?
            LIMIT 1
        ''', (reading['room'], prev_period))
        if c.fetchone():
            _calculate_gas_consumption(conn, reading['room'], f"{prev_period}-01")

    conn.close()

    return deleted

# Combined queries
def get_monthly_readings(period: str) -> Dict[str, List[Dict[str, Any]]]:
    """Get all readings for a specific month across all utility types."""
    return {
        'electricity': get_electricity_readings(start_period=period, end_period=period),
        'water': get_water_readings(start_period=period, end_period=period),
        'gas': get_gas_readings(start_period=period, end_period=period)
    }


def get_calculation_details_by_type(entity_type: str) -> Dict[str, Any]:
    """
    Get calculation details grouped by period for a specific entity type.
    Returns periods with all meters and their consumption/segment counts.
    
    entity_type: 'electricity', 'gas', 'water_warm', or 'water_cold'
    """
    import json
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get all calculations for this entity type
    c.execute('''
        SELECT period, entity_id, consumption_value, calculation_details
        FROM consumption_calc
        WHERE entity_type = ?
        ORDER BY period DESC, entity_id
    ''', (entity_type,))
    
    rows = c.fetchall()
    conn.close()
    
    # Group by period
    periods = {}
    for row in rows:
        period = row['period']
        if period not in periods:
            periods[period] = []
        
        # Parse calculation_details to get segment count
        segment_count = 0
        if row['calculation_details']:
            try:
                calc_details = json.loads(row['calculation_details'])
                segment_count = calc_details.get('segment_count', 0)
            except:
                pass
        
        periods[period].append({
            'entity_id': row['entity_id'],
            'consumption': row['consumption_value'],
            'segments': segment_count
        })
    
    # Convert to sorted list
    sorted_periods = sorted(periods.keys(), reverse=True)
    result = {
        'periods': [
            {
                'period': period,
                'meters': periods[period]
            }
            for period in sorted_periods
        ]
    }
    
    return result

def backup_and_reset_db():
    import datetime
    import shutil
    
    if os.path.exists(DB_PATH):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{DB_PATH}_backup_{timestamp}.sqlite"
        shutil.move(DB_PATH, backup_path)
        
    init_db()

def reorganize_tables():
    """
    Reorganize all readings tables to have newest entries first.
    This recreates the tables with DESC ordering to optimize for newest-first queries.
    """
    import datetime
    import shutil

    backup_path = None

    # Create backup first
    if os.path.exists(DB_PATH):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{DB_PATH}_reorg_backup_{timestamp}.sqlite"
        shutil.copy2(DB_PATH, backup_path)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Reorganize readings_electricity
        c.execute('''
            CREATE TABLE readings_electricity_new AS
            SELECT * FROM readings_electricity
            ORDER BY date DESC, meter_name, meter_id
        ''')
        c.execute('DROP TABLE readings_electricity')
        c.execute('ALTER TABLE readings_electricity_new RENAME TO readings_electricity')

        # Reorganize readings_water
        c.execute('''
            CREATE TABLE readings_water_new AS
            SELECT * FROM readings_water
            ORDER BY date DESC, room, is_warm_water, meter_id
        ''')
        c.execute('DROP TABLE readings_water')
        c.execute('ALTER TABLE readings_water_new RENAME TO readings_water')

        # Reorganize readings_gas
        c.execute('''
            CREATE TABLE readings_gas_new AS
            SELECT * FROM readings_gas
            ORDER BY date DESC, room, meter_id
        ''')
        c.execute('DROP TABLE readings_gas')
        c.execute('ALTER TABLE readings_gas_new RENAME TO readings_gas')

        # Reorganize consumption_calc
        c.execute('''
            CREATE TABLE consumption_calc_new AS
            SELECT * FROM consumption_calc
            ORDER BY period DESC, entity_type, entity_id
        ''')
        c.execute('DROP TABLE consumption_calc')
        c.execute('ALTER TABLE consumption_calc_new RENAME TO consumption_calc')

        # Recreate indexes
        c.execute('CREATE INDEX idx_electricity_date ON readings_electricity(date)')
        c.execute('CREATE INDEX idx_electricity_period ON readings_electricity(SUBSTR(date, 1, 7))')
        c.execute('CREATE INDEX idx_electricity_meter ON readings_electricity(meter_name)')
        c.execute('CREATE INDEX idx_electricity_meter_id ON readings_electricity(meter_id)')
        c.execute('CREATE INDEX idx_water_date ON readings_water(date)')
        c.execute('CREATE INDEX idx_water_period ON readings_water(SUBSTR(date, 1, 7))')
        c.execute('CREATE INDEX idx_water_room ON readings_water(room)')
        c.execute('CREATE INDEX idx_water_meter_id ON readings_water(meter_id)')
        c.execute('CREATE INDEX idx_gas_date ON readings_gas(date)')
        c.execute('CREATE INDEX idx_gas_period ON readings_gas(SUBSTR(date, 1, 7))')
        c.execute('CREATE INDEX idx_gas_room ON readings_gas(room)')
        c.execute('CREATE INDEX idx_gas_meter_id ON readings_gas(meter_id)')
        c.execute('CREATE INDEX idx_consumption_period ON consumption_calc(period)')
        c.execute('CREATE INDEX idx_consumption_meter_id ON consumption_calc(meter_id)')

        conn.commit()
        return {"status": "success", "message": "Tables reorganized successfully", "backup_created": backup_path}
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def save_meter_resets(resets: MeterResetsInput) -> Dict[str, Any]:
    """
    Save meter resets by creating two entries for each reset:
    1. The last reading before reset
    2. The reset value (new meter starting value)
    
    A 1-minute time difference ensures proper ordering.
    Returns status and count of created readings.
    """
    from datetime import datetime, timedelta
    
    conn = get_db_connection()
    c = conn.cursor()
    created_count = 0
    
    try:
        base_date = datetime.strptime(resets.date, '%Y-%m-%d')
        
        # Process electricity resets
        for reset in resets.electricity:
            # Entry 1: Last reading at base time
            c.execute('''
                INSERT INTO readings_electricity (date, meter_name, meter_id, value, comment, is_reset)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, meter_name, meter_id) DO UPDATE SET
                    value = excluded.value,
                    comment = excluded.comment,
                    is_reset = excluded.is_reset
            ''', (
                base_date.strftime('%Y-%m-%d %H:%M:%S'),
                reset.meter_name,
                reset.meter_id,
                reset.last_reading,
                'Pre-reset reading (last value before meter replacement)',
                1
            ))
            created_count += 1
            
            # Entry 2: Reset value at base time + 1 minute
            reset_time = base_date + timedelta(minutes=1)
            c.execute('''
                INSERT INTO readings_electricity (date, meter_name, meter_id, value, comment, is_reset)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, meter_name, meter_id) DO UPDATE SET
                    value = excluded.value,
                    comment = excluded.comment,
                    is_reset = excluded.is_reset
            ''', (
                reset_time.strftime('%Y-%m-%d %H:%M:%S'),
                reset.meter_name,
                reset.meter_id,
                reset.reset_value,
                'Reset reading (new meter starting value)',
                1
            ))
            created_count += 1
            
            # Recalculate consumption for this meter
            _calculate_electricity_consumption(conn, reset.meter_name, base_date.strftime('%Y-%m-%d'))
        
        # Process water resets
        for reset in resets.water:
            # Entry 1: Last reading at base time
            c.execute('''
                INSERT INTO readings_water (date, room, meter_id, value, is_warm_water, comment, is_reset)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, room, is_warm_water, meter_id) DO UPDATE SET
                    value = excluded.value,
                    comment = excluded.comment,
                    is_reset = excluded.is_reset
            ''', (
                base_date.strftime('%Y-%m-%d %H:%M:%S'),
                reset.room,
                reset.meter_id,
                reset.last_reading,
                reset.is_warm_water,
                'Pre-reset reading (last value before meter replacement)',
                1
            ))
            created_count += 1
            
            # Entry 2: Reset value at base time + 1 minute
            reset_time = base_date + timedelta(minutes=1)
            c.execute('''
                INSERT INTO readings_water (date, room, meter_id, value, is_warm_water, comment, is_reset)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, room, is_warm_water, meter_id) DO UPDATE SET
                    value = excluded.value,
                    comment = excluded.comment,
                    is_reset = excluded.is_reset
            ''', (
                reset_time.strftime('%Y-%m-%d %H:%M:%S'),
                reset.room,
                reset.meter_id,
                reset.reset_value,
                reset.is_warm_water,
                'Reset reading (new meter starting value)',
                1
            ))
            created_count += 1
            
            # Recalculate consumption for this meter
            _calculate_water_consumption(conn, reset.room, base_date.strftime('%Y-%m-%d'), reset.is_warm_water)
        
        # Process gas resets
        for reset in resets.gas:
            # Entry 1: Last reading at base time
            c.execute('''
                INSERT INTO readings_gas (date, room, meter_id, value, comment, is_reset)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, room, meter_id) DO UPDATE SET
                    value = excluded.value,
                    comment = excluded.comment,
                    is_reset = excluded.is_reset
            ''', (
                base_date.strftime('%Y-%m-%d %H:%M:%S'),
                reset.room,
                reset.meter_id,
                reset.last_reading,
                'Pre-reset reading (last value before meter replacement)',
                1
            ))
            created_count += 1
            
            # Entry 2: Reset value at base time + 1 minute
            reset_time = base_date + timedelta(minutes=1)
            c.execute('''
                INSERT INTO readings_gas (date, room, meter_id, value, comment, is_reset)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, room, meter_id) DO UPDATE SET
                    value = excluded.value,
                    comment = excluded.comment,
                    is_reset = excluded.is_reset
            ''', (
                reset_time.strftime('%Y-%m-%d %H:%M:%S'),
                reset.room,
                reset.meter_id,
                reset.reset_value,
                'Reset reading (new meter starting value)',
                1
            ))
            created_count += 1
            
            # Recalculate consumption for this meter
            _calculate_gas_consumption(conn, reset.room, base_date.strftime('%Y-%m-%d'))
        
        conn.commit()
        return {
            "status": "success",
            "message": f"Successfully created {created_count} reset readings",
            "created_readings": created_count
        }
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# Date-based Reading Operations
def get_readings_by_date(date: str, is_reset: Optional[bool] = None) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all readings for a specific date across all utility types.
    
    Args:
        date: Date in YYYY-MM-DD format
        is_reset: If True, only get reset readings. If False, exclude reset readings.
                  If None, get all readings.
    
    Returns:
        Dictionary with electricity, water, and gas readings for the date
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Build WHERE clause for is_reset filter
    reset_filter = ""
    params: List[Any] = [f"{date}%"]  # Match date prefix for datetime format
    
    if is_reset is not None:
        reset_filter = " AND e.is_reset = ?"
        params.append(1 if is_reset else 0)
    
    # Get electricity readings
    c.execute(f'''
        SELECT e.*,
            SUBSTR(e.date, 1, 7) as period,
            c.consumption_value as consumption,
            c.calculation_details
        FROM readings_electricity e
        LEFT JOIN consumption_calc c ON SUBSTR(e.date, 1, 7) = c.period
            AND c.entity_type = 'electricity'
            AND c.entity_id = e.meter_name
            AND c.meter_id = e.meter_id
        WHERE e.date LIKE ?{reset_filter}
        ORDER BY e.date, e.meter_name
    ''', params)
    electricity = [dict(row) for row in c.fetchall()]
    
    # Get water readings
    params_water: List[Any] = [f"{date}%"]
    if is_reset is not None:
        reset_filter_water = " AND w.is_reset = ?"
        params_water.append(1 if is_reset else 0)
    else:
        reset_filter_water = ""
    
    c.execute(f'''
        SELECT w.*,
            SUBSTR(w.date, 1, 7) as period,
            c.calculation_details,
            warm_agg.consumption_value as warm_water_consumption,
            cold_agg.consumption_value as cold_water_consumption,
            COALESCE(warm_agg.consumption_value, 0) + COALESCE(cold_agg.consumption_value, 0) as total_water_consumption
        FROM readings_water w
        LEFT JOIN consumption_calc c ON SUBSTR(w.date, 1, 7) = c.period
            AND c.entity_type = CASE WHEN w.is_warm_water = 1 THEN 'water_warm' ELSE 'water_cold' END
            AND c.entity_id = w.room
            AND c.meter_id = w.meter_id
        LEFT JOIN consumption_calc warm_agg ON SUBSTR(w.date, 1, 7) = warm_agg.period
            AND warm_agg.entity_type = 'water_warm'
            AND warm_agg.entity_id = w.room
            AND warm_agg.meter_id = w.meter_id
        LEFT JOIN consumption_calc cold_agg ON SUBSTR(w.date, 1, 7) = cold_agg.period
            AND cold_agg.entity_type = 'water_cold'
            AND cold_agg.entity_id = w.room
            AND cold_agg.meter_id = w.meter_id
        WHERE w.date LIKE ?{reset_filter_water}
        ORDER BY w.date, w.room, w.is_warm_water
    ''', params_water)
    water = [dict(row) for row in c.fetchall()]
    
    # Get gas readings
    params_gas: List[Any] = [f"{date}%"]
    if is_reset is not None:
        reset_filter_gas = " AND g.is_reset = ?"
        params_gas.append(1 if is_reset else 0)
    else:
        reset_filter_gas = ""
    
    c.execute(f'''
        SELECT g.*,
            SUBSTR(g.date, 1, 7) as period,
            c.consumption_value as consumption,
            c.calculation_details
        FROM readings_gas g
        LEFT JOIN consumption_calc c ON SUBSTR(g.date, 1, 7) = c.period
            AND c.entity_type = 'gas'
            AND c.entity_id = g.room
            AND c.meter_id = g.meter_id
        WHERE g.date LIKE ?{reset_filter_gas}
        ORDER BY g.date, g.room
    ''', params_gas)
    gas = [dict(row) for row in c.fetchall()]
    
    conn.close()
    
    return {
        'electricity': electricity,
        'water': water,
        'gas': gas
    }


def count_readings_by_date(date: str, is_reset: Optional[bool] = None) -> Dict[str, Any]:
    """
    Count readings for a specific date by type.
    
    Returns:
        Dictionary with counts for each type and total
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Build WHERE clause for is_reset filter
    reset_filter = ""
    params: List[Any] = [f"{date}%"]
    
    if is_reset is not None:
        reset_filter = " AND is_reset = ?"
        params.append(1 if is_reset else 0)
    
    # Count electricity readings
    c.execute(f'''
        SELECT COUNT(*) FROM readings_electricity
        WHERE date LIKE ?{reset_filter}
    ''', params)
    electricity_count = c.fetchone()[0]
    
    # Count water readings
    params_water: List[Any] = [f"{date}%"]
    if is_reset is not None:
        params_water.append(1 if is_reset else 0)
    
    c.execute(f'''
        SELECT COUNT(*) FROM readings_water
        WHERE date LIKE ?{reset_filter}
    ''', params_water)
    water_count = c.fetchone()[0]
    
    # Count gas readings
    params_gas: List[Any] = [f"{date}%"]
    if is_reset is not None:
        params_gas.append(1 if is_reset else 0)
    
    c.execute(f'''
        SELECT COUNT(*) FROM readings_gas
        WHERE date LIKE ?{reset_filter}
    ''', params_gas)
    gas_count = c.fetchone()[0]
    
    conn.close()
    
    total = electricity_count + water_count + gas_count
    
    return {
        'electricity': electricity_count,
        'water': water_count,
        'gas': gas_count,
        'total': total
    }


def get_meters_for_date(date: str) -> Dict[str, List[str]]:
    """
    Get list of unique meters/rooms that have readings on a specific date.
    
    Returns:
        Dictionary with meter lists for each type
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get electricity meters
    c.execute('''
        SELECT DISTINCT meter_name FROM readings_electricity
        WHERE date LIKE ?
        ORDER BY meter_name
    ''', (f"{date}%",))
    electricity_meters = [row[0] for row in c.fetchall()]
    
    # Get water rooms
    c.execute('''
        SELECT DISTINCT room FROM readings_water
        WHERE date LIKE ?
        ORDER BY room
    ''', (f"{date}%",))
    water_rooms = [row[0] for row in c.fetchall()]
    
    # Get gas rooms
    c.execute('''
        SELECT DISTINCT room FROM readings_gas
        WHERE date LIKE ?
        ORDER BY room
    ''', (f"{date}%",))
    gas_rooms = [row[0] for row in c.fetchall()]
    
    conn.close()
    
    return {
        'electricity': electricity_meters,
        'water': water_rooms,
        'gas': gas_rooms
    }


def update_readings_by_date(
    date: str,
    new_date: Optional[str],
    electricity: List[Dict[str, Any]],
    water: List[Dict[str, Any]],
    gas: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Update readings for a specific date.
    
    Args:
        date: Original date in YYYY-MM-DD format
        new_date: New date if date should be changed (optional)
        electricity: List of electricity reading updates with id, value, comment
        water: List of water reading updates
        gas: List of gas reading updates
    
    Returns:
        Dictionary with update counts
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    updated_electricity = 0
    updated_water = 0
    updated_gas = 0
    moved_count = 0
    
    try:
        # Update electricity readings
        for reading in electricity:
            reading_id = reading['id']
            new_date_value = new_date if new_date else date
            
            # Get current reading info
            c.execute('''
                SELECT meter_name, meter_id, date, is_reset FROM readings_electricity
                WHERE id = ?
            ''', (reading_id,))
            current = c.fetchone()
            
            if current:
                # Update value and comment
                c.execute('''
                    UPDATE readings_electricity
                    SET value = ?, comment = ?, date = ?
                    WHERE id = ?
                ''', (
                    reading['value'],
                    reading.get('comment'),
                    new_date_value if not current['is_reset'] else f"{new_date_value} {current['date'].split(' ')[1] if ' ' in current['date'] else '00:00:00'}",
                    reading_id
                ))
                
                if c.rowcount > 0:
                    updated_electricity += 1
                    
                    # If date changed and this is not a reset reading, mark as moved
                    if new_date and new_date != date and not current['is_reset']:
                        moved_count += 1
                    
                    # Recalculate consumption
                    _calculate_electricity_consumption(conn, current['meter_name'], new_date_value)
        
        # Update water readings
        for reading in water:
            reading_id = reading['id']
            new_date_value = new_date if new_date else date
            
            c.execute('''
                SELECT room, meter_id, date, is_warm_water, is_reset FROM readings_water
                WHERE id = ?
            ''', (reading_id,))
            current = c.fetchone()
            
            if current:
                c.execute('''
                    UPDATE readings_water
                    SET value = ?, comment = ?, date = ?
                    WHERE id = ?
                ''', (
                    reading['value'],
                    reading.get('comment'),
                    new_date_value if not current['is_reset'] else f"{new_date_value} {current['date'].split(' ')[1] if ' ' in current['date'] else '00:00:00'}",
                    reading_id
                ))
                
                if c.rowcount > 0:
                    updated_water += 1
                    
                    if new_date and new_date != date and not current['is_reset']:
                        moved_count += 1
                    
                    _calculate_water_consumption(conn, current['room'], new_date_value, current['is_warm_water'])
        
        # Update gas readings
        for reading in gas:
            reading_id = reading['id']
            new_date_value = new_date if new_date else date
            
            c.execute('''
                SELECT room, meter_id, date, is_reset FROM readings_gas
                WHERE id = ?
            ''', (reading_id,))
            current = c.fetchone()
            
            if current:
                c.execute('''
                    UPDATE readings_gas
                    SET value = ?, comment = ?, date = ?
                    WHERE id = ?
                ''', (
                    reading['value'],
                    reading.get('comment'),
                    new_date_value if not current['is_reset'] else f"{new_date_value} {current['date'].split(' ')[1] if ' ' in current['date'] else '00:00:00'}",
                    reading_id
                ))
                
                if c.rowcount > 0:
                    updated_gas += 1
                    
                    if new_date and new_date != date and not current['is_reset']:
                        moved_count += 1
                    
                    _calculate_gas_consumption(conn, current['room'], new_date_value)
        
        conn.commit()
        
        return {
            'electricity': updated_electricity,
            'water': updated_water,
            'gas': updated_gas,
            'moved': moved_count,
            'old_date': date,
            'new_date': new_date if new_date else date,
            'message': f"Successfully updated {updated_electricity + updated_water + updated_gas} readings"
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def delete_readings_by_date(date: str, is_reset: Optional[bool] = None) -> Dict[str, Any]:
    """
    Delete all readings for a specific date.
    
    Args:
        date: Date in YYYY-MM-DD format
        is_reset: If True, only delete reset readings. If False, exclude reset readings.
                  If None, delete all readings.
    
    Returns:
        Dictionary with delete counts
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Build WHERE clause
    reset_filter = ""
    params: List[Any] = [f"{date}%"]
    
    if is_reset is not None:
        reset_filter = " AND is_reset = ?"
        params.append(1 if is_reset else 0)
    
    try:
        # Get info before deleting for consumption recalculation
        c.execute(f'''
            SELECT DISTINCT meter_name, SUBSTR(date, 1, 7) as period
            FROM readings_electricity
            WHERE date LIKE ?{reset_filter}
        ''', params)
        elec_meters = c.fetchall()
        
        c.execute(f'''
            SELECT DISTINCT room, SUBSTR(date, 1, 7) as period
            FROM readings_water
            WHERE date LIKE ?{reset_filter}
        ''', params)
        water_rooms = c.fetchall()
        
        c.execute(f'''
            SELECT DISTINCT room, SUBSTR(date, 1, 7) as period
            FROM readings_gas
            WHERE date LIKE ?{reset_filter}
        ''', params)
        gas_rooms = c.fetchall()
        
        # Delete electricity readings
        c.execute(f'''
            DELETE FROM readings_electricity
            WHERE date LIKE ?{reset_filter}
        ''', params)
        deleted_electricity = c.rowcount
        
        # Delete water readings
        params_water: List[Any] = [f"{date}%"]
        if is_reset is not None:
            params_water.append(1 if is_reset else 0)
        
        c.execute(f'''
            DELETE FROM readings_water
            WHERE date LIKE ?{reset_filter}
        ''', params_water)
        deleted_water = c.rowcount
        
        # Delete gas readings
        params_gas: List[Any] = [f"{date}%"]
        if is_reset is not None:
            params_gas.append(1 if is_reset else 0)
        
        c.execute(f'''
            DELETE FROM readings_gas
            WHERE date LIKE ?{reset_filter}
        ''', params_gas)
        deleted_gas = c.rowcount
        
        # Delete associated consumption calculations
        periods = set()
        for row in elec_meters:
            periods.add(row['period'])
        for row in water_rooms:
            periods.add(row['period'])
        for row in gas_rooms:
            periods.add(row['period'])
        
        for period in periods:
            c.execute('''
                DELETE FROM consumption_calc
                WHERE period = ?
            ''', (period,))
        
        conn.commit()
        
        # Recalculate consumption for affected meters/rooms
        for meter in elec_meters:
            try:
                _calculate_electricity_consumption(conn, meter['meter_name'], f"{meter['period']}-01")
            except:
                pass
        
        for room in water_rooms:
            try:
                _calculate_water_consumption(conn, room['room'], f"{room['period']}-01")
            except:
                pass
        
        for room in gas_rooms:
            try:
                _calculate_gas_consumption(conn, room['room'], f"{room['period']}-01")
            except:
                pass
        
        # Also recalculate previous month for all affected meters/rooms
        # since the deleted reading might have been the "next period" data
        # needed for the previous month's calculation
        from datetime import datetime
        
        for meter in elec_meters:
            try:
                current_date = datetime.strptime(f"{meter['period']}-01", '%Y-%m-%d')
                if current_date.month == 1:
                    prev_year = current_date.year - 1
                    prev_month = 12
                else:
                    prev_year = current_date.year
                    prev_month = current_date.month - 1
                prev_period = f"{prev_year:04d}-{prev_month:02d}"
                
                # Check if there are readings for the previous month
                c.execute('''
                    SELECT 1 FROM readings_electricity 
                    WHERE meter_name = ? AND SUBSTR(date, 1, 7) = ?
                    LIMIT 1
                ''', (meter['meter_name'], prev_period))
                if c.fetchone():
                    _calculate_electricity_consumption(conn, meter['meter_name'], f"{prev_period}-01")
            except:
                pass
        
        for room in water_rooms:
            try:
                current_date = datetime.strptime(f"{room['period']}-01", '%Y-%m-%d')
                if current_date.month == 1:
                    prev_year = current_date.year - 1
                    prev_month = 12
                else:
                    prev_year = current_date.year
                    prev_month = current_date.month - 1
                prev_period = f"{prev_year:04d}-{prev_month:02d}"
                
                # Check if there are readings for the previous month
                c.execute('''
                    SELECT 1 FROM readings_water 
                    WHERE room = ? AND SUBSTR(date, 1, 7) = ?
                    LIMIT 1
                ''', (room['room'], prev_period))
                if c.fetchone():
                    _calculate_water_consumption(conn, room['room'], f"{prev_period}-01")
            except:
                pass
        
        for room in gas_rooms:
            try:
                current_date = datetime.strptime(f"{room['period']}-01", '%Y-%m-%d')
                if current_date.month == 1:
                    prev_year = current_date.year - 1
                    prev_month = 12
                else:
                    prev_year = current_date.year
                    prev_month = current_date.month - 1
                prev_period = f"{prev_year:04d}-{prev_month:02d}"
                
                # Check if there are readings for the previous month
                c.execute('''
                    SELECT 1 FROM readings_gas 
                    WHERE room = ? AND SUBSTR(date, 1, 7) = ?
                    LIMIT 1
                ''', (room['room'], prev_period))
                if c.fetchone():
                    _calculate_gas_consumption(conn, room['room'], f"{prev_period}-01")
            except:
                pass
        
        conn.commit()
        
        total = deleted_electricity + deleted_water + deleted_gas
        
        return {
            'electricity': deleted_electricity,
            'water': deleted_water,
            'gas': deleted_gas,
            'deleted': total,
            'message': f"Successfully deleted {total} readings"
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

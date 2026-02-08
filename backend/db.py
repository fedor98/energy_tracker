import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from .models import AppConfig, ElectricityReadingInput, WaterReadingInput, GasReadingInput

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
            value REAL NOT NULL,
            comment TEXT,
            UNIQUE(date, meter_name)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings_water (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            room TEXT NOT NULL,
            value REAL NOT NULL,
            is_warm_water BOOLEAN NOT NULL DEFAULT 0,
            comment TEXT,
            UNIQUE(date, room, is_warm_water)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings_gas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            room TEXT NOT NULL,
            value REAL NOT NULL,
            comment TEXT,
            UNIQUE(date, room)
        )
    ''')
    
    # Aggregated consumption data table
    c.execute('''
        CREATE TABLE IF NOT EXISTS consumption_calc (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            consumption_value REAL,
            calculation_details TEXT,
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(period, entity_type, entity_id)
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
        CREATE INDEX IF NOT EXISTS idx_water_date ON readings_water(date)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_period ON readings_water(SUBSTR(date, 1, 7))
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_room ON readings_water(room)
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
        CREATE INDEX IF NOT EXISTS idx_consumption_period ON consumption_calc(period)
    ''')
    
    conn.commit()
    
    # Run migration if old table structure exists
    _migrate_water_readings_if_needed(conn)
    
    conn.close()


def _migrate_water_readings_if_needed(conn):
    """Migrate old water readings (with warm_value/cold_value/total_value) to new structure."""
    c = conn.cursor()
    
    # Check if old table structure exists (has warm_value column)
    c.execute("PRAGMA table_info(readings_water)")
    columns = {col['name'] for col in c.fetchall()}
    
    if 'warm_value' not in columns:
        # Already migrated or new database
        return
    
    # Backup old data
    c.execute('SELECT * FROM readings_water')
    old_readings = c.fetchall()
    
    if not old_readings:
        # No data to migrate, just recreate table
        c.execute('DROP TABLE readings_water')
        c.execute('''
            CREATE TABLE readings_water (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                room TEXT NOT NULL,
                value REAL NOT NULL,
                is_warm_water BOOLEAN NOT NULL DEFAULT 0,
                comment TEXT,
                UNIQUE(date, room, is_warm_water)
            )
        ''')
        conn.commit()
        return
    
    # Create new table with migration suffix
    c.execute('''
        CREATE TABLE readings_water_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            room TEXT NOT NULL,
            value REAL NOT NULL,
            is_warm_water BOOLEAN NOT NULL DEFAULT 0,
            comment TEXT,
            UNIQUE(date, room, is_warm_water)
        )
    ''')
    
    # Migrate data: create separate rows for warm and cold water
    for reading in old_readings:
        comment = reading['comment'] or ''
        
        # Migrate warm water reading if exists
        if reading['warm_value'] is not None:
            c.execute('''
                INSERT INTO readings_water_new (date, room, value, is_warm_water, comment)
                VALUES (?, ?, ?, 1, ?)
            ''', (reading['date'], reading['room'], reading['warm_value'], comment))
        
        # Migrate cold water reading if exists
        if reading['cold_value'] is not None:
            c.execute('''
                INSERT INTO readings_water_new (date, room, value, is_warm_water, comment)
                VALUES (?, ?, ?, 0, ?)
            ''', (reading['date'], reading['room'], reading['cold_value'], comment))
    
    # Replace old table with new one
    c.execute('DROP TABLE readings_water')
    c.execute('ALTER TABLE readings_water_new RENAME TO readings_water')
    
    # Recreate indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_water_date ON readings_water(date)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_water_period ON readings_water(SUBSTR(date, 1, 7))')
    c.execute('CREATE INDEX IF NOT EXISTS idx_water_room ON readings_water(room)')
    
    conn.commit()

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
    
    # Delete old calculation
    c.execute('''
        DELETE FROM consumption_calc 
        WHERE period = ? AND entity_type = 'electricity' AND entity_id = ?
    ''', (period, meter_name))
    
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
        INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, calculation_details)
        VALUES (?, 'electricity', ?, ?, ?)
    ''', (period, meter_name, consumption, calc_details_json))
    
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
        # Delete old calculation for this type
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_id = ? AND entity_type = ?
        ''', (period, room, entity_type))
        
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
            INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, calculation_details)
            VALUES (?, ?, ?, ?, ?)
        ''', (period, entity_type, room, consumption, calc_details_json))
    
    # Calculate total consumption (sum of warm + cold) if both exist
    if is_warm_water is None:
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_id = ? AND entity_type = 'water_total'
        ''', (period, room))
        
        # Get all water readings for this room/period
        c.execute('''
            SELECT date, value, is_warm_water, comment FROM readings_water 
            WHERE room = ? AND SUBSTR(date, 1, 7) = ?
            ORDER BY date ASC, is_warm_water
        ''', (room, period))
        all_readings = c.fetchall()
        
        if all_readings:
            # Group readings by date and sum warm + cold
            readings_by_date = {}
            for r in all_readings:
                date_key = r['date']
                if date_key not in readings_by_date:
                    readings_by_date[date_key] = {'value': 0, 'comment': r['comment'] or ''}
                readings_by_date[date_key]['value'] += r['value']
            
            # Build total readings list
            total_readings = [
                {'date': d, 'value': v['value'], 'comment': v['comment']}
                for d, v in sorted(readings_by_date.items())
            ]
            
            # Get first reading of next period for total
            c.execute('''
                SELECT date, value, is_warm_water, comment FROM readings_water 
                WHERE room = ? AND date >= ?
                ORDER BY date ASC, is_warm_water
            ''', (room, f"{period}-32"))
            next_readings = c.fetchall()
            
            if next_readings:
                # Sum next period readings by date
                next_by_date = {}
                for r in next_readings:
                    date_key = r['date']
                    if date_key not in next_by_date:
                        next_by_date[date_key] = 0
                    next_by_date[date_key] += r['value']
                
                # Add first date from next period
                first_next_date = min(next_by_date.keys())
                total_readings.append({
                    'date': first_next_date,
                    'value': next_by_date[first_next_date],
                    'comment': ''
                })
            
            if len(total_readings) >= 2:
                total_consumption, total_details, _ = _calculate_consumption_from_readings(total_readings)
                c.execute('''
                    INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, calculation_details)
                    VALUES (?, 'water_total', ?, ?, ?)
                ''', (period, room, total_consumption, json.dumps(total_details) if total_details else None))
    
    conn.commit()

def _calculate_gas_consumption(conn, room: str, date: str):
    """Calculate and store gas consumption for a specific period."""
    import json
    c = conn.cursor()
    period = date[:7]  # YYYY-MM from YYYY-MM-DD
    
    # Delete old calculation
    c.execute('''
        DELETE FROM consumption_calc 
        WHERE period = ? AND entity_type = 'gas' AND entity_id = ?
    ''', (period, room))
    
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
        INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, calculation_details)
        VALUES (?, 'gas', ?, ?, ?)
    ''', (period, room, consumption, calc_details_json))
    
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
        INSERT INTO readings_electricity (date, meter_name, value, comment)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(date, meter_name) DO UPDATE SET
            value = excluded.value,
            comment = excluded.comment
        RETURNING id
    ''', (reading.date, reading.meter_name, reading.value, reading.comment))
    
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
        WHERE e.id = ?
    ''', (id,))
    
    row = c.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_electricity_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None,
    meter_name: Optional[str] = None
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
        SET date = ?, meter_name = ?, value = ?, comment = ?
        WHERE id = ?
    ''', (reading.date, reading.meter_name, reading.value, reading.comment, id))
    
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
    c.execute("SELECT meter_name, date FROM readings_electricity WHERE id = ?", (id,))
    reading = c.fetchone()
    
    c.execute("DELETE FROM readings_electricity WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()
    
    if deleted and reading:
        # Delete associated consumption calculation
        period = reading['date'][:7]
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_type = 'electricity' AND entity_id = ?
        ''', (period, reading['meter_name']))
        conn.commit()
    
    conn.close()
    
    return deleted

# Water CRUD Operations
def save_water_reading(reading: WaterReadingInput) -> int:
    """Save or update a water reading. Returns the reading ID."""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO readings_water (date, room, value, is_warm_water, comment)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(date, room, is_warm_water) DO UPDATE SET
            value = excluded.value,
            comment = excluded.comment
        RETURNING id
    ''', (reading.date, reading.room, reading.value, reading.is_warm_water, reading.comment))
    
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
            c.consumption_value,
            c.calculation_details
        FROM readings_water w
        LEFT JOIN consumption_calc c ON SUBSTR(w.date, 1, 7) = c.period 
            AND c.entity_type = CASE WHEN w.is_warm_water = 1 THEN 'water_warm' ELSE 'water_cold' END
            AND c.entity_id = w.room
        WHERE w.id = ?
    ''', (id,))
    
    row = c.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_water_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None,
    room: Optional[str] = None,
    is_warm_water: Optional[bool] = None
) -> List[Dict[str, Any]]:
    """Get water readings with optional filters."""
    conn = get_db_connection()
    c = conn.cursor()
    
    query = '''
        SELECT w.*,
            SUBSTR(w.date, 1, 7) as period,
            c.consumption_value,
            c.calculation_details
        FROM readings_water w
        LEFT JOIN consumption_calc c ON SUBSTR(w.date, 1, 7) = c.period 
            AND c.entity_type = CASE WHEN w.is_warm_water = 1 THEN 'water_warm' ELSE 'water_cold' END
            AND c.entity_id = w.room
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
    c.execute("SELECT room, date, is_warm_water FROM readings_water WHERE id = ?", (id,))
    old_reading = c.fetchone()
    
    c.execute('''
        UPDATE readings_water 
        SET date = ?, room = ?, value = ?, is_warm_water = ?, comment = ?
        WHERE id = ?
    ''', (reading.date, reading.room, reading.value, reading.is_warm_water, reading.comment, id))
    
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
    c.execute("SELECT room, date, is_warm_water FROM readings_water WHERE id = ?", (id,))
    reading = c.fetchone()
    
    c.execute("DELETE FROM readings_water WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()
    
    if deleted and reading:
        # Recalculate consumption for this room and type
        _calculate_water_consumption(conn, reading['room'], reading['date'], reading['is_warm_water'])
    
    conn.close()
    
    return deleted

# Gas CRUD Operations
def save_gas_reading(reading: GasReadingInput) -> int:
    """Save or update a gas reading. Returns the reading ID."""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO readings_gas (date, room, value, comment)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(date, room) DO UPDATE SET
            value = excluded.value,
            comment = excluded.comment
        RETURNING id
    ''', (reading.date, reading.room, reading.value, reading.comment))
    
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
        WHERE g.id = ?
    ''', (id,))
    
    row = c.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_gas_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None,
    room: Optional[str] = None
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
        SET date = ?, room = ?, value = ?, comment = ?
        WHERE id = ?
    ''', (reading.date, reading.room, reading.value, reading.comment, id))
    
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
    c.execute("SELECT room, date FROM readings_gas WHERE id = ?", (id,))
    reading = c.fetchone()
    
    c.execute("DELETE FROM readings_gas WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()
    
    if deleted and reading:
        # Delete associated consumption calculation
        period = reading['date'][:7]
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_type = 'gas' AND entity_id = ?
        ''', (period, reading['room']))
        conn.commit()
    
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
            ORDER BY date DESC, meter_name
        ''')
        c.execute('DROP TABLE readings_electricity')
        c.execute('ALTER TABLE readings_electricity_new RENAME TO readings_electricity')
        
        # Reorganize readings_water
        c.execute('''
            CREATE TABLE readings_water_new AS
            SELECT * FROM readings_water
            ORDER BY date DESC, room, is_warm_water
        ''')
        c.execute('DROP TABLE readings_water')
        c.execute('ALTER TABLE readings_water_new RENAME TO readings_water')
        
        # Reorganize readings_gas
        c.execute('''
            CREATE TABLE readings_gas_new AS
            SELECT * FROM readings_gas
            ORDER BY date DESC, room
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
        c.execute('CREATE INDEX idx_water_date ON readings_water(date)')
        c.execute('CREATE INDEX idx_water_period ON readings_water(SUBSTR(date, 1, 7))')
        c.execute('CREATE INDEX idx_water_room ON readings_water(room)')
        c.execute('CREATE INDEX idx_gas_date ON readings_gas(date)')
        c.execute('CREATE INDEX idx_gas_period ON readings_gas(SUBSTR(date, 1, 7))')
        c.execute('CREATE INDEX idx_gas_room ON readings_gas(room)')
        c.execute('CREATE INDEX idx_consumption_period ON consumption_calc(period)')
        
        conn.commit()
        return {"status": "success", "message": "Tables reorganized successfully", "backup_created": backup_path}
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

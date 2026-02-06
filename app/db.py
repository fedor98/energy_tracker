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
            period TEXT NOT NULL,
            date TEXT,
            meter_name TEXT NOT NULL,
            value REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(period, meter_name)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings_water (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period TEXT NOT NULL,
            date TEXT,
            room TEXT NOT NULL,
            warm_value REAL,
            cold_value REAL,
            total_value REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(period, room)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings_gas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period TEXT NOT NULL,
            date TEXT,
            room TEXT NOT NULL,
            value REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(period, room)
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
            current_value REAL,
            previous_value REAL,
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(period, entity_type, entity_id)
        )
    ''')
    
    # Add new columns if they don't exist (for existing databases)
    try:
        c.execute('ALTER TABLE consumption_calc ADD COLUMN current_value REAL')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        c.execute('ALTER TABLE consumption_calc ADD COLUMN previous_value REAL')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Create indexes for better performance
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_electricity_period ON readings_electricity(period)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_electricity_meter ON readings_electricity(meter_name)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_period ON readings_water(period)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_water_room ON readings_water(room)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_gas_period ON readings_gas(period)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_gas_room ON readings_gas(room)
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_consumption_period ON consumption_calc(period)
    ''')
    
    conn.commit()
    conn.close()

def _calculate_electricity_consumption(conn, meter_name: str, period: str):
    """Calculate and store electricity consumption for a specific period."""
    c = conn.cursor()
    
    # Delete old calculation
    c.execute('''
        DELETE FROM consumption_calc 
        WHERE period = ? AND entity_type = 'electricity' AND entity_id = ?
    ''', (period, meter_name))
    
    # Get current and previous reading
    c.execute('''
        SELECT value FROM readings_electricity 
        WHERE meter_name = ? AND period = ?
    ''', (meter_name, period))
    current = c.fetchone()
    
    c.execute('''
        SELECT value FROM readings_electricity 
        WHERE meter_name = ? AND period < ?
        ORDER BY period DESC LIMIT 1
    ''', (meter_name, period))
    previous = c.fetchone()
    
    if current and previous:
        consumption = current['value'] - previous['value']
        if consumption < 0:
            consumption = 0  # Handle meter reset
        
        c.execute('''
            INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, current_value, previous_value)
            VALUES (?, 'electricity', ?, ?, ?, ?)
        ''', (period, meter_name, consumption, current['value'], previous['value']))
    
    conn.commit()

def _calculate_water_consumption(conn, room: str, period: str):
    """Calculate and store water consumption for a specific period."""
    c = conn.cursor()
    
    # Get current and previous reading
    c.execute('''
        SELECT warm_value, cold_value FROM readings_water 
        WHERE room = ? AND period = ?
    ''', (room, period))
    current = c.fetchone()
    
    c.execute('''
        SELECT warm_value, cold_value FROM readings_water 
        WHERE room = ? AND period < ?
        ORDER BY period DESC LIMIT 1
    ''', (room, period))
    previous = c.fetchone()
    
    if current and previous:
        # Warm water
        if current['warm_value'] is not None and previous['warm_value'] is not None:
            warm_consumption = current['warm_value'] - previous['warm_value']
            if warm_consumption < 0:
                warm_consumption = 0
            
            c.execute('''
                DELETE FROM consumption_calc 
                WHERE period = ? AND entity_type = 'water_warm' AND entity_id = ?
            ''', (period, room))
            c.execute('''
                INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, current_value, previous_value)
                VALUES (?, 'water_warm', ?, ?, ?, ?)
            ''', (period, room, warm_consumption, current['warm_value'], previous['warm_value']))
        
        # Cold water
        if current['cold_value'] is not None and previous['cold_value'] is not None:
            cold_consumption = current['cold_value'] - previous['cold_value']
            if cold_consumption < 0:
                cold_consumption = 0
            
            c.execute('''
                DELETE FROM consumption_calc 
                WHERE period = ? AND entity_type = 'water_cold' AND entity_id = ?
            ''', (period, room))
            c.execute('''
                INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, current_value, previous_value)
                VALUES (?, 'water_cold', ?, ?, ?, ?)
            ''', (period, room, cold_consumption, current['cold_value'], previous['cold_value']))
        
        # Total water
        current_total = (current['warm_value'] or 0) + (current['cold_value'] or 0)
        previous_total = (previous['warm_value'] or 0) + (previous['cold_value'] or 0)
        total_consumption = current_total - previous_total
        if total_consumption < 0:
            total_consumption = 0
        
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_type = 'water_total' AND entity_id = ?
        ''', (period, room))
        c.execute('''
            INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, current_value, previous_value)
            VALUES (?, 'water_total', ?, ?, ?, ?)
        ''', (period, room, total_consumption, current_total, previous_total))
    
    conn.commit()

def _calculate_gas_consumption(conn, room: str, period: str):
    """Calculate and store gas consumption for a specific period."""
    c = conn.cursor()
    
    # Delete old calculation
    c.execute('''
        DELETE FROM consumption_calc 
        WHERE period = ? AND entity_type = 'gas' AND entity_id = ?
    ''', (period, room))
    
    # Get current and previous reading
    c.execute('''
        SELECT value FROM readings_gas 
        WHERE room = ? AND period = ?
    ''', (room, period))
    current = c.fetchone()
    
    c.execute('''
        SELECT value FROM readings_gas 
        WHERE room = ? AND period < ?
        ORDER BY period DESC LIMIT 1
    ''', (room, period))
    previous = c.fetchone()
    
    if current and previous:
        consumption = current['value'] - previous['value']
        if consumption < 0:
            consumption = 0  # Handle meter reset
        
        c.execute('''
            INSERT INTO consumption_calc (period, entity_type, entity_id, consumption_value, current_value, previous_value)
            VALUES (?, 'gas', ?, ?, ?, ?)
        ''', (period, room, consumption, current['value'], previous['value']))
    
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
        INSERT INTO readings_electricity (period, date, meter_name, value)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(period, meter_name) DO UPDATE SET
            date = excluded.date,
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id
    ''', (reading.period, reading.date, reading.meter_name, reading.value))
    
    result = c.fetchone()
    conn.commit()
    
    # Calculate consumption
    _calculate_electricity_consumption(conn, reading.meter_name, reading.period)
    
    conn.close()
    
    return result['id']

def get_electricity_reading(id: int) -> Optional[Dict[str, Any]]:
    """Get a single electricity reading by ID."""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        SELECT e.*, 
            c.consumption_value as consumption,
            c.current_value,
            c.previous_value
        FROM readings_electricity e
        LEFT JOIN consumption_calc c ON e.period = c.period 
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
            c.consumption_value as consumption,
            c.current_value,
            c.previous_value
        FROM readings_electricity e
        LEFT JOIN consumption_calc c ON e.period = c.period 
            AND c.entity_type = 'electricity' 
            AND c.entity_id = e.meter_name
        WHERE 1=1
    '''
    params = []
    
    if start_period:
        query += " AND e.period >= ?"
        params.append(start_period)
    if end_period:
        query += " AND e.period <= ?"
        params.append(end_period)
    if meter_name:
        query += " AND e.meter_name = ?"
        params.append(meter_name)
    
    query += " ORDER BY e.period ASC, e.meter_name"
    
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
        SET period = ?, date = ?, meter_name = ?, value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (reading.period, reading.date, reading.meter_name, reading.value, id))
    
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        # Recalculate consumption
        _calculate_electricity_consumption(conn, reading.meter_name, reading.period)
    
    conn.close()
    
    return updated

def delete_electricity_reading(id: int) -> bool:
    """Delete an electricity reading."""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get reading info before deleting
    c.execute("SELECT meter_name, period FROM readings_electricity WHERE id = ?", (id,))
    reading = c.fetchone()
    
    c.execute("DELETE FROM readings_electricity WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()
    
    if deleted and reading:
        # Delete associated consumption calculation
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_type = 'electricity' AND entity_id = ?
        ''', (reading['period'], reading['meter_name']))
        conn.commit()
    
    conn.close()
    
    return deleted

# Water CRUD Operations
def save_water_reading(reading: WaterReadingInput) -> int:
    """Save or update a water reading. Returns the reading ID."""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Calculate total
    total = (reading.warm_value or 0) + (reading.cold_value or 0)
    total_value = total if total > 0 else None
    
    c.execute('''
        INSERT INTO readings_water (period, date, room, warm_value, cold_value, total_value)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(period, room) DO UPDATE SET
            date = excluded.date,
            warm_value = excluded.warm_value,
            cold_value = excluded.cold_value,
            total_value = excluded.total_value,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id
    ''', (reading.period, reading.date, reading.room, reading.warm_value, reading.cold_value, total_value))
    
    result = c.fetchone()
    conn.commit()
    
    # Calculate consumption
    _calculate_water_consumption(conn, reading.room, reading.period)
    
    conn.close()
    
    return result['id']

def get_water_reading(id: int) -> Optional[Dict[str, Any]]:
    """Get a single water reading by ID."""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        SELECT w.*,
            cw.consumption_value as warm_consumption,
            cw.current_value as warm_current_value,
            cw.previous_value as warm_previous_value,
            cc.consumption_value as cold_consumption,
            cc.current_value as cold_current_value,
            cc.previous_value as cold_previous_value,
            ct.consumption_value as total_consumption,
            ct.current_value as total_current_value,
            ct.previous_value as total_previous_value
        FROM readings_water w
        LEFT JOIN consumption_calc cw ON w.period = cw.period 
            AND cw.entity_type = 'water_warm' AND cw.entity_id = w.room
        LEFT JOIN consumption_calc cc ON w.period = cc.period 
            AND cc.entity_type = 'water_cold' AND cc.entity_id = w.room
        LEFT JOIN consumption_calc ct ON w.period = ct.period 
            AND ct.entity_type = 'water_total' AND ct.entity_id = w.room
        WHERE w.id = ?
    ''', (id,))
    
    row = c.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_water_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None,
    room: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get water readings with optional filters."""
    conn = get_db_connection()
    c = conn.cursor()
    
    query = '''
        SELECT w.*,
            cw.consumption_value as warm_consumption,
            cw.current_value as warm_current_value,
            cw.previous_value as warm_previous_value,
            cc.consumption_value as cold_consumption,
            cc.current_value as cold_current_value,
            cc.previous_value as cold_previous_value,
            ct.consumption_value as total_consumption,
            ct.current_value as total_current_value,
            ct.previous_value as total_previous_value
        FROM readings_water w
        LEFT JOIN consumption_calc cw ON w.period = cw.period 
            AND cw.entity_type = 'water_warm' AND cw.entity_id = w.room
        LEFT JOIN consumption_calc cc ON w.period = cc.period 
            AND cc.entity_type = 'water_cold' AND cc.entity_id = w.room
        LEFT JOIN consumption_calc ct ON w.period = ct.period 
            AND ct.entity_type = 'water_total' AND ct.entity_id = w.room
        WHERE 1=1
    '''
    params = []
    
    if start_period:
        query += " AND w.period >= ?"
        params.append(start_period)
    if end_period:
        query += " AND w.period <= ?"
        params.append(end_period)
    if room:
        query += " AND w.room = ?"
        params.append(room)
    
    query += " ORDER BY w.period ASC, w.room"
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def update_water_reading(id: int, reading: WaterReadingInput) -> bool:
    """Update an existing water reading."""
    conn = get_db_connection()
    c = conn.cursor()
    
    total = (reading.warm_value or 0) + (reading.cold_value or 0)
    total_value = total if total > 0 else None
    
    c.execute('''
        UPDATE readings_water 
        SET period = ?, date = ?, room = ?, warm_value = ?, cold_value = ?, 
            total_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (reading.period, reading.date, reading.room, reading.warm_value, 
          reading.cold_value, total_value, id))
    
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        # Recalculate consumption
        _calculate_water_consumption(conn, reading.room, reading.period)
    
    conn.close()
    
    return updated

def delete_water_reading(id: int) -> bool:
    """Delete a water reading."""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get reading info before deleting
    c.execute("SELECT room, period FROM readings_water WHERE id = ?", (id,))
    reading = c.fetchone()
    
    c.execute("DELETE FROM readings_water WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()
    
    if deleted and reading:
        # Delete associated consumption calculations
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_id = ? AND entity_type IN ('water_warm', 'water_cold', 'water_total')
        ''', (reading['period'], reading['room']))
        conn.commit()
    
    conn.close()
    
    return deleted

# Gas CRUD Operations
def save_gas_reading(reading: GasReadingInput) -> int:
    """Save or update a gas reading. Returns the reading ID."""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO readings_gas (period, date, room, value)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(period, room) DO UPDATE SET
            date = excluded.date,
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id
    ''', (reading.period, reading.date, reading.room, reading.value))
    
    result = c.fetchone()
    conn.commit()
    
    # Calculate consumption
    _calculate_gas_consumption(conn, reading.room, reading.period)
    
    conn.close()
    
    return result['id']

def get_gas_reading(id: int) -> Optional[Dict[str, Any]]:
    """Get a single gas reading by ID."""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        SELECT g.*, 
            c.consumption_value as consumption,
            c.current_value,
            c.previous_value
        FROM readings_gas g
        LEFT JOIN consumption_calc c ON g.period = c.period 
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
            c.consumption_value as consumption,
            c.current_value,
            c.previous_value
        FROM readings_gas g
        LEFT JOIN consumption_calc c ON g.period = c.period 
            AND c.entity_type = 'gas' 
            AND c.entity_id = g.room
        WHERE 1=1
    '''
    params = []
    
    if start_period:
        query += " AND g.period >= ?"
        params.append(start_period)
    if end_period:
        query += " AND g.period <= ?"
        params.append(end_period)
    if room:
        query += " AND g.room = ?"
        params.append(room)
    
    query += " ORDER BY g.period ASC, g.room"
    
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
        SET period = ?, date = ?, room = ?, value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (reading.period, reading.date, reading.room, reading.value, id))
    
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        # Recalculate consumption
        _calculate_gas_consumption(conn, reading.room, reading.period)
    
    conn.close()
    
    return updated

def delete_gas_reading(id: int) -> bool:
    """Delete a gas reading."""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get reading info before deleting
    c.execute("SELECT room, period FROM readings_gas WHERE id = ?", (id,))
    reading = c.fetchone()
    
    c.execute("DELETE FROM readings_gas WHERE id = ?", (id,))
    deleted = c.rowcount > 0
    conn.commit()
    
    if deleted and reading:
        # Delete associated consumption calculation
        c.execute('''
            DELETE FROM consumption_calc 
            WHERE period = ? AND entity_type = 'gas' AND entity_id = ?
        ''', (reading['period'], reading['room']))
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

def get_all_readings(
    start_period: Optional[str] = None,
    end_period: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get all readings across all types for compatibility with legacy API."""
    results = []
    
    # Get electricity readings
    for r in get_electricity_readings(start_period, end_period):
        results.append({
            'id': r['id'],
            'period': r['period'],
            'date': r['date'],
            'type': 'electricity',
            'meter': r['meter_name'],
            'channel': None,
            'value': r['value'],
            'consumption': r.get('consumption')
        })
    
    # Get water readings
    for r in get_water_readings(start_period, end_period):
        if r['warm_value'] is not None:
            results.append({
                'id': r['id'],
                'period': r['period'],
                'date': r['date'],
                'type': 'water',
                'meter': r['room'],
                'channel': 'warm',
                'value': r['warm_value'],
                'consumption': r.get('warm_consumption')
            })
        if r['cold_value'] is not None:
            results.append({
                'id': r['id'],
                'period': r['period'],
                'date': r['date'],
                'type': 'water',
                'meter': r['room'],
                'channel': 'cold',
                'value': r['cold_value'],
                'consumption': r.get('cold_consumption')
            })
    
    # Get gas readings
    for r in get_gas_readings(start_period, end_period):
        results.append({
            'id': r['id'],
            'period': r['period'],
            'date': r['date'],
            'type': 'gas',
            'meter': r['room'],
            'channel': None,
            'value': r['value'],
            'consumption': r.get('consumption')
        })
    
    # Sort by period
    results.sort(key=lambda x: (x['period'], x['type'], x['meter']))
    return results

def backup_and_reset_db():
    import datetime
    import shutil
    
    if os.path.exists(DB_PATH):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{DB_PATH}_backup_{timestamp}.sqlite"
        shutil.move(DB_PATH, backup_path)
        
    init_db()

"""
Database migration utilities for restructuring readings into separate tables.
Run this once to migrate from old 'readings' table to new structure.
"""

import sqlite3
import os
from typing import List, Dict, Any
from db import get_db_connection, DB_PATH

def migrate_legacy_data():
    """
    Migrate data from old 'readings' table to new separate tables.
    This should be run once during the upgrade.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if old readings table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='readings'")
        if not c.fetchone():
            print("No legacy 'readings' table found. Migration not needed.")
            return
        
        # Get all readings from old table
        c.execute("SELECT * FROM readings ORDER BY period, type, meter, channel")
        legacy_readings = c.fetchall()
        
        if not legacy_readings:
            print("No data in legacy table. Migration not needed.")
            return
        
        print(f"Found {len(legacy_readings)} readings to migrate...")
        
        # Migrate to new tables
        for reading in legacy_readings:
            r_type = reading['type']
            period = reading['period']
            date = reading['date']
            meter = reading['meter']
            channel = reading['channel'] or 'default'
            value = reading['value']
            
            # Use date from legacy data, or derive from period if missing
            actual_date = date or f"{period}-01"
            
            if r_type == 'electricity':
                c.execute('''
                    INSERT OR REPLACE INTO readings_electricity 
                    (date, meter_name, value)
                    VALUES (?, ?, ?)
                ''', (actual_date, meter, value))
                
            elif r_type == 'gas':
                c.execute('''
                    INSERT OR REPLACE INTO readings_gas 
                    (date, room, value)
                    VALUES (?, ?, ?)
                ''', (actual_date, meter, value))
                
            elif r_type == 'water':
                # Water readings now use is_warm_water flag
                is_warm = (channel == 'warm')
                
                c.execute('''
                    INSERT OR REPLACE INTO readings_water 
                    (date, room, value, is_warm_water)
                    VALUES (?, ?, ?, ?)
                ''', (actual_date, meter, value, is_warm))
        
        conn.commit()
        print(f"Successfully migrated {len(legacy_readings)} readings!")
        
        # Rename old table as backup
        c.execute("ALTER TABLE readings RENAME TO readings_legacy_backup")
        conn.commit()
        print("Old table renamed to 'readings_legacy_backup'")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()

def check_migration_needed() -> bool:
    """Check if migration from legacy table is needed."""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='readings'")
        has_legacy = c.fetchone() is not None
        
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='readings_electricity'")
        has_new = c.fetchone() is not None
        
        return has_legacy and not has_new
    finally:
        conn.close()

def get_migration_status() -> Dict[str, Any]:
    """Get current migration status."""
    conn = get_db_connection()
    c = conn.cursor()
    
    status = {
        'legacy_table_exists': False,
        'new_tables_exist': False,
        'legacy_readings_count': 0,
        'new_readings_count': 0,
        'migration_needed': False
    }
    
    try:
        # Check legacy table
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='readings'")
        status['legacy_table_exists'] = c.fetchone() is not None
        
        if status['legacy_table_exists']:
            c.execute("SELECT COUNT(*) as count FROM readings")
            status['legacy_readings_count'] = c.fetchone()['count']
        
        # Check new tables
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='readings_electricity'")
        status['new_tables_exist'] = c.fetchone() is not None
        
        if status['new_tables_exist']:
            c.execute("SELECT COUNT(*) as count FROM readings_electricity")
            elec_count = c.fetchone()['count']
            
            c.execute("SELECT COUNT(*) as count FROM readings_water")
            water_count = c.fetchone()['count']
            
            c.execute("SELECT COUNT(*) as count FROM readings_gas")
            gas_count = c.fetchone()['count']
            
            status['new_readings_count'] = elec_count + water_count + gas_count
        
        status['migration_needed'] = check_migration_needed()
        
    finally:
        conn.close()
    
    return status

def migrate_consumption_calc_values():
    """
    Migrate existing consumption_calc entries to populate current_value and previous_value columns.
    This should be run after adding the new columns.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if new columns exist
        c.execute("PRAGMA table_info(consumption_calc)")
        columns = [col['name'] for col in c.fetchall()]
        
        if 'current_value' not in columns or 'previous_value' not in columns:
            print("New columns don't exist yet. Please run init_db() first.")
            return
        
        # Check if migration is needed (any null values in current_value)
        c.execute("SELECT COUNT(*) as count FROM consumption_calc WHERE current_value IS NULL")
        null_count = c.fetchone()['count']
        
        if null_count == 0:
            print("No migration needed. All consumption_calc entries have current_value set.")
            return
        
        print(f"Found {null_count} consumption_calc entries to migrate...")
        
        # Get all consumption_calc entries with null current_value
        c.execute('''
            SELECT id, period, entity_type, entity_id, consumption_value
            FROM consumption_calc
            WHERE current_value IS NULL
        ''')
        entries = c.fetchall()
        
        migrated_count = 0
        
        for entry in entries:
            entity_type = entry['entity_type']
            entity_id = entry['entity_id']
            period = entry['period']
            
            current_value = None
            previous_value = None
            
            if entity_type == 'electricity':
                # Get current and previous values from readings_electricity
                # period is in format YYYY-MM, date is YYYY-MM-DD
                c.execute('''
                    SELECT value FROM readings_electricity
                    WHERE meter_name = ? AND SUBSTR(date, 1, 7) = ?
                    ORDER BY date DESC LIMIT 1
                ''', (entity_id, period))
                current_row = c.fetchone()
                
                c.execute('''
                    SELECT value FROM readings_electricity
                    WHERE meter_name = ? AND date < ?
                    ORDER BY date DESC LIMIT 1
                ''', (entity_id, f"{period}-01"))
                previous_row = c.fetchone()
                
                if current_row:
                    current_value = current_row['value']
                if previous_row:
                    previous_value = previous_row['value']
                    
            elif entity_type == 'gas':
                # Get current and previous values from readings_gas
                c.execute('''
                    SELECT value FROM readings_gas
                    WHERE room = ? AND SUBSTR(date, 1, 7) = ?
                    ORDER BY date DESC LIMIT 1
                ''', (entity_id, period))
                current_row = c.fetchone()
                
                c.execute('''
                    SELECT value FROM readings_gas
                    WHERE room = ? AND date < ?
                    ORDER BY date DESC LIMIT 1
                ''', (entity_id, f"{period}-01"))
                previous_row = c.fetchone()
                
                if current_row:
                    current_value = current_row['value']
                if previous_row:
                    previous_value = previous_row['value']
                    
            elif entity_type in ['water_warm', 'water_cold', 'water_total']:
                # Get current and previous values from readings_water (new structure)
                if entity_type == 'water_warm':
                    is_warm = 1
                elif entity_type == 'water_cold':
                    is_warm = 0
                else:
                    is_warm = None  # water_total
                
                if is_warm is not None:
                    # For warm or cold specific
                    c.execute('''
                        SELECT value FROM readings_water
                        WHERE room = ? AND is_warm_water = ? AND SUBSTR(date, 1, 7) = ?
                        ORDER BY date DESC LIMIT 1
                    ''', (entity_id, is_warm, period))
                    current_row = c.fetchone()
                    
                    c.execute('''
                        SELECT value FROM readings_water
                        WHERE room = ? AND is_warm_water = ? AND date < ?
                        ORDER BY date DESC LIMIT 1
                    ''', (entity_id, is_warm, f"{period}-01"))
                    previous_row = c.fetchone()
                    
                    if current_row:
                        current_value = current_row['value']
                    if previous_row:
                        previous_value = previous_row['value']
                else:
                    # For water_total - sum warm and cold
                    c.execute('''
                        SELECT is_warm_water, value FROM readings_water
                        WHERE room = ? AND SUBSTR(date, 1, 7) = ?
                        ORDER BY date DESC
                    ''', (entity_id, period))
                    current_rows = c.fetchall()
                    
                    c.execute('''
                        SELECT is_warm_water, value FROM readings_water
                        WHERE room = ? AND date < ?
                        ORDER BY date DESC
                    ''', (entity_id, f"{period}-01"))
                    previous_rows = c.fetchall()
                    
                    # Sum all values for each date
                    current_value = sum(r['value'] for r in current_rows) if current_rows else None
                    previous_value = sum(r['value'] for r in previous_rows) if previous_rows else None
            
            # Update the entry with current and previous values
            c.execute('''
                UPDATE consumption_calc
                SET current_value = ?, previous_value = ?
                WHERE id = ?
            ''', (current_value, previous_value, entry['id']))
            
            migrated_count += 1
            
            if migrated_count % 100 == 0:
                print(f"Migrated {migrated_count} entries...")
        
        conn.commit()
        print(f"Successfully migrated {migrated_count} consumption_calc entries!")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()

def check_consumption_calc_migration_needed() -> bool:
    """Check if migration for consumption_calc values is needed."""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Check if new columns exist
        c.execute("PRAGMA table_info(consumption_calc)")
        columns = [col['name'] for col in c.fetchall()]

        if 'current_value' not in columns or 'previous_value' not in columns:
            return False

        # Check if there are null values
        c.execute("SELECT COUNT(*) as count FROM consumption_calc WHERE current_value IS NULL")
        null_count = c.fetchone()['count']

        return null_count > 0

    except:
        return False
    finally:
        conn.close()


def migrate_meter_ids_if_needed():
    """
    Add meter_id columns to readings tables and populate with default values.
    This migration is for existing databases that don't have meter_id columns yet.
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Check if meter_id column already exists in readings_electricity
        c.execute("PRAGMA table_info(readings_electricity)")
        elec_columns = [col['name'] for col in c.fetchall()]

        if 'meter_id' not in elec_columns:
            print("Adding meter_id column to readings_electricity...")
            c.execute("ALTER TABLE readings_electricity ADD COLUMN meter_id TEXT NOT NULL DEFAULT 'UNKNOWN'")
            print("  -> Column added with default value 'UNKNOWN'")

        # Check if meter_id column already exists in readings_water
        c.execute("PRAGMA table_info(readings_water)")
        water_columns = [col['name'] for col in c.fetchall()]

        if 'meter_id' not in water_columns:
            print("Adding meter_id column to readings_water...")
            c.execute("ALTER TABLE readings_water ADD COLUMN meter_id TEXT NOT NULL DEFAULT 'UNKNOWN'")
            print("  -> Column added with default value 'UNKNOWN'")

        # Check if meter_id column already exists in readings_gas
        c.execute("PRAGMA table_info(readings_gas)")
        gas_columns = [col['name'] for col in c.fetchall()]

        if 'meter_id' not in gas_columns:
            print("Adding meter_id column to readings_gas...")
            c.execute("ALTER TABLE readings_gas ADD COLUMN meter_id TEXT NOT NULL DEFAULT 'UNKNOWN'")
            print("  -> Column added with default value 'UNKNOWN'")

        # Recreate UNIQUE constraints with meter_id
        # First drop old indexes
        try:
            c.execute("DROP INDEX IF EXISTS idx_electricity_date")
            c.execute("DROP INDEX IF EXISTS idx_electricity_period")
            c.execute("DROP INDEX IF EXISTS idx_electricity_meter")
            c.execute("DROP INDEX IF EXISTS idx_water_date")
            c.execute("DROP INDEX IF EXISTS idx_water_period")
            c.execute("DROP INDEX IF EXISTS idx_water_room")
            c.execute("DROP INDEX IF EXISTS idx_gas_date")
            c.execute("DROP INDEX IF EXISTS idx_gas_period")
            c.execute("DROP INDEX IF EXISTS idx_gas_room")
        except Exception:
            pass

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

        conn.commit()
        print("Meter ID migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Meter ID migration failed: {e}")
        raise
    finally:
        conn.close()


def check_meter_id_migration_needed() -> bool:
    """Check if meter_id migration is needed."""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("PRAGMA table_info(readings_electricity)")
        elec_columns = [col['name'] for col in c.fetchall()]

        return 'meter_id' not in elec_columns
    finally:
        conn.close()

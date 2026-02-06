"""
Database migration utilities for restructuring readings into separate tables.
Run this once to migrate from old 'readings' table to new structure.
"""

import sqlite3
import os
from typing import List, Dict, Any
from .db import get_db_connection, DB_PATH

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
            
            if r_type == 'electricity':
                c.execute('''
                    INSERT OR REPLACE INTO readings_electricity 
                    (period, date, meter_name, value)
                    VALUES (?, ?, ?, ?)
                ''', (period, date, meter, value))
                
            elif r_type == 'gas':
                c.execute('''
                    INSERT OR REPLACE INTO readings_gas 
                    (period, date, room, value)
                    VALUES (?, ?, ?, ?)
                ''', (period, date, meter, value))
                
            elif r_type == 'water':
                # Water readings can have warm/cold channels
                # Check if room already exists for this period
                c.execute('''
                    SELECT id, warm_value, cold_value FROM readings_water 
                    WHERE period = ? AND room = ?
                ''', (period, meter))
                existing = c.fetchone()
                
                if existing:
                    # Update existing row
                    warm_val = existing['warm_value']
                    cold_val = existing['cold_value']
                    
                    if channel == 'warm':
                        warm_val = value
                    elif channel == 'cold':
                        cold_val = value
                    
                    total = (warm_val or 0) + (cold_val or 0)
                    
                    c.execute('''
                        UPDATE readings_water 
                        SET warm_value = ?, cold_value = ?, total_value = ?
                        WHERE id = ?
                    ''', (warm_val, cold_val, total if total > 0 else None, existing['id']))
                else:
                    # Insert new row
                    warm_val = value if channel == 'warm' else None
                    cold_val = value if channel == 'cold' else None
                    total = (warm_val or 0) + (cold_val or 0)
                    
                    c.execute('''
                        INSERT INTO readings_water 
                        (period, date, room, warm_value, cold_value, total_value)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (period, date, meter, warm_val, cold_val, total if total > 0 else None))
        
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
                c.execute('''
                    SELECT value FROM readings_electricity
                    WHERE meter_name = ? AND period = ?
                ''', (entity_id, period))
                current_row = c.fetchone()
                
                c.execute('''
                    SELECT value FROM readings_electricity
                    WHERE meter_name = ? AND period < ?
                    ORDER BY period DESC LIMIT 1
                ''', (entity_id, period))
                previous_row = c.fetchone()
                
                if current_row:
                    current_value = current_row['value']
                if previous_row:
                    previous_value = previous_row['value']
                    
            elif entity_type == 'gas':
                # Get current and previous values from readings_gas
                c.execute('''
                    SELECT value FROM readings_gas
                    WHERE room = ? AND period = ?
                ''', (entity_id, period))
                current_row = c.fetchone()
                
                c.execute('''
                    SELECT value FROM readings_gas
                    WHERE room = ? AND period < ?
                    ORDER BY period DESC LIMIT 1
                ''', (entity_id, period))
                previous_row = c.fetchone()
                
                if current_row:
                    current_value = current_row['value']
                if previous_row:
                    previous_value = previous_row['value']
                    
            elif entity_type in ['water_warm', 'water_cold', 'water_total']:
                # Get current and previous values from readings_water
                c.execute('''
                    SELECT warm_value, cold_value FROM readings_water
                    WHERE room = ? AND period = ?
                ''', (entity_id, period))
                current_row = c.fetchone()
                
                c.execute('''
                    SELECT warm_value, cold_value FROM readings_water
                    WHERE room = ? AND period < ?
                    ORDER BY period DESC LIMIT 1
                ''', (entity_id, period))
                previous_row = c.fetchone()
                
                if current_row and previous_row:
                    if entity_type == 'water_warm':
                        current_value = current_row['warm_value']
                        previous_value = previous_row['warm_value']
                    elif entity_type == 'water_cold':
                        current_value = current_row['cold_value']
                        previous_value = previous_row['cold_value']
                    elif entity_type == 'water_total':
                        current_value = (current_row['warm_value'] or 0) + (current_row['cold_value'] or 0)
                        previous_value = (previous_row['warm_value'] or 0) + (previous_row['cold_value'] or 0)
            
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

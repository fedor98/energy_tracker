import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from .models import AppConfig, ReadingInput, ReadingItem

DB_PATH = "/app/data/energy.sqlite"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
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
    
    # Readings table
    # Unique constraint to prevent duplicate readings for same meter/channel/period
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period TEXT NOT NULL,
            date TEXT,
            type TEXT NOT NULL,
            meter TEXT NOT NULL,
            channel TEXT,
            value REAL NOT NULL,
            UNIQUE(period, type, meter, channel)
        )
    ''')
    
    conn.commit()
    conn.close()

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

def save_reading(reading: ReadingInput):
    conn = get_db_connection()
    c = conn.cursor()
    channel = reading.channel if reading.channel else 'default'
    
    c.execute('''
        INSERT OR REPLACE INTO readings (period, date, type, meter, channel, value)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (reading.period, reading.date, reading.type, reading.meter, channel, reading.value))
    
    conn.commit()
    conn.close()

def get_readings(start_period: Optional[str] = None, end_period: Optional[str] = None, type_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    
    query = "SELECT * FROM readings WHERE 1=1"
    params = []
    
    if start_period:
        query += " AND period >= ?"
        params.append(start_period)
    if end_period:
        query += " AND period <= ?"
        params.append(end_period)
    if type_filter:
        query += " AND type = ?"
        params.append(type_filter)
        
    query += " ORDER BY period ASC"
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def backup_and_reset_db():
    import datetime
    import shutil
    
    if os.path.exists(DB_PATH):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{DB_PATH}_backup_{timestamp}.sqlite"
        shutil.move(DB_PATH, backup_path)
        
    init_db()

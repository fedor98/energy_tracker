from typing import List, Dict, Any, Optional
from .models import ReadingItem, ConsumptionItem
from .db import get_readings

def calculate_consumption(type_filter: Optional[str] = None, start_period: Optional[str] = None, end_period: Optional[str] = None) -> List[ConsumptionItem]:
    # We fetch potentially more readings than requested to calculate consumption for the first requested month
    # E.g., if start_period is '2024-02', we need '2024-01' to calculate Feb consumption.
    # For simplicity, we fetch all and filter in python, or we could optimize query. 
    # Since it's local sqlite and "small", fetching all is fine.
    
    all_readings = get_readings() # Fetch all sorted by period
    
    # Structure: readings_by_key[key] = [ {period: '2024-01', value: 100}, ... ]
    readings_by_key = {}
    
    for r in all_readings:
        key = f"{r['type']}|{r['meter']}|{r['channel']}"
        if key not in readings_by_key:
            readings_by_key[key] = []
        readings_by_key[key].append(r)
        
    # Calculate consumption
    results = []
    
    for key, entries in readings_by_key.items():
        # entries are sorted by period due to SQL ORDER BY
        parts = key.split('|')
        r_type, r_meter, r_channel = parts[0], parts[1], parts[2]
        
        # Filter by type if provided
        if type_filter and r_type != type_filter:
            continue
            
        for i in range(len(entries)):
            entry = entries[i]
            consumption = None
            
            # Look ahead for consumption (Forward Difference)
            # Consumption for Period X = Reading(Period X+1) - Reading(Period X)
            # Attributed to Period X
            if i < len(entries) - 1:
                next_entry = entries[i+1]
                consumption = next_entry['value'] - entry['value']
                
                # Handle rollover/reset
                if consumption < 0:
                    consumption = 0 
            
            # Check date range filter based on the entry's period
            if start_period and entry['period'] < start_period:
                continue
            if end_period and entry['period'] > end_period:
                continue
                
            results.append(ConsumptionItem(
                period=entry['period'],
                date=entry['date'],
                type=r_type,
                meter=r_meter,
                channel=r_channel if r_channel != 'default' else None,
                value=entry['value'],
                consumption=consumption
            ))
            
    # Sort results by period, then type, then meter
    results.sort(key=lambda x: (x.period, x.type, x.meter))
    return results

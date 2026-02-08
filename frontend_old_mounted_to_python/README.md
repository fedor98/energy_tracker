# Energy Tracker - Frontend Migration

> Migration von Vanilla JS zu React + TypeScript + Tailwind CSS

## Projektstruktur

```
energy_consumption/
├── backend/                 # FastAPI Backend (bereits migriert)
│   ├── main.py             # Reine API, kein StaticFiles
│   ├── routes.py           # Alle API-Endpunkte unter /api/*
│   └── models.py           # Pydantic Models
│
├── frontend/               # React Frontend (NEU - in Arbeit)
│   ├── app/
│   │   ├── components/     # Wiederverwendbare UI-Komponenten
│   │   ├── lib/           # API-Layer, Utilities
│   │   ├── routes/        # React Router Routes
│   │   └── styles/        # CSS-Komponenten
│   └── nginx/             # Production-Build Serving
│
└── frontend_old_mounted_to_python/  # Legacy Code (Referenz)
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── api.js         # API-Wrapper (gut strukturiert)
        ├── main.js        # Router & App-Logik
        └── views/         # Page-Komponenten
            ├── setup.js
            ├── dashboard.js
            ├── add_reading.js
            ├── edit_reading.js
            └── settings.js
```

## API-Endpunkte (Backend)

### Configuration
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/config` | App-Konfiguration abrufen |
| POST | `/api/config/init` | Initial-Setup speichern |
| POST | `/api/config/reset` | Datenbank reset + Backup |

### Migration
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/migration/status` | Migrations-Status prüfen |
| POST | `/api/migration/run` | Legacy-Daten migrieren |

### Readings (alle Typen)
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/readings/electricity?start=&end=&meter=` | Liste mit Filtern |
| GET | `/api/readings/electricity/{id}` | Einzelnes Reading |
| POST | `/api/readings/electricity` | Neues Reading erstellen |
| PUT | `/api/readings/electricity/{id}` | Reading aktualisieren |
| DELETE | `/api/readings/electricity/{id}` | Reading löschen |
| GET | `/api/readings/water?start=&end=&room=&warm=` | Wasser-Readings |
| GET | `/api/readings/gas?start=&end=&room=` | Gas-Readings |

### Monthly Readings
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/readings/monthly/{period}` | Alle Readings für Monat (YYYY-MM) |

### Maintenance
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/maintenance/reorganize` | Tabellen reorganisieren + Backup |

## Models

### AppConfig
```typescript
interface AppConfig {
  gas: {
    rooms: string[];
  };
  water: Array<{
    room: string;
    is_warm_water: boolean;
  }>;
  electricity: {
    meters: string[];
  };
}
```

### Reading Types
```typescript
interface ElectricityReading {
  id: number;
  date: string;  // YYYY-MM-DD
  meter_name: string;
  value: number;
  period: string;  // YYYY-MM (derived)
  consumption?: number;
  calculation_details?: string;
  comment?: string;
}

interface WaterReading {
  id: number;
  date: string;
  room: string;
  value: number;
  is_warm_water: boolean;
  period: string;
  consumption?: number;
  calculation_details?: string;
  comment?: string;
}

interface GasReading {
  id: number;
  date: string;
  room: string;
  value: number;
  period: string;
  consumption?: number;
  calculation_details?: string;
  comment?: string;
}
```

## Legacy CSS-Referenz

### Wichtige CSS-Variablen
```css
--primary-color: #3b82f6;
--secondary-color: #6b7280;
--success-color: #10b981;
--danger-color: #ef4444;
--bg-color: #f9fafb;
--card-bg: #ffffff;
--text-color: #1f2937;
--text-muted: #6b7280;
--border-color: #e5e7eb;
```

### Wiederverwendbare Klassen
- `.card` - Container mit Schatten und Padding
- `.btn-primary`, `.btn-secondary`, `.btn-danger` - Button-Styles
- `.form-group` - Formular-Feld-Wrapper
- `.data-table` - Tabellen-Styling
- `.dashboard-tabs` - Tab-Navigation

## Migration-Regeln

### Styling
- **Tailwind**: Einmalige/seltene Styles, Layout, Spacing
- **CSS**: Wiederkehrende Patterns (Buttons, Cards, Form-Controls)
- CSS-Dateien klein und fokussiert halten

### Code-Struktur
- Wiederverwendbare Komponenten auslagern
- Ein View = Eine Route
- API-Logik zentral in `lib/api.ts`
- Native HTML Forms + React useState

## Links

- [TODO.md](./TODO.md) - Offene Aufgaben
- [WORKLOG.md](./WORKLOG.md) - Fortschritt
- [Backend Migration](../backend/migration_for_react_frontend.md)

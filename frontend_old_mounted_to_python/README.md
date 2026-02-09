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
│   │   │   ├── dashboard.tsx    # Main dashboard with charts and tables
│   │   │   ├── setup.tsx        # Initial configuration wizard
│   │   │   └── add.tsx          # [NEW] Multi-step reading entry wizard
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
            ├── add_reading.js    # Legacy - migrated to React
            ├── edit_reading.js
            └── settings.js
```

## Migration Status

### Phase 2: Add Reading Route ✅ (2026-02-09) - REDESIGNED

Die `/add` Route wurde erfolgreich von Vanilla JS zu React migriert und anschließend redesigned:

**Ursprüngliche Migration:**
- **Legacy**: `js/views/add_reading.js` (135 Zeilen)
- **Erste Version**: Linearer 4-Schritt Wizard mit StepIndicator

**Redesign mit Accordion-Struktur:**
- **Neu**: Accordion-Layout (einheitlich mit Setup)
- **Struktur**: Date Card (oben) → Electricity → Water → Gas (AccordionSections)
- **Setup-Komponenten**: Erweitert mit `mode='reading'` für Dual-Use

#### Erweiterte Komponenten (Setup + Reading Mode)
- `ElectricityMeterForm.tsx` - Unterstützt 'setup' und 'reading' Modus
- `WaterMeterForm.tsx` - Unterstützt 'setup' und 'reading' Modus
- `GasMeterForm.tsx` - Unterstützt 'setup' und 'reading' Modus

#### Features
- Accordion pattern (nur eine Section gleichzeitig offen)
- Badge zeigt Anzahl eingegebener Readings pro Typ
- Validierung: Mindestens ein Reading erforderlich
- Atomic save via Bulk API
- Gelöscht: `StepIndicator.tsx`, `ReadingForm.tsx`
- **Neu**: Graue Boxen (bg-gray-50) und Zaehlernummer-Badges für jeden Meter

#### Dashboard-Updates
- Neue Action-Buttons: "Add Reading" (+ Icon) und "Reset Meter" (↻ Icon)
- Responsive Layout unter der Filter Card
- Pill-shaped Design mit dezenten Farben
- Icons via `lucide-react` Library

### Phase 3: Reset Meter Route ✅ (2026-02-09) - COMPONENT REFACTORING

Die `/reset` Route wurde implementiert und anschließend refactored:

**Initial-Implementation:**
- Accordion-Layout (einheitlich mit Setup/Add)
- Inline JSX für alle drei Meter-Typen
- 2 Input-Felder pro Meter: Last Reading + Reset Value
- Orange Save-Button (Unterscheidung von Add Reading)

**Component Refactoring:**
- MeterForm-Komponenten um 'reset' mode erweitert
- Inline JSX durch wiederverwendbare Komponenten ersetzt
- Code-Reduktion: ~450 Zeilen → ~250 Zeilen

#### Drei-Mode-System
- `mode='setup'` - Konfiguration von Metern (Hinzufügen/Entfernen)
- `mode='reading'` - Eingabe von Zählerständen (1 Feld pro Meter)
- `mode='reset'` - Meter-Resets (2 Felder: Last Reading + Reset Value)

#### Design-Verbesserungen
- Graue Boxen (bg-gray-50 rounded-lg p-4) für jeden Meter
- Zaehlernummer-Badge oben rechts (bg-gray-200)
- Water: Emojis (🔴/🔵) statt Text für Warm/Kalt
- Einheitliches Design zwischen /add und /reset

### Phase 4: Generic Meter Form Architecture ✅ (2026-02-09)

**Problem:** Massive Code-Duplikation in den drei MeterForm-Komponenten (~85% identisch)

**Lösung:** Vollständige Refactoring auf generische Architektur

#### Neue Struktur
```
frontend/app/components/meter-forms/
├── types.ts                 # Gemeinsame Typen & Konfiguration
├── GenericMeterForm.tsx     # Hauptkomponente (Strategy Pattern)
├── SetupModeRenderer.tsx    # Setup-Modus UI
├── ReadingModeRenderer.tsx  # Reading-Modus UI
├── ResetModeRenderer.tsx    # Reset-Modus UI
├── useMeterForm.ts          # Custom Hooks
└── index.ts                 # Barrel Export
```

#### Code-Reduktion
| Datei | Vorher | Nachher | Einsparung |
|-------|--------|---------|------------|
| GasMeterForm.tsx | 244 | 49 | -80% |
| WaterMeterForm.tsx | 267 | 49 | -82% |
| ElectricityMeterForm.tsx | 244 | 49 | -80% |
| **Gesamt** | **755** | **147** | **-81%** |

#### Implementierte Patterns
- **Strategy Pattern**: Modus-spezifisches Rendering
- **Configuration-Driven**: `METER_TYPE_CONFIGS` Record
- **Generic Types**: TypeScript Generics für Type-Safety
- **Composition**: UI-Komponenten komponierbar

#### Vorteile
- ✨ DRY-Prinzip: UI-Code zentralisiert
- 🔧 Wartbarkeit: Design-Änderungen an einer Stelle
- 🚀 Erweiterbarkeit: Neue Typen in ~50 Zeilen
- ✅ Type-Safe: Compile-time Checks
- 🧪 Testbar: Renderer einzeln testbar

### TODOs
- [ ] Reset Meter Button: Funktionalität implementieren
- [ ] Edit Reading Route erstellen
- [ ] Settings Route erstellen

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

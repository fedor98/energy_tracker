# TODO - Frontend Migration

## Abgeschlossen ✅

### Phase 1: Setup & Foundation
- [x] Chart.js installieren
- [x] API-Layer erstellen (`frontend/app/lib/api.ts`)
- [x] UI-Komponenten-Struktur aufsetzen
  - [x] Button-Komponente
  - [x] Card-Komponente
  - [x] Input-Komponente
  - [x] Table-Komponente
  - [x] Tabs-Komponente

### Phase 2: Dashboard Layout
- [x] Dashboard Route erstellen (`/`)
- [x] Responsive Layout (Mobile + Desktop)
- [x] Filter-Section (Start/End Month)
- [x] Tab-Navigation mit korrektem Layout:
  - [x] 5 Tabs: Consumption, Calc, Electricity, Water, Gas
  - [x] Desktop: Consumption & Calc links, Rest rechts
  - [x] Mobile: 2 Zeilen (Consumption/Calc | Electricity/Water/Gas)
  - [x] Englische Tab-Namen
  - [x] Tabs nur oben abgerundet
- [x] Cumulated Water Checkbox (nur in Consumption Tab)
- [x] Skeleton Loading States
- [x] Error Handling
- [x] Header mit Indigo-Farben

## In Bearbeitung 🔄

### Phase 2: Dashboard Tab-Inhalte
- [x] **Tab: Consumption** 
  - [x] Chart.js Line-Chart
  - [x] 3 Datasets (Electricity, Water, Gas)
  - [x] Responsive Chart-Container (300px mobile, 400px desktop)
  - [x] Cumulated/Split water toggle support
- [x] **Tab: Calc**
  - [x] Three calculation tables (Electricity, Water, Gas)
  - [x] Dynamic columns based on meter count
  - [x] Period, Consumption, Segments, Total columns
  - [x] Water meter emoji indicators (🔴/🔵)
- [x] **Tab: Electricity**
  - [x] Data Table with monthly grouping
  - [x] Columns: Date, Meter, Value
  - [x] Visual separators between months
- [x] **Tab: Water**
  - [x] Data Table with monthly grouping
  - [x] Warm/Cold indicators (🔴/🔵)
- [x] **Tab: Gas**
  - [x] Data Table with monthly grouping
  - [x] Columns: Date, Room, Value

## Offen 📋

### Phase 2: Core Routes (Fortsetzung)
- [x] **Setup-Wizard** (`/setup`)
  - [x] Step 0: Intro/Welcome with custom meter ID toggle
  - [x] Step 1: Electricity Konfiguration (name-based)
  - [x] Step 2: Water Konfiguration (room + warm/cold toggle)
  - [x] Step 3: Gas Konfiguration (room-based)
  - [x] Akkordeon-Ansicht (nur ein Bereich offen)
  - [x] Speichern der Config via API
  - [x] Enter-Taste zum Hinzufügen
- [x] **Add Reading** (`/add`) - REDESIGNED
  - [x] Accordion-Layout (einheitlich mit Setup)
  - [x] Date Section (ohne Billing Period)
  - [x] Electricity/Water/Gas Accordion Sections
  - [x] Badge zeigt Anzahl eingegebener Readings
  - [x] Validierung: Mindestens ein Reading erforderlich
  - [x] Speichern der Readings via Bulk API
  - [x] Date-Picker: Ganze Fläche klickbar
  - [x] Water: Emojis (🔴/🔵) statt Text für Warm/Kalt

### Phase 3: Additional Routes
- [x] **Reset Meter** (`/reset`)
  - [x] Route registriert in routes.ts
  - [x] Accordion-Layout (einheitlich mit Setup/Add)
  - [x] Date Picker für Reset-Datum
  - [x] Electricity-Section: Last Reading + Reset Value (default 0)
  - [x] Water-Section: Last Reading + Reset Value pro Zähler (warm/kalt)
  - [x] Gas-Section: Last Reading + Reset Value
  - [x] Badge zeigt Anzahl konfigurierter Resets
  - [x] API-Integration: POST /api/readings/reset
  - [x] Validierung: Mindestens ein Reset erforderlich
  - [x] Orange Save-Button (unterscheidet sich von Add Reading)
  - [x] Refactoring: Nutzt jetzt MeterForm-Komponenten (reset mode)
  - [x] Einheitliches Design: Graue Boxen + Zaehlernummer-Badges
  - [x] Water: Emojis (🔴/🔵) statt Text für Warm/Kalt
- [x] **Edit Reading** (`/edit?date=YYYY-MM-DD&period=YYYY-MM`)
  - [x] Route registriert in routes.ts
  - [x] Accordion-Layout (einheitlich mit Add/Reset)
  - [x] Tagesbasiertes Editieren aller Messwerte
  - [x] Datum editierbar (verschiebt alle Einträge)
  - [x] Reset-Einträge markiert mit Badge
  - [x] Integration mit GenericMeterForm (edit mode)
  - [x] Success-Messages und verbesserter Loading-State
- [x] **Settings** (`/settings`)
  - [x] Database Maintenance: Backup & Reorganize
  - [x] Recalculate Consumption: Alle Verbrauchswerte neu berechnen
  - [x] Restore from Backup: Wiederherstellung aus Backups
  - [x] Danger Zone: App Data Reset (von Dashboard hierher verschoben)
  - [x] About: Versionsinformationen
  - [x] Settings-Button im Dashboard Header

### Phase 4: Edit & Delete Flow ✅
- [x] **Dashboard Table Actions**
  - [x] Actions-Spalte mit drei Punkte Menü
  - [x] Edit-Option (navigation zu /edit)
  - [x] Delete-Option (öffnet Confirmation Dialog)
- [x] **Delete Confirmation Dialog**
  - [x] Modal mit Zusammenfassung (Anzahl pro Energietyp)
  - [x] Bestätigung erforderlich
  - [x] API-Integration: DELETE /api/readings/by-date/{date}
- [x] **Backend API-Endpunkte**
  - [x] GET /api/readings/by-date/{date}
  - [x] PUT /api/readings/by-date/{date}
  - [x] DELETE /api/readings/by-date/{date}
  - [x] GET /api/readings/by-date/{date}/count

### Phase 5: Layout Components ✅
- [x] **Accordion Page Layout Components**
  - [x] PageLayout: Haupt-Wrapper mit Header, Messages, Loading
  - [x] DateSection: Date-Picker mit grauem Hintergrund
  - [x] FormFooter: Cancel/Save Buttons mit Counter
  - [x] Barrel Export für einfache Imports
- [x] **Route Refactoring**
  - [x] Add-Route umgestellt auf Layout Components
  - [x] Reset-Route umgestellt auf Layout Components  
  - [x] Edit-Route umgestellt auf Layout Components
  - [x] Code-Reduktion: ~30% weniger Code pro Route

### Phase 4: Navigation & Layout
- [ ] Header mit Navigation
- [ ] Aktive Route hervorheben
- [x] Setup-Redirect Logik (wenn keine Config)
  - [x] Dashboard redirectet zu /setup wenn keine Config
  - [x] Setup redirectet zu / wenn Config existiert
- [x] Dashboard Action Buttons
  - [x] "Add Reading" Button (grün, pill-shaped)
  - [x] "Reset Meter" Button (orange, pill-shaped) → Navigation zu /reset
  - [x] Position: Unter der Filter Card
  - [x] Icons via lucide-react
- [ ] Responsive Design (final check)

### Phase 5: Testing & Polish
- [ ] API-Integration testen
- [ ] Error Boundaries
- [x] Form-Validierung (Add Reading)
- [x] Komponenten-Refactoring
  - [x] Setup-Komponenten erweitert (Dual-Mode: setup/reading)
  - [x] Umbenennung: [Type]Setup → [Type]MeterForm
  - [x] Gelöscht: StepIndicator.tsx, ReadingForm.tsx

## Backend-Änderungen (Reset-Feature)

### API-Endpunkte
- **POST `/api/readings/reset`** - Meter-Resets erstellen
  - Request: `MeterResetsInput` mit Datum und Resets für Electricity/Water/Gas
  - Response: `ResetResult` mit Status und Anzahl erstellter Einträge
  - Erstellt pro Reset 2 Einträge: (1) Last Reading, (2) Reset Value (1 Min. zeitversetzt)

### Datenbank-Schema
- **TEMPORÄRE ÄNDERUNG** (muss später entfernt werden!):
  - `is_reset` BOOLEAN-Spalte zu allen readings-Tabellen hinzugefügt
  - Standardwert: 0 (false)
  - Reset-Einträge: is_reset = 1

### Modelle (backend/models.py)
- `ElectricityResetInput` - Reset für Stromzähler
- `WaterResetInput` - Reset für Wasserzähler (inkl. warm/kalt)
- `GasResetInput` - Reset für Gaszähler
- `MeterResetsInput` - Container für alle Resets
- `ResetResult` - API-Response

### Frontend-API (frontend/app/lib/api.ts)
- `saveResets(resets: MeterResetsInput)` - POST Request zum Backend

## Legacy-Referenzdateien

### JavaScript
- `js/api.js` - Alle API-Funktionen
- `js/main.js` - Router & Initialisierung
- `js/views/setup.js` - Setup-Wizard
- `js/views/dashboard.js` - Dashboard mit Chart.js
- `js/views/add_reading.js` - Add Reading Wizard
- `js/views/edit_reading.js` - Edit Reading
- `js/views/settings.js` - Settings Page

### CSS
- `css/styles.css` - Alle Styles (18KB)

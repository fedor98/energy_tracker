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
- [ ] **Setup-Wizard** (`/setup`)
  - [ ] Step 0: Intro/Welcome
  - [ ] Step 1: Electricity Konfiguration
  - [ ] Step 2: Water Konfiguration
  - [ ] Step 3: Gas Konfiguration
  - [ ] Speichern der Config
- [ ] **Add Reading** (`/add`)
  - [ ] Step 1: Date Selection
  - [ ] Step 2: Electricity Readings
  - [ ] Step 3: Water Readings
  - [ ] Step 4: Gas Readings
  - [ ] Speichern der Readings

### Phase 3: Additional Routes
- [ ] **Edit Reading** (`/edit/:period`)
  - [ ] Bestehende Readings laden
  - [ ] Bearbeiten & Speichern
- [ ] **Settings** (`/settings`)
  - [ ] Config anzeigen
  - [ ] Reset-Funktion (von Dashboard hierher verschoben)

### Phase 4: Navigation & Layout
- [ ] Header mit Navigation
- [ ] Aktive Route hervorheben
- [ ] Setup-Redirect Logik (wenn keine Config)
- [ ] Responsive Design (final check)

### Phase 5: Testing & Polish
- [ ] API-Integration testen
- [ ] Error Boundaries
- [ ] Form-Validierung

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

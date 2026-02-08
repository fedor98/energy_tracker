# TODO - Frontend Migration

## In Bearbeitung
- [ ] **Phase 1: Setup & Foundation**
  - [x] Chart.js installieren
  - [x] API-Layer erstellen (`frontend/app/lib/api.ts`)
  - [x] UI-Komponenten-Struktur aufsetzen
    - [x] Button-Komponente
    - [x] Card-Komponente
    - [x] Input-Komponente
    - [x] Table-Komponente
    - [x] Tabs-Komponente

## Offen - Phase 1: Setup & Foundation
- [ ] Chart.js installieren (`npm install chart.js @types/chart.js`)
- [ ] API-Layer erstellen (`frontend/app/lib/api.ts`)
- [ ] UI-Komponenten-Struktur aufsetzen
  - [ ] Button-Komponenten
  - [ ] Card-Komponente
  - [ ] Input-Komponenten
  - [ ] Table-Komponente

## Offen - Phase 2: Core Routes
- [ ] **Setup-Wizard** (`/setup`)
  - [ ] Step 0: Intro/Welcome
  - [ ] Step 1: Electricity Konfiguration
  - [ ] Step 2: Water Konfiguration
  - [ ] Step 3: Gas Konfiguration
  - [ ] Speichern der Config
- [ ] **Dashboard** (`/`)
  - [ ] Filter (Start/End Month)
  - [ ] Tab: Consumption (Chart.js)
  - [ ] Tab: Electricity (Table)
  - [ ] Tab: Water (Table)
  - [ ] Tab: Gas (Table)
  - [ ] Reset App Data Button
- [ ] **Add Reading** (`/add`)
  - [ ] Step 1: Date Selection
  - [ ] Step 2: Electricity Readings
  - [ ] Step 3: Water Readings
  - [ ] Step 4: Gas Readings
  - [ ] Speichern der Readings

## Offen - Phase 3: Additional Routes
- [ ] **Edit Reading** (`/edit/:period`)
  - [ ] Bestehende Readings laden
  - [ ] Bearbeiten & Speichern
- [ ] **Settings** (`/settings`)
  - [ ] Config anzeigen
  - [ ] Reset-Funktion

## Offen - Phase 4: Navigation & Layout
- [ ] Header mit Navigation
- [ ] Aktive Route hervorheben
- [ ] Setup-Redirect Logik (wenn keine Config)
- [ ] Responsive Design

## Offen - Phase 5: Testing & Polish
- [ ] API-Integration testen
- [ ] Error Boundaries
- [ ] Loading States
- [ ] Form-Validierung
- [ ] Mobile Responsiveness

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

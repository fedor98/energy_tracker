# Backend Migration

## Umgesetzte Änderungen (Phase 1)

### 1. app/main.py
- **Entfernt:** Import `StaticFiles` und `FileResponse`
- **Entfernt:** Mount `/static` für Frontend-Assets
- **Entfernt:** Root-Route `/` (served index.html)
- **Entfernt:** Catch-all Route `/{full_path:path}` (SPA routing)

**Vorher:** 55 Zeilen  
**Nachher:** 39 Zeilen

### 2. Dockerfile
- **Entfernt:** `COPY ./frontend ./frontend`
- Frontend wird nicht mehr ins Docker Image kopiert

## Verbleibende API-Endpunkte

Alle JSON-APIs unter `/api/*` bleiben erhalten:
- `GET/POST /api/config`
- `GET/POST /api/migration/*`
- `GET/POST/PUT/DELETE /api/readings/electricity|water|gas`
- `GET /api/readings/monthly/{period}`
- `POST /api/maintenance/reorganize`

## Hinweise für Frontend-Migration

### API-URLs
- Backend-APIs sind jetzt strikt unter `/api/*` erreichbar
- Keine HTML-Auslieferung mehr vom Backend
- Root-Route `/` gibt 404 zurück (muss vom React-Router/Nginx gehandhabt werden)

### Statische Assets
- CSS/JS-Dateien werden nicht mehr vom Backend ausgeliefert
- Frontend-Ordner ist nicht mehr im Docker Image vorhanden
- React-Build muss separat gebaut und serviert werden

### Weiterführende Schritte
- CORS für React-Frontend konfigurieren (Phase 2)
- Nginx als Reverse Proxy einrichten
- API-Endpunkte mit curl/Postman testen
- Nginx-Routing validieren

## 🚀 New Deployment
**Docker Image Version:** `{{VERSION}}`

**Pull Command:**
```bash
docker pull {{FULL_IMAGE}}:{{VERSION}}
```

---

### 🐳 Docker Compose

Quick start with Docker Compose:

```yaml
services:
  app:
    image: {{FULL_IMAGE}}:{{VERSION}}
    container_name: energy_tracker-app
    ports:
      - "8080:80"
    volumes:
      # Persist SQLite database
      - ./backend/data:/app/data
    restart: unless-stopped
```

Save as `docker-compose.yml` and run:
```bash
docker compose up -d
```

---

### 🆕 Added
- [Click edit to add new features]

### 🛠️ Fixed
- [Click edit to add bug fixes]

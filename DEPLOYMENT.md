# Deploying SRMS

The app is a single Spring Boot service: it serves the REST API **and** the front-end,
so you deploy one thing. Below are the easiest paths first.

> ⚠️ **SQLite + free tiers = ephemeral data.** SQLite stores everything in a single file
> (`srms.db`). On free hosting the container's disk is wiped on every restart/redeploy, so
> your data resets to the demo seed each time. That's fine for a demo/portfolio. To keep
> data permanently you need a **persistent disk** (a paid add-on on Render/Railway) or a
> VPS. See each section below.

---

## Option 1 — Render (recommended)

Render builds straight from your GitHub repo using the included `Dockerfile`.

**A. Quick way (Blueprint):**
1. Push this repo to GitHub (it already is at `student-result-management-system`).
2. In Render: **New + → Blueprint**, select the repo. Render reads `render.yaml`.
3. Click **Apply**. First build takes a few minutes.
4. Open the generated `https://srms-xxxx.onrender.com` URL.

**B. Manual way (dashboard):**
1. **New + → Web Service** → connect the repo.
2. **Runtime: Docker** (Render auto-detects the `Dockerfile`). No build/start command needed.
3. Create the service. Done.

**Persistence:** `render.yaml` defines a 1 GB persistent disk mounted at `/var/data` and
sets `SRMS_DB_PATH=/var/data/srms.db`. Persistent disks require a **paid instance type**.
On the **free** plan, delete the `disk:` block and the `SRMS_DB_PATH` env var from
`render.yaml` (data then lives on ephemeral disk and re-seeds on restart).

---

## Option 2 — Railway

1. **New Project → Deploy from GitHub repo.** Railway detects the `Dockerfile`.
2. It builds and deploys automatically. Railway injects `PORT` (the app already reads it).
3. Under **Settings → Networking**, generate a public domain.
4. **Persistence:** add a **Volume** mounted at e.g. `/var/data`, then add a variable
   `SRMS_DB_PATH=/var/data/srms.db` so the database lives on the volume.

---

## Option 3 — Docker anywhere

```bash
# build the image
docker build -t srms .

# run it; keep data in a named volume so it survives restarts
docker run -p 8080:8080 \
  -e SRMS_DB_PATH=/data/srms.db \
  -v srms_data:/data \
  srms

# open http://localhost:8080
```

Works on any Docker host (Fly.io, a VPS, your laptop).

---

## Option 4 — VPS (DigitalOcean, EC2, etc.)

You control the box, so SQLite persistence is free and easy.

```bash
# on the server (needs JDK 17+)
git clone https://github.com/shivansh987654321/student-result-management-system.git
cd student-result-management-system
mvn clean package -DskipTests
SRMS_DB_PATH=/var/lib/srms/srms.db java -jar target/srms.jar
```

Put it behind Nginx and run it as a `systemd` service for production. Point a domain at the
server and add TLS (e.g. with Certbot).

---

## Configuration reference

| Env var        | Default    | Purpose                                            |
|----------------|------------|----------------------------------------------------|
| `PORT`         | `8080`     | HTTP port (Render/Railway set this automatically)  |
| `SRMS_DB_PATH` | `srms.db`  | Path to the SQLite file; point at a persistent disk |

---

## Don't want a backend after all?

The pre-backend, browser-only version (everything in `localStorage`, no server) is still
in git history at commit **5309833** ("Add Student Result Management System"). You can check
out those files and deploy them as a pure static site (GitHub Pages / Netlify) if you ever
want the zero-backend version back.

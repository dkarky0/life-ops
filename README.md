# Life Ops

Shared household assistant for places, chores, parents’ care, payments, consumable trackers (milk / gas cylinder), Quick Capture, and AI chat + voice.

Designed to run on your **Home Assistant** host (Docker / Portainer) so you and your partner use the same data from Android PWAs — and so **Daily Panchang** can sync tasks and shopping via HTTPS.

## Features

- **Today** — overdue, due today, upcoming, cylinder alerts, snooze / done
- **Places** — save shops while traveling; GPS + Open in Maps
- **Tasks / Care / Dates / Payments** — assignees, recurrence roll-forward
- **Trackers** — gas install → due/overdue history; milk liters by date range → monthly qty + ₹
- **Shopping** — shared grocery checklist
- **Quick Capture** — pin `/capture` to the home screen
- **Assistant** — chat + mic; confirm-before-save; OpenAI / Gemini compatible
- **Activity + backup** — see who did what; JSON export
- **Sync API** — for Daily Panchang calendar + widget (`/api/sync`)

## Quick start (local)

```bash
git clone https://github.com/dkarky0/life-ops.git
cd life-ops
npm install
npm run dev -- -p 43127 -H 0.0.0.0
```

Open http://127.0.0.1:43127

Demo logins (seeded on first run — **change these in production**):

| Member  | PIN  |
|---------|------|
| You     | 1234 |
| Partner | 5678 |

### Optional AI

```bash
# Gemini
export LIFEOPS_API_KEY=your-google-ai-studio-key
export LIFEOPS_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
export LIFEOPS_LLM_MODEL=gemini-2.0-flash

# or OpenAI
export LIFEOPS_API_KEY=sk-...
export LIFEOPS_LLM_BASE_URL=https://api.openai.com/v1
export LIFEOPS_LLM_MODEL=gpt-4o-mini
```

Or configure the key in **Settings** after login.

---

## Deploy on Home Assistant (recommended)

Full guide: [docs/HA_DEPLOY.md](docs/HA_DEPLOY.md)

### Architecture

```text
Phone (Panchang + Chrome PWA)
  → Cloudflare (lifeops.your-domain)
  → Nginx Proxy Manager
  → Life Ops Docker :43127 on HA host
  → SQLite volume
```

Prefer a **subdomain** (simplest):

```text
https://lifeops.dktech.co.in  →  http://192.168.1.8:43127
```

### Option A — Portainer

1. Copy this repo onto the HA host (home Wi‑Fi PC):

```bash
git clone https://github.com/dkarky0/life-ops.git
rsync -av --exclude node_modules --exclude .next --exclude data \
  ./life-ops/ deepak01@192.168.1.8:~/lifeops/
```

2. Portainer → **Stacks** → **Add stack** → name `lifeops`  
   Use compose from [`deploy/portainer-stack.yml`](deploy/portainer-stack.yml) with build context `~/lifeops`.

3. Set environment variables in Portainer (at least change PINs):

| Variable | Example |
|----------|---------|
| `LIFEOPS_MEMBER1_PIN` | your PIN |
| `LIFEOPS_MEMBER2_PIN` | partner PIN |
| `LIFEOPS_API_KEY` | Gemini/OpenAI key (optional) |
| `LIFEOPS_LLM_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `LIFEOPS_LLM_MODEL` | `gemini-2.0-flash` |

4. Deploy. Verify on the HA host:

```bash
docker ps | grep lifeops
curl -s http://127.0.0.1:43127/api/auth
```

5. **Nginx Proxy Manager** — Proxy Host:

| Field | Value |
|--------|--------|
| Domain | `lifeops.dktech.co.in` |
| Forward | `http://192.168.1.8:43127` |
| SSL | Let’s Encrypt / Cloudflare |

6. Cloudflare DNS: `lifeops` → same target as `ha`.

### Option B — SSH / docker compose on the HA host

```bash
ssh deepak01@192.168.1.8
cd ~/lifeops   # after rsync/clone
cp .env.example .env   # edit PINs and API key
docker compose up -d --build
```

Or from a home-WiFi laptop using the helper (do **not** commit passwords):

```bash
export HA_HOST=192.168.1.8
export HA_USER=deepak01
export HA_PASS='…'
export LIFEOPS_API_KEY='…'
bash scripts/deploy-ha-ssh.sh
```

### After deploy — Panchang / phone

| App | Setting |
|-----|---------|
| Chrome PWA | Open `https://lifeops.dktech.co.in` → Install app |
| Daily Panchang | Base URL `https://lifeops.dktech.co.in` · PIN = your Life Ops PIN |

Sync API docs: [docs/PANCHANG_SYNC_API.md](docs/PANCHANG_SYNC_API.md)

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `LIFEOPS_API_KEY` | LLM API key |
| `LIFEOPS_LLM_BASE_URL` | OpenAI-compatible base URL |
| `LIFEOPS_LLM_MODEL` | Model id |
| `LIFEOPS_MEMBER1_NAME` / `LIFEOPS_MEMBER1_PIN` | First member (seed only) |
| `LIFEOPS_MEMBER2_NAME` / `LIFEOPS_MEMBER2_PIN` | Second member (seed only) |
| `LIFEOPS_COOKIE_SECURE` | `true` behind HTTPS |
| `LIFEOPS_BASE_PATH` | Only if you must serve under a path like `/life-ops` (rebuild required) |
| `LIFEOPS_DATA_DIR` | SQLite directory (default `/data` in Docker) |

PIN env vars apply on **first database seed** only.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` / `npm start` | Production |
| `npm run lint` | ESLint |
| `docker compose up -d --build` | HA / Docker host |
| `bash scripts/deploy-ha-ssh.sh` | Upload + compose from LAN |

## License

MIT

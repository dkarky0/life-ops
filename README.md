# Life Ops

Shared household assistant for places, chores, parents’ care, payments, consumable trackers (milk / gas cylinder), Quick Capture, and AI chat + voice.

Designed to run behind **Home Assistant** (LAN or Nabu Casa) so you and your partner use the same data on Android PWAs.

## Features

- **Today** — overdue, due today, upcoming, cylinder alerts, snooze / done
- **Places** — save shops while traveling; Open in Maps
- **Tasks / Care / Dates / Payments** — assignees, recurrence roll-forward
- **Trackers** — gas install → due/overdue history; milk liters by date range → monthly qty + ₹
- **Shopping** — shared grocery checklist
- **Quick Capture** — pin `/capture` to the home screen
- **Assistant** — chat + mic; confirm-before-save; tools over your data
- **Activity + backup** — see who did what; JSON export

## Quick start (local)

```bash
npm install
npm run dev -- -p 43127 -H 0.0.0.0
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127)

Demo logins (seeded on first run):

| Member  | PIN  |
|---------|------|
| You     | 1234 |
| Partner | 5678 |

Optional AI (chat/voice filing) — OpenAI-compatible providers only:

```bash
# OpenAI
export LIFEOPS_API_KEY=sk-...
export LIFEOPS_LLM_BASE_URL=https://api.openai.com/v1
export LIFEOPS_LLM_MODEL=gpt-4o-mini

# Google Gemini (OpenAI-compatible endpoint)
export LIFEOPS_API_KEY=your-google-ai-studio-key
export LIFEOPS_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
export LIFEOPS_LLM_MODEL=gemini-2.0-flash
```

Or pick **OpenAI / Gemini / OpenRouter / Custom** in **Settings** after login.

**Cursor API:** not supported — Cursor does not expose a public chat-completions API for apps like this.

## Home Assistant deploy (recommended)

**Architecture:** Life Ops runs as Docker on the HA host (Portainer preferred). Daily Panchang on your phone talks to the same HTTPS URL.

Full guide: [`docs/HA_DEPLOY.md`](docs/HA_DEPLOY.md)

Quick path:

1. On the HA host (LAN): `docker compose up -d --build` (or Portainer stack from [`deploy/portainer-stack.yml`](deploy/portainer-stack.yml))
2. Nginx Proxy Manager: `lifeops.dktech.co.in` → `http://192.168.1.8:43127`
3. Panchang Base URL: `https://lifeops.dktech.co.in` · PIN: your household PIN

| Variable | Purpose |
|----------|---------|
| `LIFEOPS_API_KEY` | OpenAI-compatible / Gemini key |
| `LIFEOPS_MEMBER1_NAME` / `LIFEOPS_MEMBER1_PIN` | First member (defaults You / 1234) |
| `LIFEOPS_MEMBER2_NAME` / `LIFEOPS_MEMBER2_PIN` | Second member (defaults Partner / 5678) |
| `LIFEOPS_BASE_PATH` | Only if you must serve under a path like `/life-ops` (rebuild required) |

SQLite persists on the `lifeops-data` volume. PIN env vars apply on **first** DB seed only.

## Android install

1. Open the HA URL in **Chrome**.
2. Menu → **Install app** / Add to Home screen.
3. Also add a shortcut to **`/capture`** for one-tap Quick Capture.
4. Allow microphone for voice on Assistant / Capture.

## Data

- Stored in SQLite under `data/lifeops.sqlite` (local) or the Docker volume.
- **Settings → Download JSON backup** for an export.

## Scripts

- `npm run dev` — development
- `npm run build` / `npm start` — production
- `npm run lint` — ESLint

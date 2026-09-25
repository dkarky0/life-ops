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

Optional AI (chat/voice filing):

```bash
export LIFEOPS_API_KEY=sk-...
# optional
export LIFEOPS_LLM_BASE_URL=https://api.openai.com/v1
export LIFEOPS_LLM_MODEL=gpt-4o-mini
```

Or paste the key in **Settings** after login.

## Docker (Home Assistant host)

```bash
docker compose up -d --build
```

Service listens on **43127**. Point Nginx Proxy Manager / HA ingress at it, e.g. `https://home.example/life-ops/` → `http://lifeops:43127`.

Environment (compose or Portainer):

| Variable | Purpose |
|----------|---------|
| `LIFEOPS_API_KEY` | OpenAI-compatible key |
| `LIFEOPS_MEMBER1_NAME` / `LIFEOPS_MEMBER1_PIN` | First member (defaults You / 1234) |
| `LIFEOPS_MEMBER2_NAME` / `LIFEOPS_MEMBER2_PIN` | Second member (defaults Partner / 5678) |
| `LIFEOPS_DATA_DIR` | SQLite folder (default `/data` in container) |

SQLite persists on the `lifeops-data` volume.

**Note:** Member PIN env vars apply only on **first** database seed. Change PINs by resetting the volume or updating hashes later.

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

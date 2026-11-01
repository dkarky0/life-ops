# Paste this into the Daily Panchang Cursor agent

Repo: `deepak-kaushik/daily-panchang`  
Browse: https://cursor.com/codebase/deepak-kaushik/daily-panchang

---

## Prompt (copy everything below)

```text
We need to integrate this Daily Panchang Android app with our household Life Ops backend (Memoria / Life Ops PWA on Home Assistant).

## Goals
1. Sync Life Ops due items (tasks, care, payments, important dates, gas-cylinder due alerts) onto the Hindu calendar day view AND the existing home-screen widget.
2. From Panchang, allow adding a task / reminder / shopping item into Life Ops.
3. If that item already exists in Life Ops, UNCHECK / COMPLETE it instead of creating a duplicate.
4. Do NOT overwrite or replace panchang festivals / tithi data — only manage events tagged as Life Ops.

## Life Ops is source of truth for household ops
Panchang keeps religious calendar data. Life Ops owns tasks/shopping/reminders.

## Life Ops sync API (already implemented)
Base URL will be configured in app settings, preferably a subdomain on the HA host:
e.g. https://lifeops.dktech.co.in  (Nginx Proxy Manager → host:43127)
LAN fallback while testing: http://192.168.1.8:43127

### Auth
1. GET /api/auth → list members
2. POST /api/auth { "memberId", "pin" } → { token, member }
3. All sync calls: header Authorization: Bearer <token>

### Pull
GET /api/sync?since=<optional ISO>
Returns:
- items[]: open items with id, type, title, notes, dueAt, status, amount, shoppingLines?, updatedAt
- completed[]: recently done (when since provided)
- trackerAlerts[]: gas cylinder etc. with dueAt/overdue

### Push
POST /api/sync
- { "action":"upsert", "type":"task"|"care"|"date"|"payment"|"shopping", "title":"...", "dueAt":"YYYY-MM-DD", "notes":"" }
  → if open item with same type+normalized title exists: COMPLETE it; else CREATE it
- { "action":"shopping", "text":"Milk", "toggleIfExists":true }
  → add line, or toggle done if same text exists
- { "action":"complete", "id":"<lifeops-id>" }

Full contract: in the Life Ops/memoria repo at docs/PANCHANG_SYNC_API.md

## Implementation plan for THIS Android repo
Phase 1:
- Settings screen: Life Ops base URL + member PIN login; store token securely
- Sync worker (WorkManager): periodic + on app resume; pull /api/sync; upsert local calendar events tagged:
  lifeops:id=...
  lifeops:type=...
  source=lifeops
- Show these on the day detail list and home widget with a distinct color/icon from festivals
- Remove or mark done local Life Ops events when they appear in completed[] or disappear from open items

Phase 2:
- Day detail / long-press quick actions: Add task, Add reminder (due = selected Gregorian day), Buy item
- Parse prefixes BUY:/TASK:/REMIND: if user types free text
- Call upsert/shopping APIs; refresh local list
- On shopping/task duplicate, show snackbar “Checked off in Life Ops” / “Marked done”

Phase 3:
- Tap Life Ops event → Complete → POST complete by id; update widget
- Offline queue for writes when HA unreachable

## Constraints
- Match existing architecture (Kotlin/Room/Flutter/etc. — inspect the repo and follow it)
- Keep Hindu date calculations unchanged
- Use HTTPS when talking to Nabu Casa; allow cleartext only for LAN debug builds
- Document how to configure base URL for our Home Assistant deployment

Please explore the codebase first, then implement Phase 1 end-to-end, then Phase 2. Commit with clear messages. Do not invent a second household database — call Life Ops.
```

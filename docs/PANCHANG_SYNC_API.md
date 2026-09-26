# Life Ops ↔ Daily Panchang sync API

Base URL (example): `https://<your-ha>/life-ops` or `http://127.0.0.1:43127`

Auth: after PIN login, send on every request:

```http
Authorization: Bearer <token>
```

## Login

`POST /api/auth`

```json
{ "memberId": "<id from GET /api/auth>", "pin": "1234" }
```

Response includes `token` and `member`.

## Pull feed (Panchang ← Life Ops)

`GET /api/sync?since=<ISO8601 optional>`

Returns open items (tasks, care, dates, payments, shopping), recently completed (if `since`), and gas-cylinder style tracker alerts.

Each item has: `id`, `type`, `title`, `notes`, `dueAt`, `status`, `amount`, `assignee`, `shoppingLines?`, `updatedAt`.

Store on calendar events:

```text
lifeops:id=<id>
lifeops:type=<type>
```

## Push from Panchang → Life Ops

`POST /api/sync`

### Add or toggle (duplicate → complete / uncheck)

```json
{ "action": "upsert", "type": "task", "title": "Book gas cylinder", "dueAt": "2026-09-28", "notes": "" }
```

- If an **open** item with same type + title exists → **completes** it (`action: "completed"`)
- Else → **creates** it (`action: "created"`)

Types: `task` | `care` | `date` | `payment` | `shopping`  
For `shopping`, `title` is the line text; duplicate toggles checked.

### Shopping shortcut

```json
{ "action": "shopping", "text": "Milk", "toggleIfExists": true }
```

Returns `added` | `checked` | `unchecked`.

### Complete by id

```json
{ "action": "complete", "id": "<lifeops-id>" }
```

## Suggested Panchang UX prefixes

| User enters | Maps to |
|-------------|---------|
| `BUY: milk` / `Buy milk` | shopping upsert |
| `TASK: …` | task upsert |
| `REMIND: …` | date or task with dueAt = selected day |
| Tap Life Ops event → Done | `complete` by `lifeops:id` |

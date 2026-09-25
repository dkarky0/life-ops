import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  format,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
} from "date-fns";
import { nanoid } from "nanoid";
import {
  getDb,
  logActivity,
  rowToCycle,
  rowToItem,
  rowToSegment,
  rowToTracker,
} from "./db";
import type {
  Item,
  ItemType,
  Recurrence,
  ShoppingLine,
  Tracker,
  TrackerCycle,
  TrackerSegment,
} from "./types";
import { todayISO } from "./utils";

export function listItems(opts?: {
  type?: ItemType;
  status?: string;
  q?: string;
}) {
  const db = getDb();
  let sql = "SELECT * FROM items WHERE 1=1";
  const params: unknown[] = [];
  if (opts?.type) {
    sql += " AND type = ?";
    params.push(opts.type);
  }
  if (opts?.status) {
    sql += " AND status = ?";
    params.push(opts.status);
  } else {
    sql += " AND status != 'cancelled'";
  }
  if (opts?.q) {
    sql += " AND (title LIKE ? OR notes LIKE ? OR location_label LIKE ? OR tags LIKE ?)";
    const like = `%${opts.q}%`;
    params.push(like, like, like, like);
  }
  sql += " ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC, updated_at DESC";
  return db
    .prepare(sql)
    .all(...params)
    .map((r) => rowToItem(r as Record<string, unknown>));
}

export function getItem(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToItem(row) : null;
}

export function createItem(
  input: Partial<Item> & { type: ItemType; title: string },
  memberId: string,
) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = nanoid();
  db.prepare(
    `INSERT INTO items (
      id, type, title, notes, tags, due_at, recurrence, status, assignee,
      amount, currency, location_label, maps_url, shopping_lines,
      created_by, updated_at, created_at, done_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.type,
    input.title,
    input.notes || "",
    input.tags || "",
    input.dueAt ?? null,
    input.recurrence || "none",
    input.status || "open",
    input.assignee || "either",
    input.amount ?? null,
    input.currency || "INR",
    input.locationLabel ?? null,
    input.mapsUrl ?? null,
    input.shoppingLines || "[]",
    memberId,
    now,
    now,
    null,
  );
  logActivity(db, memberId, "create", `Added ${input.type}: ${input.title}`);
  return getItem(id)!;
}

export function updateItem(
  id: string,
  patch: Partial<Item>,
  memberId: string,
) {
  const existing = getItem(id);
  if (!existing) return null;
  const db = getDb();
  const next = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  db.prepare(
    `UPDATE items SET
      title=?, notes=?, tags=?, due_at=?, recurrence=?, status=?, assignee=?,
      amount=?, currency=?, location_label=?, maps_url=?, shopping_lines=?,
      updated_at=?, done_at=?
     WHERE id=?`,
  ).run(
    next.title,
    next.notes,
    next.tags,
    next.dueAt,
    next.recurrence,
    next.status,
    next.assignee,
    next.amount,
    next.currency,
    next.locationLabel,
    next.mapsUrl,
    next.shoppingLines,
    next.updatedAt,
    next.doneAt,
    id,
  );
  logActivity(db, memberId, "update", `Updated ${next.type}: ${next.title}`);
  return getItem(id);
}

function nextDue(dueAt: string, recurrence: Recurrence) {
  const d = parseISO(dueAt);
  switch (recurrence) {
    case "daily":
      return format(addDays(d, 1), "yyyy-MM-dd");
    case "weekly":
      return format(addWeeks(d, 1), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(d, 1), "yyyy-MM-dd");
    case "yearly":
      return format(addYears(d, 1), "yyyy-MM-dd");
    default:
      return null;
  }
}

export function completeItem(id: string, memberId: string) {
  const item = getItem(id);
  if (!item) return null;
  if (item.recurrence && item.recurrence !== "none" && item.dueAt) {
    const rolled = nextDue(item.dueAt, item.recurrence);
    return updateItem(
      id,
      {
        dueAt: rolled,
        status: "open",
        doneAt: null,
      },
      memberId,
    );
  }
  return updateItem(
    id,
    { status: "done", doneAt: new Date().toISOString() },
    memberId,
  );
}

export function snoozeItem(id: string, days: number, memberId: string) {
  const item = getItem(id);
  if (!item) return null;
  const base = item.dueAt ? parseISO(item.dueAt) : new Date();
  const dueAt = format(addDays(base, days), "yyyy-MM-dd");
  return updateItem(id, { dueAt }, memberId);
}

export function appendShoppingLine(text: string, memberId: string) {
  const lists = listItems({ type: "shopping", status: "open" });
  let list = lists[0];
  if (!list) {
    list = createItem(
      {
        type: "shopping",
        title: "Grocery list",
        shoppingLines: "[]",
      },
      memberId,
    );
  }
  const lines: ShoppingLine[] = JSON.parse(list.shoppingLines || "[]");
  lines.push({ id: nanoid(), text, done: false });
  return updateItem(
    list.id,
    { shoppingLines: JSON.stringify(lines) },
    memberId,
  );
}

export function listTrackers() {
  const db = getDb();
  return db
    .prepare("SELECT * FROM trackers ORDER BY name ASC")
    .all()
    .map((r) => rowToTracker(r as Record<string, unknown>));
}

export function getTracker(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM trackers WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToTracker(row) : null;
}

export function createTracker(
  input: {
    name: string;
    kind: "cycle" | "rate";
    unit: string;
    defaultUnitPrice?: number;
    expectedDays?: number | null;
  },
  memberId: string,
) {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO trackers (id, name, kind, unit, default_unit_price, expected_days, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.kind,
    input.unit,
    input.defaultUnitPrice ?? 0,
    input.expectedDays ?? null,
    now,
  );
  logActivity(db, memberId, "tracker", `Created tracker ${input.name}`);
  return getTracker(id)!;
}

export function listCycles(trackerId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM tracker_cycles WHERE tracker_id = ? ORDER BY installed_at DESC`,
    )
    .all(trackerId)
    .map((r) => rowToCycle(r as Record<string, unknown>));
}

export function listSegments(trackerId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM tracker_segments WHERE tracker_id = ? ORDER BY effective_from DESC`,
    )
    .all(trackerId)
    .map((r) => rowToSegment(r as Record<string, unknown>));
}

export function logCycleInstall(
  trackerId: string,
  input: {
    installedAt?: string;
    expectedDays?: number;
    pricePaid?: number | null;
  },
  memberId: string,
) {
  const tracker = getTracker(trackerId);
  if (!tracker || tracker.kind !== "cycle") {
    throw new Error("Not a cycle tracker");
  }
  const db = getDb();
  const installedAt = input.installedAt || todayISO();
  const expectedDays =
    input.expectedDays ?? tracker.expectedDays ?? 45;
  const dueAt = format(addDays(parseISO(installedAt), expectedDays), "yyyy-MM-dd");
  const now = new Date().toISOString();

  const open = db
    .prepare(
      `SELECT * FROM tracker_cycles WHERE tracker_id = ? AND replaced_at IS NULL`,
    )
    .all(trackerId) as Record<string, unknown>[];
  for (const c of open) {
    db.prepare(
      `UPDATE tracker_cycles SET replaced_at = ? WHERE id = ?`,
    ).run(installedAt, c.id);
  }

  const id = nanoid();
  db.prepare(
    `INSERT INTO tracker_cycles (id, tracker_id, installed_at, replaced_at, expected_days, due_at, price_paid, created_by, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    trackerId,
    installedAt,
    expectedDays,
    dueAt,
    input.pricePaid ?? tracker.defaultUnitPrice,
    memberId,
    now,
  );
  logActivity(
    db,
    memberId,
    "cycle",
    `${tracker.name} installed ${installedAt}, due ${dueAt}`,
  );
  return rowToCycle(
    db.prepare("SELECT * FROM tracker_cycles WHERE id = ?").get(id) as Record<
      string,
      unknown
    >,
  );
}

export function setRateSegment(
  trackerId: string,
  input: {
    effectiveFrom: string;
    quantity: number;
    unitPrice?: number;
  },
  memberId: string,
) {
  const tracker = getTracker(trackerId);
  if (!tracker || tracker.kind !== "rate") {
    throw new Error("Not a rate tracker");
  }
  const db = getDb();
  const from = input.effectiveFrom;
  const unitPrice = input.unitPrice ?? tracker.defaultUnitPrice;
  const dayBefore = format(addDays(parseISO(from), -1), "yyyy-MM-dd");

  const open = db
    .prepare(
      `SELECT * FROM tracker_segments WHERE tracker_id = ? AND effective_to IS NULL`,
    )
    .all(trackerId) as Record<string, unknown>[];

  for (const seg of open) {
    const segFrom = seg.effective_from as string;
    if (segFrom >= from) {
      db.prepare(`DELETE FROM tracker_segments WHERE id = ?`).run(seg.id);
    } else {
      db.prepare(
        `UPDATE tracker_segments SET effective_to = ? WHERE id = ?`,
      ).run(dayBefore, seg.id);
    }
  }

  const id = nanoid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO tracker_segments (id, tracker_id, effective_from, effective_to, quantity, unit_price, created_by, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
  ).run(id, trackerId, from, input.quantity, unitPrice, memberId, now);

  logActivity(
    db,
    memberId,
    "rate",
    `${tracker.name} set to ${input.quantity} from ${from}`,
  );

  return rowToSegment(
    db.prepare("SELECT * FROM tracker_segments WHERE id = ?").get(id) as Record<
      string,
      unknown
    >,
  );
}

export function monthSummary(trackerId: string, year: number, month: number) {
  const tracker = getTracker(trackerId);
  if (!tracker) throw new Error("Tracker not found");

  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  if (tracker.kind === "rate") {
    const segments = listSegments(trackerId);
    let totalQty = 0;
    let totalCost = 0;
    const breakdown: Array<{
      from: string;
      to: string;
      quantity: number;
      unitPrice: number;
      days: number;
      qty: number;
      cost: number;
    }> = [];

    for (const seg of segments) {
      const segStart = parseISO(seg.effectiveFrom);
      const segEnd = seg.effectiveTo
        ? parseISO(seg.effectiveTo)
        : end;
      const overlapStart = maxDate([segStart, start]);
      const overlapEnd = minDate([segEnd, end]);
      if (overlapStart > overlapEnd) continue;
      const days = eachDayOfInterval({
        start: overlapStart,
        end: overlapEnd,
      }).length;
      const qty = days * seg.quantity;
      const cost = qty * seg.unitPrice;
      totalQty += qty;
      totalCost += cost;
      breakdown.push({
        from: format(overlapStart, "yyyy-MM-dd"),
        to: format(overlapEnd, "yyyy-MM-dd"),
        quantity: seg.quantity,
        unitPrice: seg.unitPrice,
        days,
        qty,
        cost,
      });
    }

    return {
      tracker,
      year,
      month,
      kind: "rate" as const,
      totalQty,
      totalCost,
      unit: tracker.unit,
      breakdown,
      range: { from: startStr, to: endStr },
    };
  }

  const cycles = listCycles(trackerId).filter((c) => {
    return c.installedAt >= startStr && c.installedAt <= endStr;
  });
  const totalCost = cycles.reduce((s, c) => s + (c.pricePaid || 0), 0);
  return {
    tracker,
    year,
    month,
    kind: "cycle" as const,
    installs: cycles.length,
    totalCost,
    cycles,
    range: { from: startStr, to: endStr },
  };
}

export function openCycleStatus(trackerId: string) {
  const cycles = listCycles(trackerId);
  const open = cycles.find((c) => !c.replacedAt);
  if (!open) return null;
  const today = todayISO();
  const overdue = open.dueAt < today;
  return { ...open, overdue, daysOverdue: overdue ? Math.floor((Date.parse(today) - Date.parse(open.dueAt)) / 86400000) : 0 };
}

export function getTodayBundle() {
  const today = todayISO();
  const items = listItems({ status: "open" }).filter((i) => i.dueAt);
  const overdue = items.filter((i) => i.dueAt! < today);
  const dueToday = items.filter((i) => i.dueAt === today);
  const upcoming = items
    .filter((i) => i.dueAt! > today)
    .slice(0, 12);

  const trackers = listTrackers();
  const trackerAlerts = trackers
    .filter((t) => t.kind === "cycle")
    .map((t) => {
      const status = openCycleStatus(t.id);
      return status ? { tracker: t, status } : null;
    })
    .filter(Boolean) as Array<{
    tracker: Tracker;
    status: TrackerCycle & { overdue: boolean; daysOverdue: number };
  }>;

  return { overdue, dueToday, upcoming, trackerAlerts, today };
}

export function exportBackup() {
  const db = getDb();
  return {
    exportedAt: new Date().toISOString(),
    members: db.prepare("SELECT id, display_name, role FROM members").all(),
    items: listItems({ status: "open" }).concat(
      listItems({ status: "done" }),
    ),
    trackers: listTrackers(),
    cycles: db
      .prepare("SELECT * FROM tracker_cycles")
      .all()
      .map((r) => rowToCycle(r as Record<string, unknown>)),
    segments: db
      .prepare("SELECT * FROM tracker_segments")
      .all()
      .map((r) => rowToSegment(r as Record<string, unknown>)),
    activity: db
      .prepare("SELECT * FROM activity ORDER BY created_at DESC LIMIT 500")
      .all(),
  };
}

export type { Tracker, TrackerCycle, TrackerSegment, Item };

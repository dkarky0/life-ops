import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { addDays, format, parseISO } from "date-fns";
import type {
  Activity,
  Item,
  ItemType,
  Member,
  Message,
  Tracker,
  TrackerCycle,
  TrackerSegment,
} from "./types";
import { todayISO } from "./utils";

const DATA_DIR =
  process.env.LIFEOPS_DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "lifeops.sqlite");

let dbInstance: Database.Database | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDb() {
  if (dbInstance) return dbInstance;
  ensureDir();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedIfEmpty(db);
  dbInstance = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('you','partner'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      due_at TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      status TEXT NOT NULL DEFAULT 'open',
      assignee TEXT NOT NULL DEFAULT 'either',
      amount REAL,
      currency TEXT NOT NULL DEFAULT 'INR',
      location_label TEXT,
      maps_url TEXT,
      shopping_lines TEXT NOT NULL DEFAULT '[]',
      created_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      done_at TEXT
    );

    CREATE TABLE IF NOT EXISTS trackers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('cycle','rate')),
      unit TEXT NOT NULL,
      default_unit_price REAL NOT NULL DEFAULT 0,
      expected_days INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracker_cycles (
      id TEXT PRIMARY KEY,
      tracker_id TEXT NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
      installed_at TEXT NOT NULL,
      replaced_at TEXT,
      expected_days INTEGER NOT NULL,
      due_at TEXT NOT NULL,
      price_paid REAL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracker_segments (
      id TEXT PRIMARY KEY,
      tracker_id TEXT NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      proposal_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM members").get() as {
    c: number;
  };
  if (count.c > 0) return;

  const youId = nanoid();
  const partnerId = nanoid();
  const youName = process.env.LIFEOPS_MEMBER1_NAME || "You";
  const partnerName = process.env.LIFEOPS_MEMBER2_NAME || "Partner";
  const youPin = process.env.LIFEOPS_MEMBER1_PIN || "1234";
  const partnerPin = process.env.LIFEOPS_MEMBER2_PIN || "5678";

  const insertMember = db.prepare(
    `INSERT INTO members (id, display_name, pin_hash, role) VALUES (?, ?, ?, ?)`,
  );
  insertMember.run(youId, youName, bcrypt.hashSync(youPin, 8), "you");
  insertMember.run(
    partnerId,
    partnerName,
    bcrypt.hashSync(partnerPin, 8),
    "partner",
  );

  const now = new Date().toISOString();
  const today = todayISO();

  const insertItem = db.prepare(`
    INSERT INTO items (
      id, type, title, notes, tags, due_at, recurrence, status, assignee,
      amount, currency, location_label, maps_url, shopping_lines,
      created_by, updated_at, created_at, done_at
    ) VALUES (
      @id, @type, @title, @notes, @tags, @dueAt, @recurrence, @status, @assignee,
      @amount, @currency, @locationLabel, @mapsUrl, @shoppingLines,
      @createdBy, @updatedAt, @createdAt, @doneAt
    )
  `);

  const samples: Array<Partial<Item> & { type: ItemType; title: string }> = [
    {
      type: "task",
      title: "Book gas cylinder",
      dueAt: format(addDays(new Date(), -2), "yyyy-MM-dd"),
      tags: "home",
      assignee: "either",
    },
    {
      type: "task",
      title: "Replace inverter distilled water",
      dueAt: today,
      tags: "home",
      assignee: "me",
    },
    {
      type: "care",
      title: "Mother BP tablet — evening",
      dueAt: today,
      recurrence: "daily",
      assignee: "either",
    },
    {
      type: "payment",
      title: "HDFC Credit Card",
      dueAt: format(addDays(new Date(), 3), "yyyy-MM-dd"),
      amount: 12400,
      recurrence: "monthly",
      assignee: "me",
    },
    {
      type: "payment",
      title: "School van",
      dueAt: format(addDays(new Date(), 5), "yyyy-MM-dd"),
      amount: 2500,
      recurrence: "monthly",
      assignee: "partner",
    },
    {
      type: "place",
      title: "Raju Hardware",
      locationLabel: "Indiranagar",
      mapsUrl: "https://maps.google.com/?q=Indiranagar+hardware",
      notes: "Best for spare taps",
      tags: "tools",
    },
    {
      type: "place",
      title: "Kerala Spice Mart",
      locationLabel: "Near bus stand",
      notes: "Bought cardamom here",
      tags: "food",
    },
    {
      type: "shopping",
      title: "Grocery list",
      shoppingLines: JSON.stringify([
        { id: nanoid(), text: "Milk", done: false },
        { id: nanoid(), text: "Bread", done: false },
        { id: nanoid(), text: "Onions", done: true },
      ]),
    },
    {
      type: "date",
      title: "Water purifier AMC renewal",
      dueAt: format(addDays(new Date(), 20), "yyyy-MM-dd"),
      recurrence: "yearly",
    },
  ];

  for (const s of samples) {
    insertItem.run({
      id: nanoid(),
      type: s.type,
      title: s.title,
      notes: s.notes || "",
      tags: s.tags || "",
      dueAt: s.dueAt ?? null,
      recurrence: s.recurrence || "none",
      status: "open",
      assignee: s.assignee || "either",
      amount: s.amount ?? null,
      currency: "INR",
      locationLabel: s.locationLabel ?? null,
      mapsUrl: s.mapsUrl ?? null,
      shoppingLines: s.shoppingLines || "[]",
      createdBy: youId,
      updatedAt: now,
      createdAt: now,
      doneAt: null,
    });
  }

  const milkId = nanoid();
  const gasId = nanoid();
  db.prepare(
    `INSERT INTO trackers (id, name, kind, unit, default_unit_price, expected_days, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(milkId, "Milk", "rate", "L/day", 60, null, now);
  db.prepare(
    `INSERT INTO trackers (id, name, kind, unit, default_unit_price, expected_days, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(gasId, "Gas cylinder", "cycle", "cylinder", 1100, 45, now);

  const monthStart = format(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    "yyyy-MM-dd",
  );
  const midMonth = format(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12),
    "yyyy-MM-dd",
  );
  const dayBeforeMid = format(addDays(parseISO(midMonth), -1), "yyyy-MM-dd");

  db.prepare(
    `INSERT INTO tracker_segments (id, tracker_id, effective_from, effective_to, quantity, unit_price, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(nanoid(), milkId, monthStart, dayBeforeMid, 3, 60, youId, now);
  db.prepare(
    `INSERT INTO tracker_segments (id, tracker_id, effective_from, effective_to, quantity, unit_price, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(nanoid(), milkId, midMonth, null, 4, 60, partnerId, now);

  const installed = format(addDays(new Date(), -50), "yyyy-MM-dd");
  const due = format(addDays(parseISO(installed), 45), "yyyy-MM-dd");
  db.prepare(
    `INSERT INTO tracker_cycles (id, tracker_id, installed_at, replaced_at, expected_days, due_at, price_paid, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(nanoid(), gasId, installed, null, 45, due, 1100, youId, now);

  logActivity(db, youId, "seed", "Household seeded with sample data");
}

export function rowToMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    pinHash: row.pin_hash as string,
    role: row.role as "you" | "partner",
  };
}

export function rowToItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    type: row.type as Item["type"],
    title: row.title as string,
    notes: (row.notes as string) || "",
    tags: (row.tags as string) || "",
    dueAt: (row.due_at as string) || null,
    recurrence: (row.recurrence as Item["recurrence"]) || "none",
    status: row.status as Item["status"],
    assignee: (row.assignee as Item["assignee"]) || "either",
    amount: row.amount == null ? null : Number(row.amount),
    currency: (row.currency as string) || "INR",
    locationLabel: (row.location_label as string) || null,
    mapsUrl: (row.maps_url as string) || null,
    shoppingLines: (row.shopping_lines as string) || "[]",
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as string,
    createdAt: row.created_at as string,
    doneAt: (row.done_at as string) || null,
  };
}

export function rowToTracker(row: Record<string, unknown>): Tracker {
  return {
    id: row.id as string,
    name: row.name as string,
    kind: row.kind as Tracker["kind"],
    unit: row.unit as string,
    defaultUnitPrice: Number(row.default_unit_price),
    expectedDays: row.expected_days == null ? null : Number(row.expected_days),
    createdAt: row.created_at as string,
  };
}

export function rowToCycle(row: Record<string, unknown>): TrackerCycle {
  return {
    id: row.id as string,
    trackerId: row.tracker_id as string,
    installedAt: row.installed_at as string,
    replacedAt: (row.replaced_at as string) || null,
    expectedDays: Number(row.expected_days),
    dueAt: row.due_at as string,
    pricePaid: row.price_paid == null ? null : Number(row.price_paid),
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export function rowToSegment(row: Record<string, unknown>): TrackerSegment {
  return {
    id: row.id as string,
    trackerId: row.tracker_id as string,
    effectiveFrom: row.effective_from as string,
    effectiveTo: (row.effective_to as string) || null,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    action: row.action as string,
    summary: row.summary as string,
    createdAt: row.created_at as string,
  };
}

export function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    role: row.role as Message["role"],
    content: row.content as string,
    proposalJson: (row.proposal_json as string) || null,
    createdAt: row.created_at as string,
  };
}

export function logActivity(
  db: Database.Database,
  memberId: string,
  action: string,
  summary: string,
) {
  db.prepare(
    `INSERT INTO activity (id, member_id, action, summary, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(nanoid(), memberId, action, summary, new Date().toISOString());
}

export function getMembers() {
  const db = getDb();
  return db
    .prepare("SELECT * FROM members ORDER BY role ASC")
    .all()
    .map((r) => rowToMember(r as Record<string, unknown>));
}

export function getMemberById(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM members WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToMember(row) : null;
}

export function getSetting(key: string) {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

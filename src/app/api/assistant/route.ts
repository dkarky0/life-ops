import { NextResponse } from "next/server";
import { getSessionMemberFromRequest } from "@/lib/auth";
import { runAssistantChat } from "@/lib/ai";
import { getDb, logActivity, rowToMessage } from "@/lib/db";
import { createItem } from "@/lib/items";
import { nanoid } from "nanoid";
import type { ItemType } from "@/lib/types";

type GeoBody = {
  lat: number;
  lng: number;
  mapsUrl: string;
  locationLabel: string;
};

function parseGeo(raw: unknown): GeoBody | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const lat = Number(g.lat);
  const lng = Number(g.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    mapsUrl:
      String(g.mapsUrl || "") ||
      `https://www.google.com/maps?q=${lat},${lng}`,
    locationLabel:
      String(g.locationLabel || "") ||
      `Current location (${lat}, ${lng})`,
  };
}

function enrichPlace(
  proposal: Record<string, unknown>,
  geo: GeoBody | null,
) {
  if (!geo || proposal.type !== "place") return proposal;
  const next = { ...proposal };
  if (!next.mapsUrl) next.mapsUrl = geo.mapsUrl;
  if (!next.locationLabel) next.locationLabel = geo.locationLabel;
  const notes = String(next.notes || "");
  const pin = `GPS ${geo.lat},${geo.lng}`;
  if (!notes.includes("GPS ")) {
    next.notes = notes ? `${notes}\n${pin}` : pin;
  }
  return next;
}

export async function GET(req: Request) {
  const member = await getSessionMemberFromRequest(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const messages = db
    .prepare(`SELECT * FROM messages ORDER BY created_at DESC LIMIT 80`)
    .all()
    .map((r) => rowToMessage(r as Record<string, unknown>))
    .reverse();
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const member = await getSessionMemberFromRequest(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const db = getDb();
  const geo = parseGeo(body.geo);

  if (body.action === "confirm" && body.proposal) {
    const p = enrichPlace({ ...body.proposal }, geo);
    const item = createItem(
      {
        type: p.type as ItemType,
        title: String(p.title),
        notes: p.notes ? String(p.notes) : "",
        dueAt: p.dueAt || null,
        amount: p.amount != null ? Number(p.amount) : null,
        locationLabel: p.locationLabel || null,
        mapsUrl: p.mapsUrl || null,
        recurrence: p.recurrence || "none",
        assignee: p.assignee || "either",
      },
      member.id,
    );
    const content = `Saved ${item.type}: ${item.title}`;
    db.prepare(
      `INSERT INTO messages (id, member_id, role, content, proposal_json, created_at)
       VALUES (?, ?, 'assistant', ?, NULL, ?)`,
    ).run(nanoid(), member.id, content, new Date().toISOString());
    return NextResponse.json({ ok: true, item, content });
  }

  const text = String(body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO messages (id, member_id, role, content, proposal_json, created_at)
     VALUES (?, ?, 'user', ?, NULL, ?)`,
  ).run(nanoid(), member.id, text, new Date().toISOString());

  const result = await runAssistantChat(
    text,
    member.id,
    member.displayName,
    geo,
  );

  let proposal = result.proposal;
  if (proposal) {
    proposal = enrichPlace(proposal, geo);
  }

  const content = result.ok
    ? result.content || ""
    : result.error || "Something went wrong";
  const proposalJson = proposal ? JSON.stringify(proposal) : null;

  db.prepare(
    `INSERT INTO messages (id, member_id, role, content, proposal_json, created_at)
     VALUES (?, ?, 'assistant', ?, ?, ?)`,
  ).run(
    nanoid(),
    member.id,
    content,
    proposalJson,
    new Date().toISOString(),
  );

  if (result.ok) {
    logActivity(db, member.id, "chat", `Asked assistant: ${text.slice(0, 80)}`);
  }

  return NextResponse.json({
    ok: result.ok,
    content,
    proposal,
    error: result.error,
    geoAttached: Boolean(geo),
  });
}

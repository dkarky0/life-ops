import { NextResponse } from "next/server";
import { getSessionMember } from "@/lib/auth";
import { runAssistantChat } from "@/lib/ai";
import { getDb, logActivity, rowToMessage } from "@/lib/db";
import { createItem } from "@/lib/items";
import { nanoid } from "nanoid";
import type { ItemType } from "@/lib/types";

export async function GET() {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const messages = db
    .prepare(
      `SELECT * FROM messages ORDER BY created_at DESC LIMIT 80`,
    )
    .all()
    .map((r) => rowToMessage(r as Record<string, unknown>))
    .reverse();
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const db = getDb();

  if (body.action === "confirm" && body.proposal) {
    const p = body.proposal;
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
  );

  const content = result.ok
    ? result.content || ""
    : result.error || "Something went wrong";
  const proposalJson = result.proposal ? JSON.stringify(result.proposal) : null;

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
    proposal: result.proposal,
    error: result.error,
  });
}

import { NextResponse } from "next/server";
import { getSessionMemberFromRequest } from "@/lib/auth";
import {
  completeItem,
  getItem,
  listItems,
  syncFeed,
  upsertRemindable,
  upsertShoppingLine,
} from "@/lib/items";
import type { ItemType } from "@/lib/types";

/**
 * Life Ops ↔ Daily Panchang sync API.
 * Auth: Authorization: Bearer <token> from POST /api/auth
 */
export async function GET(req: Request) {
  const member = await getSessionMemberFromRequest(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  return NextResponse.json(syncFeed(since));
}

export async function POST(req: Request) {
  const member = await getSessionMemberFromRequest(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "complete") {
    if (body.id) {
      const item = completeItem(String(body.id), member.id);
      if (!item) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, action: "completed", item });
    }
    if (body.type && body.title) {
      const needle = String(body.title)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      const open = listItems({
        type: body.type as ItemType,
        status: "open",
      }).find(
        (i) => i.title.trim().toLowerCase().replace(/\s+/g, " ") === needle,
      );
      if (!open) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const item = completeItem(open.id, member.id);
      return NextResponse.json({ ok: true, action: "completed", item });
    }
    return NextResponse.json(
      { error: "Provide id or type+title" },
      { status: 400 },
    );
  }

  if (action === "shopping") {
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    const result = upsertShoppingLine(text, member.id, {
      toggleIfExists: body.toggleIfExists !== false,
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "upsert") {
    const type = String(body.type || "task") as ItemType;
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    if (type === "shopping") {
      const result = upsertShoppingLine(title, member.id, {
        toggleIfExists: true,
      });
      return NextResponse.json({ ok: true, ...result });
    }
    const result = upsertRemindable(
      {
        type,
        title,
        notes: body.notes ? String(body.notes) : "",
        dueAt: body.dueAt ? String(body.dueAt) : null,
        amount: body.amount != null ? Number(body.amount) : null,
      },
      member.id,
    );
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "get" && body.id) {
    const item = getItem(String(body.id));
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  }

  return NextResponse.json(
    {
      error: "Unknown action",
      hint: "Use action=upsert|complete|shopping|get",
    },
    { status: 400 },
  );
}

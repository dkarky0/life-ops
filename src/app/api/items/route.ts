import { NextResponse } from "next/server";
import { getSessionMember } from "@/lib/auth";
import {
  completeItem,
  createItem,
  listItems,
  snoozeItem,
  updateItem,
} from "@/lib/items";
import type { ItemType } from "@/lib/types";

export async function GET(req: Request) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ItemType | null;
  const q = searchParams.get("q") || undefined;
  const status = searchParams.get("status") || "open";
  return NextResponse.json({
    items: listItems({
      type: type || undefined,
      q,
      status,
    }),
  });
}

export async function POST(req: Request) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (body.action === "complete") {
    return NextResponse.json({ item: completeItem(body.id, member.id) });
  }
  if (body.action === "snooze") {
    return NextResponse.json({
      item: snoozeItem(body.id, Number(body.days || 1), member.id),
    });
  }
  if (body.action === "update") {
    return NextResponse.json({
      item: updateItem(body.id, body.patch || {}, member.id),
    });
  }
  const item = createItem(body, member.id);
  return NextResponse.json({ item });
}

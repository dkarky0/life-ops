import { NextResponse } from "next/server";
import { getSessionMember } from "@/lib/auth";
import { getDb, getMembers, rowToActivity } from "@/lib/db";

export async function GET() {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const members = getMembers();
  const byId = Object.fromEntries(members.map((m) => [m.id, m.displayName]));
  const activity = db
    .prepare(`SELECT * FROM activity ORDER BY created_at DESC LIMIT 100`)
    .all()
    .map((r) => {
      const a = rowToActivity(r as Record<string, unknown>);
      return { ...a, memberName: byId[a.memberId] || "Someone" };
    });
  return NextResponse.json({ activity });
}

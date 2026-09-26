import { NextResponse } from "next/server";
import { getSessionMemberFromRequest } from "@/lib/auth";
import { getDb, getMembers, rowToActivity } from "@/lib/db";

export async function GET(req: Request) {
  const member = await getSessionMemberFromRequest(req);
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

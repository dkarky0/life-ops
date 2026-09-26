import { NextResponse } from "next/server";
import { getSessionMemberFromRequest } from "@/lib/auth";
import { getTodayBundle } from "@/lib/items";

export async function GET(req: Request) {
  const member = await getSessionMemberFromRequest(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    member: {
      id: member.id,
      displayName: member.displayName,
      role: member.role,
    },
    ...getTodayBundle(),
  });
}

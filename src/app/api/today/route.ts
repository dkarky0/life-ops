import { NextResponse } from "next/server";
import { getSessionMember } from "@/lib/auth";
import { getTodayBundle } from "@/lib/items";

export async function GET() {
  const member = await getSessionMember();
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

import { NextResponse } from "next/server";
import { listPublicMembers, loginWithPin, logout } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ members: listPublicMembers() });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === "logout") {
    await logout();
    return NextResponse.json({ ok: true });
  }
  const result = await loginWithPin(String(body.memberId), String(body.pin));
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result);
}

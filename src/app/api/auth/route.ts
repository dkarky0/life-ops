import { NextResponse } from "next/server";
import {
  listPublicMembers,
  loginWithPin,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ members: listPublicMembers() });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return res;
  }
  const result = await loginWithPin(String(body.memberId), String(body.pin));
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  const res = NextResponse.json(result);
  res.cookies.set(
    SESSION_COOKIE,
    result.member.id,
    sessionCookieOptions(60 * 60 * 24 * 180),
  );
  return res;
}

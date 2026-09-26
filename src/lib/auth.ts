import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb, getMemberById, getMembers, rowToMember } from "./db";
import type { Member } from "./types";

export const SESSION_COOKIE = "lifeops_member";

function sessionSecret() {
  return (
    process.env.LIFEOPS_SESSION_SECRET ||
    process.env.LIFEOPS_API_KEY ||
    "lifeops-dev-session-secret-change-me"
  );
}

/** Cookie flags safe on HTTP LAN and HTTPS. Opt into Secure only when asked. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.LIFEOPS_COOKIE_SECURE === "true",
  };
}

export function signSessionToken(memberId: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 180;
  const payload = `${memberId}.${exp}`;
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | null | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [memberId, expStr, sig] = parts;
  const payload = `${memberId}.${expStr}`;
  const expected = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  if (Number(expStr) < Date.now()) return null;
  return getMemberById(memberId);
}

export async function getSessionMemberFromRequest(
  req?: Request,
): Promise<Member | null> {
  // Prefer Authorization / custom header (works behind some proxies)
  if (req) {
    const auth = req.headers.get("authorization");
    const bearer = auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : null;
    const headerToken =
      bearer ||
      req.headers.get("x-lifeops-token") ||
      req.headers.get("x-lifeops-session");
    const fromHeader = verifySessionToken(headerToken);
    if (fromHeader) return fromHeader;

    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`),
    );
    if (match?.[1]) {
      const id = decodeURIComponent(match[1]);
      const member = getMemberById(id);
      if (member) return member;
    }
  }

  // Fallback: Next cookies() helper
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const id = jar.get(SESSION_COOKIE)?.value;
    if (id) return getMemberById(id);
  } catch {
    // ignore outside request context
  }
  return null;
}

export async function loginWithPin(memberId: string, pin: string) {
  const member = getMemberById(memberId);
  if (!member) return { ok: false as const, error: "Member not found" };
  const valid = await bcrypt.compare(pin, member.pinHash);
  if (!valid) return { ok: false as const, error: "Wrong PIN" };
  const token = signSessionToken(member.id);
  return {
    ok: true as const,
    token,
    member: {
      id: member.id,
      displayName: member.displayName,
      role: member.role,
    },
  };
}

export function listPublicMembers() {
  return getMembers().map((m) => ({
    id: m.id,
    displayName: m.displayName,
    role: m.role,
  }));
}

export function verifyPinForMember(memberId: string, pin: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM members WHERE id = ?").get(memberId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return false;
  const member = rowToMember(row);
  return bcrypt.compareSync(pin, member.pinHash);
}

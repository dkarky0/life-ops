import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, getMemberById, getMembers, rowToMember } from "./db";
import type { Member } from "./types";

const COOKIE = "lifeops_member";

export async function getSessionMember(): Promise<Member | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  return getMemberById(id);
}

export async function requireMember(): Promise<Member> {
  const member = await getSessionMember();
  if (!member) {
    throw new Error("UNAUTHORIZED");
  }
  return member;
}

export async function loginWithPin(memberId: string, pin: string) {
  const member = getMemberById(memberId);
  if (!member) return { ok: false as const, error: "Member not found" };
  const valid = await bcrypt.compare(pin, member.pinHash);
  if (!valid) return { ok: false as const, error: "Wrong PIN" };
  const jar = await cookies();
  jar.set(COOKIE, member.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return { ok: true as const, member: { id: member.id, displayName: member.displayName, role: member.role } };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
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

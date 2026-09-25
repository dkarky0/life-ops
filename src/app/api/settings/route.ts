import { NextResponse } from "next/server";
import { getSessionMember } from "@/lib/auth";
import { resolveApiKey, resolveBaseUrl, resolveModel } from "@/lib/ai";
import { getSetting, setSetting } from "@/lib/db";
import { exportBackup } from "@/lib/items";

export async function GET() {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = resolveApiKey();
  return NextResponse.json({
    hasApiKey: Boolean(key),
    baseUrl: resolveBaseUrl(),
    model: resolveModel(),
    storedKeySet: Boolean(getSetting("llm_api_key")),
  });
}

export async function POST(req: Request) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (body.action === "backup") {
    return NextResponse.json(exportBackup());
  }
  if (body.action === "save_llm") {
    if (body.apiKey != null && String(body.apiKey).trim()) {
      setSetting("llm_api_key", String(body.apiKey).trim());
    }
    if (body.baseUrl != null) {
      setSetting("llm_base_url", String(body.baseUrl).trim());
    }
    if (body.model != null) {
      setSetting("llm_model", String(body.model).trim());
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

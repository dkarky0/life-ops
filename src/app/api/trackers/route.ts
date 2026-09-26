import { NextResponse } from "next/server";
import { getSessionMemberFromRequest } from "@/lib/auth";
import {
  createTracker,
  listCycles,
  listSegments,
  listTrackers,
  logCycleInstall,
  monthSummary,
  openCycleStatus,
  setRateSegment,
} from "@/lib/items";

export async function GET(req: Request) {
  const member = await getSessionMemberFromRequest(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const month = Number(
    searchParams.get("month") || new Date().getMonth() + 1,
  );

  if (id) {
    const trackers = listTrackers();
    const tracker = trackers.find((t) => t.id === id);
    if (!tracker) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      tracker,
      cycles: tracker.kind === "cycle" ? listCycles(id) : [],
      segments: tracker.kind === "rate" ? listSegments(id) : [],
      openCycle: tracker.kind === "cycle" ? openCycleStatus(id) : null,
      month: monthSummary(id, year, month),
    });
  }

  const trackers = listTrackers().map((t) => ({
    ...t,
    openCycle: t.kind === "cycle" ? openCycleStatus(t.id) : null,
    month: monthSummary(t.id, year, month),
  }));
  return NextResponse.json({ trackers });
}

export async function POST(req: Request) {
  const member = await getSessionMemberFromRequest(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (body.action === "create") {
    return NextResponse.json({
      tracker: createTracker(body, member.id),
    });
  }
  if (body.action === "install") {
    return NextResponse.json({
      cycle: logCycleInstall(body.trackerId, body, member.id),
    });
  }
  if (body.action === "rate") {
    return NextResponse.json({
      segment: setRateSegment(body.trackerId, body, member.id),
    });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

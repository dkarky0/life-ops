"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { ItemRows } from "@/components/item-rows";
import type { Item, Tracker, TrackerCycle } from "@/lib/types";
import { formatINR } from "@/lib/utils";

type TodayData = {
  member: { displayName: string };
  today: string;
  overdue: Item[];
  dueToday: Item[];
  upcoming: Item[];
  trackerAlerts: Array<{
    tracker: Tracker;
    status: TrackerCycle & { overdue: boolean; daysOverdue: number };
  }>;
};

export default function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/today");
    if (!res.ok) {
      setError("Could not load Today");
      return;
    }
    setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, id: string, days?: number) {
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, days }),
    });
    await load();
  }

  return (
    <AppFrame>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p className="brand" style={{ fontSize: "2rem", margin: 0 }}>
            Life Ops
          </p>
          <p className="pill-muted" style={{ marginTop: 4 }}>
            {data
              ? `${data.member.displayName} · ${data.today}`
              : "Loading…"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
          <Link className="btn btn-soft" href="/capture">
            Capture
          </Link>
          <Link className="btn" href="/assistant">
            Ask
          </Link>
        </div>
      </div>

      {error ? <p className="overdue">{error}</p> : null}

      {data?.trackerAlerts?.filter((t) => t.status.overdue).length ? (
        <>
          <p className="section-label">Tracker alerts</p>
          {data.trackerAlerts
            .filter((t) => t.status.overdue)
            .map((t) => (
              <div className="row" key={t.tracker.id}>
                <div>
                  <div style={{ fontWeight: 600 }} className="overdue">
                    {t.tracker.name} overdue
                  </div>
                  <div className="pill-muted">
                    Installed {t.status.installedAt} · due {t.status.dueAt} ·{" "}
                    {t.status.daysOverdue}d late
                    {t.status.pricePaid != null
                      ? ` · ${formatINR(t.status.pricePaid)}`
                      : ""}
                  </div>
                </div>
                <Link className="btn btn-ghost" href={`/trackers?id=${t.tracker.id}`}>
                  Open
                </Link>
              </div>
            ))}
        </>
      ) : null}

      <p className="section-label">Overdue</p>
      <ItemRows
        items={data?.overdue || []}
        empty="Nothing overdue."
        onComplete={(id) => act("complete", id)}
        onSnooze={(id, days) => act("snooze", id, days)}
      />

      <p className="section-label">Due today</p>
      <ItemRows
        items={data?.dueToday || []}
        empty="Clear for today."
        onComplete={(id) => act("complete", id)}
        onSnooze={(id, days) => act("snooze", id, days)}
      />

      <p className="section-label">Upcoming</p>
      <ItemRows
        items={data?.upcoming || []}
        empty="No upcoming dates."
        onComplete={(id) => act("complete", id)}
        onSnooze={(id, days) => act("snooze", id, days)}
      />

      <div style={{ marginTop: "1.5rem" }}>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            window.location.href = "/assistant";
          }}
        >
          What’s left today? Ask assistant
        </button>
      </div>
    </AppFrame>
  );
}

"use client";

import { formatINR } from "@/lib/utils";
import type { Item } from "@/lib/types";

export function ItemRows({
  items,
  onComplete,
  onSnooze,
  empty,
  showMaps = false,
}: {
  items: Item[];
  onComplete?: (id: string) => void;
  onSnooze?: (id: string, days: number) => void;
  empty: string;
  showMaps?: boolean;
}) {
  if (!items.length) {
    return <p className="empty">{empty}</p>;
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      {items.map((item) => {
        const overdue = item.dueAt && item.dueAt < today;
        return (
          <div className="row" key={item.id}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{item.title}</div>
              <div className="pill-muted" style={{ marginTop: 4 }}>
                {[
                  item.locationLabel,
                  item.dueAt
                    ? overdue
                      ? `Overdue · ${item.dueAt}`
                      : `Due ${item.dueAt}`
                    : null,
                  item.amount != null ? formatINR(item.amount) : null,
                  item.assignee !== "either" ? item.assignee : null,
                  item.tags || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {item.notes ? (
                <div className="pill-muted" style={{ marginTop: 2 }}>
                  {item.notes}
                </div>
              ) : null}
              {showMaps && item.mapsUrl ? (
                <a
                  href={item.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--sage)", fontSize: "0.85rem" }}
                >
                  Open in Maps
                </a>
              ) : null}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {onComplete ? (
                <button
                  className="btn btn-soft"
                  type="button"
                  style={{ padding: "0.35rem 0.55rem", fontSize: "0.8rem" }}
                  onClick={() => onComplete(item.id)}
                >
                  Done
                </button>
              ) : null}
              {onSnooze ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  style={{ padding: "0.35rem 0.55rem", fontSize: "0.8rem" }}
                  onClick={() => onSnooze(item.id, 1)}
                >
                  +1d
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

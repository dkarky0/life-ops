"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { formatINR, todayISO } from "@/lib/utils";
import type { Tracker, TrackerCycle, TrackerSegment } from "@/lib/types";
import { apiFetch } from "@/lib/client-api";

type Detail = {
  tracker: Tracker;
  cycles: TrackerCycle[];
  segments: TrackerSegment[];
  openCycle: (TrackerCycle & { overdue: boolean; daysOverdue: number }) | null;
  month: {
    kind: string;
    totalQty?: number;
    totalCost: number;
    installs?: number;
    breakdown?: Array<{
      from: string;
      to: string;
      quantity: number;
      unitPrice: number;
      days: number;
      qty: number;
      cost: number;
    }>;
  };
};

export default function TrackersClient() {
  const params = useSearchParams();
  const [trackers, setTrackers] = useState<
    Array<
      Tracker & {
        openCycle: (TrackerCycle & { overdue: boolean }) | null;
        month: { totalQty?: number; totalCost: number; installs?: number };
      }
    >
  >([]);
  const [selectedId, setSelectedId] = useState(params.get("id") || "");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [qty, setQty] = useState("4");
  const [from, setFrom] = useState(todayISO());
  const [price, setPrice] = useState("");

  async function loadList() {
    const res = await apiFetch("/api/trackers");
    const data = await res.json();
    setTrackers(data.trackers || []);
    if (!selectedId && data.trackers?.[0]) {
      setSelectedId(data.trackers[0].id);
    }
  }

  async function loadDetail(id: string) {
    if (!id) return;
    const res = await apiFetch(`/api/trackers?id=${id}`);
    const data = await res.json();
    setDetail(data);
    if (data.tracker?.defaultUnitPrice) {
      setPrice(String(data.tracker.defaultUnitPrice));
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  const selected = useMemo(
    () => trackers.find((t) => t.id === selectedId),
    [trackers, selectedId],
  );

  async function install() {
    await apiFetch("/api/trackers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "install",
        trackerId: selectedId,
        installedAt: todayISO(),
        pricePaid: price ? Number(price) : undefined,
      }),
    });
    await loadList();
    await loadDetail(selectedId);
  }

  async function changeRate() {
    await apiFetch("/api/trackers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rate",
        trackerId: selectedId,
        effectiveFrom: from,
        quantity: Number(qty),
        unitPrice: price ? Number(price) : undefined,
      }),
    });
    await loadList();
    await loadDetail(selectedId);
  }

  return (
    <AppFrame>
      <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
        Trackers
      </h1>
      <p className="pill-muted">Gas cycles, milk liters, and monthly cost</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {trackers.map((t) => (
          <button
            key={t.id}
            type="button"
            className={selectedId === t.id ? "btn" : "btn btn-ghost"}
            onClick={() => setSelectedId(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {!selected ? (
        <p className="empty">No trackers yet.</p>
      ) : (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 4 }}>{selected.name}</h2>
          <p className="pill-muted">
            {selected.kind === "cycle" ? "Cycle tracker" : "Rate tracker"} ·{" "}
            {selected.unit}
          </p>

          {detail?.month?.kind === "rate" ? (
            <div
              style={{
                marginTop: 12,
                padding: "0.9rem",
                background: "var(--sage-soft)",
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>This month</div>
              <div>
                {detail.month.totalQty?.toFixed(0)} L ·{" "}
                {formatINR(detail.month.totalCost || 0)}
              </div>
            </div>
          ) : null}

          {detail?.month?.kind === "cycle" ? (
            <div
              style={{
                marginTop: 12,
                padding: "0.9rem",
                background: "var(--sage-soft)",
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>This month</div>
              <div>
                {detail.month.installs || 0} install(s) ·{" "}
                {formatINR(detail.month.totalCost || 0)}
              </div>
            </div>
          ) : null}

          {selected.kind === "cycle" ? (
            <>
              {detail?.openCycle ? (
                <div className="row">
                  <div>
                    <div
                      style={{ fontWeight: 600 }}
                      className={detail.openCycle.overdue ? "overdue" : ""}
                    >
                      Current cylinder
                    </div>
                    <div className="pill-muted">
                      Installed {detail.openCycle.installedAt} · due{" "}
                      {detail.openCycle.dueAt}
                      {detail.openCycle.overdue
                        ? ` · ${detail.openCycle.daysOverdue}d overdue`
                        : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty">No open cylinder cycle.</p>
              )}
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <input
                  className="field"
                  type="number"
                  placeholder="Price paid ₹"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <button className="btn" type="button" onClick={install}>
                  Installed today
                </button>
              </div>
              <p className="section-label">History</p>
              {(detail?.cycles || []).map((c) => (
                <div className="row" key={c.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.installedAt}</div>
                    <div className="pill-muted">
                      Due {c.dueAt}
                      {c.replacedAt ? ` · replaced ${c.replacedAt}` : " · open"}
                      {c.pricePaid != null
                        ? ` · ${formatINR(c.pricePaid)}`
                        : ""}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="section-label">Change daily quantity</p>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  className="field"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <input
                  className="field"
                  type="number"
                  step="0.5"
                  placeholder="Liters / day"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                <input
                  className="field"
                  type="number"
                  placeholder="₹ per liter"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <button className="btn" type="button" onClick={changeRate}>
                  Save rate from date
                </button>
              </div>
              <p className="section-label">Segments</p>
              {(detail?.segments || []).map((s) => (
                <div className="row" key={s.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {s.quantity} L/day · {formatINR(s.unitPrice)}/L
                    </div>
                    <div className="pill-muted">
                      {s.effectiveFrom} → {s.effectiveTo || "ongoing"}
                    </div>
                  </div>
                </div>
              ))}
              <p className="section-label">Month breakdown</p>
              {(detail?.month.breakdown || []).map((b, i) => (
                <div className="row" key={`${b.from}-${i}`}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {b.qty.toFixed(0)} L · {formatINR(b.cost)}
                    </div>
                    <div className="pill-muted">
                      {b.from} → {b.to} · {b.quantity} L/day × {b.days}d
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </AppFrame>
  );
}

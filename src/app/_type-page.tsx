"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { ItemRows } from "@/components/item-rows";
import type { Item } from "@/lib/types";

export default function TypePage({
  type,
  title,
  empty,
  showMaps = false,
  showComplete = true,
}: {
  type: string;
  title: string;
  empty: string;
  showMaps?: boolean;
  showComplete?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    notes: "",
    dueAt: "",
    locationLabel: "",
    mapsUrl: "",
    amount: "",
    assignee: "either",
  });

  async function load(query = q) {
    const res = await fetch(
      `/api/items?type=${type}&status=open&q=${encodeURIComponent(query)}`,
    );
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function act(action: string, id: string, days?: number) {
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, days }),
    });
    await load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: form.title,
        notes: form.notes,
        dueAt: form.dueAt || null,
        locationLabel: form.locationLabel || null,
        mapsUrl: form.mapsUrl || null,
        amount: form.amount ? Number(form.amount) : null,
        assignee: form.assignee,
        recurrence:
          type === "payment" ? "monthly" : type === "care" ? "daily" : "none",
      }),
    });
    setShowForm(false);
    setForm({
      title: "",
      notes: "",
      dueAt: "",
      locationLabel: "",
      mapsUrl: "",
      amount: "",
      assignee: "either",
    });
    await load();
  }

  return (
    <AppFrame>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
          {title}
        </h1>
        <button
          className="btn"
          type="button"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Close" : "Add"}
        </button>
      </div>

      <input
        className="field"
        style={{ marginTop: "1rem" }}
        placeholder={`Search ${title.toLowerCase()}…`}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          load(e.target.value);
        }}
      />

      {showForm ? (
        <form
          onSubmit={create}
          style={{ display: "grid", gap: 8, marginTop: 12 }}
        >
          <input
            className="field"
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          {type === "place" ? (
            <>
              <input
                className="field"
                placeholder="Area / landmark"
                value={form.locationLabel}
                onChange={(e) =>
                  setForm({ ...form, locationLabel: e.target.value })
                }
              />
              <input
                className="field"
                placeholder="Maps URL"
                value={form.mapsUrl}
                onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
              />
            </>
          ) : (
            <input
              className="field"
              type="date"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
            />
          )}
          {type === "payment" ? (
            <input
              className="field"
              type="number"
              placeholder="Amount ₹"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          ) : null}
          <select
            className="field"
            value={form.assignee}
            onChange={(e) => setForm({ ...form, assignee: e.target.value })}
          >
            <option value="either">Either</option>
            <option value="me">You</option>
            <option value="partner">Partner</option>
          </select>
          <textarea
            className="field"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button className="btn" type="submit">
            Save
          </button>
        </form>
      ) : null}

      <div style={{ marginTop: 8 }}>
        <ItemRows
          items={items}
          empty={empty}
          showMaps={showMaps}
          onComplete={showComplete ? (id) => act("complete", id) : undefined}
          onSnooze={
            showComplete ? (id, days) => act("snooze", id, days) : undefined
          }
        />
      </div>
    </AppFrame>
  );
}

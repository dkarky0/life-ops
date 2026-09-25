"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import type { Item, ShoppingLine } from "@/lib/types";
import { nanoid } from "nanoid";

export default function ShoppingPage() {
  const [list, setList] = useState<Item | null>(null);
  const [text, setText] = useState("");

  async function load() {
    const res = await fetch("/api/items?type=shopping&status=open");
    const data = await res.json();
    setList(data.items?.[0] || null);
  }

  useEffect(() => {
    load();
  }, []);

  const lines: ShoppingLine[] = list
    ? JSON.parse(list.shoppingLines || "[]")
    : [];

  async function saveLines(next: ShoppingLine[]) {
    if (!list) {
      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "shopping",
          title: "Grocery list",
          shoppingLines: JSON.stringify(next),
        }),
      });
    } else {
      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: list.id,
          patch: { shoppingLines: JSON.stringify(next) },
        }),
      });
    }
    await load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await saveLines([
      ...lines,
      { id: nanoid(), text: text.trim(), done: false },
    ]);
    setText("");
  }

  return (
    <AppFrame>
      <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
        Shopping
      </h1>
      <p className="pill-muted">Shared grocery checklist</p>
      <form
        onSubmit={add}
        style={{ display: "flex", gap: 8, marginTop: 12 }}
      >
        <input
          className="field"
          placeholder="Add milk, bread…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
      <div style={{ marginTop: 8 }}>
        {!lines.length ? (
          <p className="empty">List is empty.</p>
        ) : (
          lines.map((line) => (
            <label className="row" key={line.id} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={line.done}
                  onChange={() =>
                    saveLines(
                      lines.map((l) =>
                        l.id === line.id ? { ...l, done: !l.done } : l,
                      ),
                    )
                  }
                />
                <span
                  style={{
                    textDecoration: line.done ? "line-through" : "none",
                    color: line.done ? "var(--muted)" : "inherit",
                  }}
                >
                  {line.text}
                </span>
              </div>
              <button
                className="btn btn-ghost"
                type="button"
                style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                onClick={() =>
                  saveLines(lines.filter((l) => l.id !== line.id))
                }
              >
                Remove
              </button>
            </label>
          ))
        )}
      </div>
    </AppFrame>
  );
}

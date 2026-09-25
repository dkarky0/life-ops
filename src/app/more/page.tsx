"use client";

import Link from "next/link";
import { AppFrame } from "@/components/app-frame";

const links = [
  { href: "/payments", label: "Payments", hint: "Cards, school, van, bills" },
  { href: "/dates", label: "Important dates", hint: "Renewals and events" },
  { href: "/trackers", label: "Trackers", hint: "Milk liters, gas cylinder" },
  { href: "/shopping", label: "Shopping", hint: "Shared grocery list" },
  { href: "/assistant", label: "Assistant", hint: "Chat and voice" },
  { href: "/capture", label: "Quick Capture", hint: "Pin this as a shortcut" },
  { href: "/activity", label: "Activity", hint: "What each of you did" },
  { href: "/settings", label: "Settings", hint: "API key, backup, logout" },
];

export default function MorePage() {
  return (
    <AppFrame>
      <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
        More
      </h1>
      <p className="pill-muted">Household tools and settings</p>
      <div style={{ marginTop: "1rem" }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="row">
            <div>
              <div style={{ fontWeight: 600 }}>{l.label}</div>
              <div className="pill-muted">{l.hint}</div>
            </div>
            <span className="pill-muted">→</span>
          </Link>
        ))}
      </div>
    </AppFrame>
  );
}

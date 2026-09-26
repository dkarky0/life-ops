"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { apiFetch } from "@/lib/client-api";

type Row = {
  id: string;
  summary: string;
  memberName: string;
  createdAt: string;
};

export default function ActivityPage() {
  const [activity, setActivity] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/activity");
      const data = await res.json();
      setActivity(data.activity || []);
    })();
  }, []);

  return (
    <AppFrame>
      <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
        Activity
      </h1>
      <p className="pill-muted">Recent household changes</p>
      <div style={{ marginTop: 8 }}>
        {!activity.length ? (
          <p className="empty">No activity yet.</p>
        ) : (
          activity.map((a) => (
            <div className="row" key={a.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.summary}</div>
                <div className="pill-muted">
                  {a.memberName} · {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AppFrame>
  );
}

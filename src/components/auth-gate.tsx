"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PublicMember = {
  id: string;
  displayName: string;
  role: string;
};

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [memberId, setMemberId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = await fetch("/api/today");
        if (today.ok) {
          if (!cancelled) {
            setNeedsLogin(false);
            setReady(true);
          }
          return;
        }
        const auth = await fetch("/api/auth");
        const data = await auth.json();
        if (!cancelled) {
          const list: PublicMember[] = data.members || [];
          setMembers(list);
          const preferred =
            list.find((m) => m.role === "you")?.id || list[0]?.id || "";
          setMemberId(preferred);
          setNeedsLogin(true);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach Life Ops server.");
          setNeedsLogin(true);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function doLogin() {
    if (loading) return;
    const selectedId = memberId;
    const enteredPin = pin.trim();
    if (!selectedId) {
      setError("Pick who you are.");
      return;
    }
    if (!enteredPin) {
      setError("Enter your PIN.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedId, pin: enteredPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      setNeedsLogin(false);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error during login.");
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="app-shell">
        <p className="empty">Loading Life Ops…</p>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="app-shell">
        <p
          className="brand"
          style={{ fontSize: "2rem", margin: "2rem 0 0.35rem" }}
        >
          Life Ops
        </p>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Shared household assistant. Pick who you are and enter your PIN.
        </p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
          <span className="pill-muted">Member</span>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                className={memberId === m.id ? "btn" : "btn btn-ghost"}
                onClick={() => {
                  setMemberId(m.id);
                  setError("");
                }}
              >
                {m.displayName}
              </button>
            ))}
          </div>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span className="pill-muted">PIN</span>
            <input
              className="field"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void doLogin();
                }
              }}
              placeholder="••••"
            />
          </label>
          {error ? <p className="overdue">{error}</p> : null}
          <button
            className="btn"
            type="button"
            disabled={loading || !memberId}
            onClick={() => void doLogin()}
          >
            {loading ? "Signing in…" : "Enter household"}
          </button>
          <p className="pill-muted">
            Default demo PINs: You 1234 · Partner 5678
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

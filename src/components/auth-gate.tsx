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
        setMembers(data.members || []);
        setMemberId(data.members?.[0]?.id || "");
        setNeedsLogin(true);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, pin }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    setNeedsLogin(false);
    router.refresh();
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
        <p className="brand" style={{ fontSize: "2rem", margin: "2rem 0 0.35rem" }}>
          Life Ops
        </p>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Shared household assistant. Pick who you are and enter your PIN.
        </p>
        <form onSubmit={login} style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span className="pill-muted">Member</span>
            <select
              className="field"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span className="pill-muted">PIN</span>
            <input
              className="field"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              required
            />
          </label>
          {error ? <p className="overdue">{error}</p> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Enter household"}
          </button>
          <p className="pill-muted">
            Default demo PINs: You 1234 · Partner 5678
          </p>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

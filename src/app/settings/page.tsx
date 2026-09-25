"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";

export default function SettingsPage() {
  const router = useRouter();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setHasApiKey(Boolean(data.hasApiKey));
      setBaseUrl(data.baseUrl || baseUrl);
      setModel(data.model || model);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveLlm(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_llm",
        apiKey,
        baseUrl,
        model,
      }),
    });
    setSaved("Saved.");
    setHasApiKey(true);
    setApiKey("");
  }

  async function backup() {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "backup" }),
    });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.refresh();
    window.location.href = "/";
  }

  return (
    <AppFrame>
      <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
        Settings
      </h1>
      <p className="pill-muted">
        AI key {hasApiKey ? "configured" : "missing"} · backup · logout
      </p>

      <form
        onSubmit={saveLlm}
        style={{ display: "grid", gap: 8, marginTop: 16 }}
      >
        <label className="pill-muted">OpenAI-compatible API key</label>
        <input
          className="field"
          type="password"
          placeholder={hasApiKey ? "•••••••• (leave blank to keep)" : "sk-…"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <label className="pill-muted">Base URL</label>
        <input
          className="field"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <label className="pill-muted">Model</label>
        <input
          className="field"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <button className="btn" type="submit">
          Save AI settings
        </button>
        {saved ? <p className="pill-muted">{saved}</p> : null}
      </form>

      <div style={{ display: "grid", gap: 8, marginTop: 24 }}>
        <button className="btn btn-soft" type="button" onClick={backup}>
          Download JSON backup
        </button>
        <button className="btn btn-ghost" type="button" onClick={logout}>
          Log out
        </button>
      </div>

      <p className="section-label">Home Assistant</p>
      <p className="pill-muted">
        Run with Docker, proxy under your HA URL, install the PWA on both phones,
        and add a home-screen shortcut to /capture.
      </p>
    </AppFrame>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { apiFetch, setStoredToken } from "@/lib/client-api";

const PRESETS = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    hint: "Key from platform.openai.com",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-2.0-flash",
    hint: "Key from Google AI Studio (aistudio.google.com)",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-001",
    hint: "One key for many models including Gemini",
  },
  {
    id: "custom",
    label: "Custom / local",
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3.2",
    hint: "Any OpenAI-compatible server (Ollama, LiteLLM, etc.)",
  },
] as const;

export default function SettingsPage() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState("");
  const [preset, setPreset] = useState("openai");

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/settings", { credentials: "include" });
      const data = await res.json();
      setHasApiKey(Boolean(data.hasApiKey));
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      if (data.model) setModel(data.model);
      const match = PRESETS.find((p) =>
        String(data.baseUrl || "").includes(
          p.baseUrl.replace(/\/$/, "").split("/").slice(2, 3)[0] || "___",
        ),
      );
      if (data.baseUrl?.includes("generativelanguage.googleapis.com")) {
        setPreset("gemini");
      } else if (data.baseUrl?.includes("openrouter.ai")) {
        setPreset("openrouter");
      } else if (data.baseUrl?.includes("api.openai.com")) {
        setPreset("openai");
      } else if (data.baseUrl) {
        setPreset("custom");
      }
      void match;
    })();
  }, []);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setSaved("");
  }

  async function saveLlm(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_llm",
        apiKey,
        baseUrl,
        model,
      }),
    });
    setSaved("Saved.");
    if (apiKey.trim()) setHasApiKey(true);
    setApiKey("");
  }

  async function backup() {
    const res = await apiFetch("/api/settings", {
      method: "POST",
      credentials: "include",
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
    await apiFetch("/api/auth", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setStoredToken(null);
    window.location.href = "/";
  }

  const active = PRESETS.find((p) => p.id === preset);

  return (
    <AppFrame>
      <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
        Settings
      </h1>
      <p className="pill-muted">
        AI key {hasApiKey ? "configured" : "missing"} · backup · logout
      </p>

      <p className="section-label">AI provider</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={preset === p.id ? "btn" : "btn btn-ghost"}
            style={{ padding: "0.45rem 0.7rem", fontSize: "0.85rem" }}
            onClick={() => applyPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {active ? (
        <p className="pill-muted" style={{ marginTop: 8 }}>
          {active.hint}
        </p>
      ) : null}

      <p
        className="pill-muted"
        style={{
          marginTop: 12,
          padding: "0.75rem",
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--bg-elevated)",
        }}
      >
        Cursor does not offer a public chat API you can plug in here. Use{" "}
        <strong>Gemini</strong>, OpenAI, OpenRouter, or any OpenAI-compatible
        endpoint instead.
      </p>

      <form
        onSubmit={saveLlm}
        style={{ display: "grid", gap: 8, marginTop: 16 }}
      >
        <label className="pill-muted">API key</label>
        <input
          className="field"
          type="password"
          placeholder={
            hasApiKey
              ? "•••••••• (leave blank to keep)"
              : preset === "gemini"
                ? "Google AI Studio key"
                : "sk-…"
          }
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <label className="pill-muted">Base URL</label>
        <input
          className="field"
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value);
            setPreset("custom");
          }}
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
        and add a home-screen shortcut to /capture. On HTTPS (Nabu Casa) cookies
        stay secure automatically; on plain HTTP LAN set{" "}
        <code>LIFEOPS_COOKIE_SECURE=false</code>.
      </p>
    </AppFrame>
  );
}

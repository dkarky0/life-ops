"use client";

import { useEffect, useRef, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { apiFetch } from "@/lib/client-api";
import { getDeviceLocation, type DeviceGeo } from "@/lib/geo";
import { cancelSpeech, speakText } from "@/lib/speech";

type Msg = {
  id: string;
  role: string;
  content: string;
  proposalJson: string | null;
  memberId: string;
};

async function readGeoQuiet(): Promise<DeviceGeo | null> {
  try {
    return await getDeviceLocation();
  } catch {
    return null;
  }
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [geoHint, setGeoHint] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const lastGeo = useRef<DeviceGeo | null>(null);

  async function load() {
    const res = await apiFetch("/api/assistant");
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages || []);
  }

  useEffect(() => {
    load();
    return () => {
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(value = text) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    cancelSpeech();
    setBusy(true);
    setError("");
    setText("");
    setGeoHint("Getting location…");
    const geo = await readGeoQuiet();
    lastGeo.current = geo;
    setGeoHint(
      geo
        ? `Location attached · ${geo.locationLabel}`
        : "No GPS (place maps link may be empty)",
    );
    const res = await apiFetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, geo }),
    });
    const data = await res.json();
    if (!data.ok && data.error) setError(data.error);
    await load();
    setBusy(false);
    if (data.content) {
      speakText(data.content);
    }
  }

  async function confirm(proposal: Record<string, unknown>) {
    setBusy(true);
    let geo = lastGeo.current;
    if (proposal.type === "place" && !geo) {
      geo = await readGeoQuiet();
    }
    await apiFetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", proposal, geo }),
    });
    await load();
    setBusy(false);
  }

  function startVoice() {
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Voice input needs Chrome/Android browser support.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const said = event.results?.[0]?.[0]?.transcript;
      if (said) send(said);
    };
    rec.start();
  }

  const chips = [
    "What's overdue?",
    "Milk this month?",
    "Cylinder status?",
    "Add milk to shopping",
  ];

  return (
    <AppFrame>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
            Assistant
          </h1>
          <p className="pill-muted">Shared household chat · voice supported</p>
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          style={{ padding: "0.4rem 0.65rem", fontSize: "0.85rem" }}
          onClick={() => cancelSpeech()}
        >
          Stop voice
        </button>
      </div>
      {geoHint ? (
        <p className="pill-muted" style={{ marginTop: 8 }}>
          {geoHint}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            className="btn btn-ghost"
            style={{ padding: "0.4rem 0.65rem", fontSize: "0.85rem" }}
            onClick={() => send(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, minHeight: "45vh" }}>
        {!messages.length ? (
          <p className="empty">
            Ask anything about places, chores, care, payments, or trackers.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id}>
              <div
                className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`}
              >
                {m.content}
              </div>
              {m.proposalJson ? (
                <div
                  style={{
                    margin: "0.25rem 0 0.75rem",
                    padding: "0.75rem",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div className="pill-muted">Proposed save</div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      margin: "0.4rem 0",
                      fontSize: "0.85rem",
                    }}
                  >
                    {m.proposalJson}
                  </pre>
                  <button
                    className="btn"
                    type="button"
                    disabled={busy}
                    onClick={() => confirm(JSON.parse(m.proposalJson!))}
                  >
                    Confirm save
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
        {busy ? <p className="pill-muted">Thinking…</p> : null}
        {error ? <p className="overdue">{error}</p> : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: 8,
          position: "sticky",
          bottom: 72,
          background: "var(--bg)",
          paddingTop: 8,
        }}
      >
        <input
          className="field"
          placeholder="Type or use the mic…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="btn btn-ghost"
          type="button"
          onClick={startVoice}
          disabled={busy}
        >
          {listening ? "…" : "Mic"}
        </button>
        <button className="btn" type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </AppFrame>
  );
}

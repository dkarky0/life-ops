"use client";

import { useState } from "react";
import Link from "next/link";
import { AppFrame } from "@/components/app-frame";

export default function CapturePage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);

  async function send(value = text) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setResult("");
    setProposal(null);
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Quick capture — file this appropriately (propose before inventing): ${trimmed}`,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok && data.error) setError(data.error);
    setResult(data.content || "");
    setProposal(data.proposal || null);
    setText("");
  }

  async function confirm() {
    if (!proposal) return;
    setBusy(true);
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", proposal }),
    });
    const data = await res.json();
    setBusy(false);
    setResult(data.content || "Saved.");
    setProposal(null);
  }

  function startVoice() {
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Voice needs Chrome on Android.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const said = event.results?.[0]?.[0]?.transcript;
      if (said) {
        setText(said);
        send(said);
      }
    };
    rec.start();
  }

  return (
    <AppFrame>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 className="brand" style={{ fontSize: "1.8rem", margin: 0 }}>
          Quick Capture
        </h1>
        <Link className="btn btn-ghost" href="/">
          Today
        </Link>
      </div>
      <p className="pill-muted">
        Pin this page to your Android home screen for one-tap capture.
      </p>

      <textarea
        className="field"
        style={{ marginTop: 16, minHeight: 160, fontSize: "1.15rem" }}
        placeholder="Gas cylinder finished… spice shop near bus stand… milk 4 liters from tomorrow…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={startVoice}
          disabled={busy}
        >
          {listening ? "Listening…" : "Voice"}
        </button>
        <button
          className="btn"
          type="button"
          style={{ flex: 1 }}
          disabled={busy}
          onClick={() => send()}
        >
          {busy ? "Filing…" : "Send to Assistant"}
        </button>
      </div>

      {error ? <p className="overdue">{error}</p> : null}
      {result ? (
        <div
          style={{
            marginTop: 16,
            padding: "0.9rem",
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--bg-elevated)",
          }}
        >
          <div style={{ whiteSpace: "pre-wrap" }}>{result}</div>
          {proposal ? (
            <div style={{ marginTop: 10 }}>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                }}
              >
                {JSON.stringify(proposal, null, 2)}
              </pre>
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={confirm}
              >
                Confirm save
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </AppFrame>
  );
}

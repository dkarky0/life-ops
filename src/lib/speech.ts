/** Browser TTS helpers — cancel when leaving pages so speech doesn't leak. */

export function cancelSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

export function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  cancelSpeech();
  const utter = new SpeechSynthesisUtterance(trimmed);
  window.speechSynthesis.speak(utter);
}

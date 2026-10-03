"use client";

import { useRef, useState } from "react";
import { Debug, OrangeButton, Phone, StatusPill, cardClass } from "@/components/phone";
import { usePoll } from "@/lib/use-poll";
import type { PublicRequest } from "@/lib/types";

type Payload = { latest: PublicRequest | null };

export function HomeScreen({ token }: { token: string }) {
  const { data, error, reload } = usePoll<Payload>(`/api/device/${token}/requests`);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("Apteka, jutro o dziesiątej. Kod 4821");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const latest = data?.latest ?? null;
  const open = latest && ["ready", "assigned", "revealed"].includes(latest.status);

  async function sendBlob(blob: Blob) {
    setBusy(true);
    setLocalError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "voice");
      const res = await fetch(`/api/device/${token}/requests`, { method: "POST", body: form });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Nie wysłano");
      reload();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Nie wysłano");
    } finally {
      setBusy(false);
    }
  }

  async function start(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (recording || busy) return;
    setLocalError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void sendBlob(new Blob(chunks.current, { type: mime }));
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      setLocalError("Brak mikrofonu. Wpisz prośbę niżej.");
    }
  }

  function stop() {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    recRef.current = null;
    setRecording(false);
  }

  async function sendPhrase() {
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/device/${token}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: phrase }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Nie wysłano");
      reload();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Nie wysłano");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    const res = await fetch(`/api/device/${token}/cancel`, { method: "POST" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) setLocalError(json.error ?? "Nie anulowano");
    setBusy(false);
    reload();
  }

  return (
    <Phone>
      <h1 className="text-[28px] leading-tight font-bold">Dzień dobry, Anno</h1>
      <p className="mt-1 text-sm text-[#667085]">Powiedz, czego potrzebujesz</p>
      <div className="mt-8 flex flex-col items-center">
        <button
          type="button"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerCancel={stop}
          className={`flex h-44 w-44 items-center justify-center rounded-full text-lg font-semibold text-white shadow-[0_16px_40px_rgba(244,123,32,0.35)] select-none ${
            recording ? "bg-[#d96512]" : "bg-[#f47b20]"
          }`}
        >
          {recording ? "Mów…" : busy ? "Wysyłam" : "Przytrzymaj"}
        </button>
        <p className="mt-4 text-center text-sm text-[#667085]">
          {recording ? "Puść, kiedy skończysz." : "Nagranie usłyszy tylko koordynator."}
        </p>
      </div>
      {localError || error ? <p className="mt-4 text-sm text-red-700">{localError ?? error}</p> : null}
      {latest ? (
        <article className={`mt-8 ${cardClass()}`}>
          <StatusPill status={latest.status} />
          <p className="mt-3 text-lg font-semibold">{latest.summary || "Prośba głosowa"}</p>
          {open ? (
            <button type="button" onClick={cancel} className="mt-3 text-sm font-semibold text-[#f47b20]">
              Anuluj prośbę
            </button>
          ) : null}
        </article>
      ) : null}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-semibold text-[#667085]">Bez mikrofonu</summary>
        <textarea
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          rows={3}
          className="mt-3 w-full rounded-2xl border border-[#f0e6dc] bg-white p-3 text-sm"
        />
        <div className="mt-3">
          <OrangeButton onClick={sendPhrase}>Wyślij prośbę</OrangeButton>
        </div>
      </details>
      <Debug data={data} />
    </Phone>
  );
}

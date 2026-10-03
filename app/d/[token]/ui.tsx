"use client";

import { useRef, useState } from "react";
import { Debug, OrangeButton, Phone, StatusPill, cardClass } from "@/components/phone";
import { usePoll } from "@/lib/use-poll";
import type { PublicRequest } from "@/lib/types";

type Payload = { latest: PublicRequest | null };

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };

type BrowserSpeech = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speechCtor(): (new () => BrowserSpeech) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeech;
    webkitSpeechRecognition?: new () => BrowserSpeech;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function HomeScreen({ token }: { token: string }) {
  const { data, error, reload } = usePoll<Payload>(`/api/device/${token}/requests`);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("Apteka, jutro o dziesiątej. Kod 4821");
  const [heard, setHeard] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<BrowserSpeech | null>(null);
  const heardRef = useRef("");
  const released = useRef(false);
  const chunks = useRef<Blob[]>([]);
  const latest = data?.latest ?? null;
  const open = latest && ["ready", "assigned", "revealed"].includes(latest.status);

  async function sendBlob(blob: Blob, transcript: string) {
    setBusy(true);
    setLocalError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "voice");
      if (transcript) form.append("transcript", transcript);
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

  function beginSpeech() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const speech = new Ctor();
    speech.lang = "pl-PL";
    speech.continuous = true;
    speech.interimResults = true;
    heardRef.current = "";
    setHeard("");
    speech.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) text += `${event.results[i][0]?.transcript ?? ""} `;
      heardRef.current = text.replace(/\s+/g, " ").trim();
      setHeard(heardRef.current);
    };
    speech.onerror = () => {};
    try {
      speech.start();
      speechRef.current = speech;
    } catch {
      speechRef.current = null;
    }
  }

  function finishSpeech() {
    const speech = speechRef.current;
    speechRef.current = null;
    if (!speech) return Promise.resolve(heardRef.current);
    return new Promise<string>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve(heardRef.current);
      };
      speech.onend = done;
      try {
        speech.stop();
      } catch {
        done();
      }
      window.setTimeout(done, 700);
    });
  }

  async function start(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (recording || busy) return;
    const button = event.currentTarget;
    const pointerId = event.pointerId;
    released.current = false;
    setLocalError(null);
    beginSpeech();
    try {
      button.setPointerCapture(pointerId);
    } catch {
      // The press can end while the browser asks for the microphone.
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (released.current) {
        stream.getTracks().forEach((track) => track.stop());
        void finishSpeech();
        setLocalError("Przytrzymaj przycisk i mów, aż skończysz zdanie.");
        return;
      }
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((item) =>
        MediaRecorder.isTypeSupported(item),
      );
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const transcript = heardRef.current;
        void sendBlob(new Blob(chunks.current, { type: mime || rec.mimeType }), transcript);
      };
      rec.start(250);
      recRef.current = rec;
      setRecording(true);
    } catch (err) {
      void finishSpeech();
      setLocalError(micError(err));
    }
  }

  function micError(err: unknown) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError") return "Przeglądarka nie puściła mikrofonu. Odśwież stronę i naciśnij jeszcze raz.";
    if (name === "NotFoundError") return "Nie widzę mikrofonu w tym urządzeniu. Wpisz prośbę niżej.";
    if (name === "NotSupportedError" || name === "SecurityError")
      return "Tu mikrofon nie działa. Otwórz stronę na telefonie albo wpisz prośbę niżej.";
    return "Nie udało się nagrać. Wpisz prośbę niżej.";
  }

  function stop() {
    const rec = recRef.current;
    if (!rec) {
      released.current = true;
      return;
    }
    recRef.current = null;
    setRecording(false);
    void finishSpeech().then(() => {
      if (rec.state !== "inactive") rec.stop();
    });
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
          {recording ? "Mów…" : busy ? "Rozpoznaję" : "Przytrzymaj"}
        </button>
        <p className="mt-4 text-center text-sm text-[#667085]">
          {recording ? heard || "Słucham. Puść, kiedy skończysz." : "Nagranie usłyszy tylko koordynator."}
        </p>
      </div>
      {localError || error ? <p className="mt-4 text-sm text-red-700">{localError ?? error}</p> : null}
      {latest ? (
        <article className={`mt-8 ${cardClass()}`}>
          <StatusPill status={latest.status} />
          <p className="mt-3 text-lg font-semibold">{latest.summary || "Prośba głosowa"}</p>
          {latest.hasAudio ? <audio className="mt-3 w-full" controls src={`/api/audio/${latest.id}`} /> : null}
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

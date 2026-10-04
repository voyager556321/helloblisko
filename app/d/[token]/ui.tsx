"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import type { PublicRequest, Status } from "@/lib/types";

type Cat = "zakupy" | "leki" | "opieka" | "spacer" | "gotowanie" | "naprawa" | "urzad" | "inne";
type Step = "what" | "when" | "where" | "review";
type Screen = "home" | "rec" | "analyze" | "more" | "request" | "task" | Step;

type Item = { cat: Cat; t: string; s: string };
type Draft = {
  from: "voice" | "quick";
  items: Item[];
  when: { l: string } | null;
  where: { a: string; src: string } | null;
  quote: string;
  audio: Blob | null;
};

type Feed = {
  senior: { name: string; address: string; district: string };
  requests: PublicRequest[];
};

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

const WHAT: Record<Cat, { q: string; spoken: string; ideas: string[] }> = {
  zakupy: { q: "Co kupić?", spoken: "Co kupić?", ideas: ["Chleb, mleko, jajka", "Zakupy na obiad", "Coś z listy"] },
  leki: { q: "Jakie leki odebrać?", spoken: "Jakie leki odebrać?", ideas: ["Leki z apteki", "Leki na receptę"] },
  opieka: { q: "W czym pomóc?", spoken: "W czym pomóc?", ideas: ["Pomoc w domu", "Wizyta u lekarza"] },
  spacer: { q: "Jaki spacer?", spoken: "Jaki spacer?", ideas: ["Spacer po okolicy", "Spacer do parku"] },
  gotowanie: { q: "Co ugotować?", spoken: "Co ugotować?", ideas: ["Obiad", "Zupa"] },
  naprawa: { q: "Co naprawić?", spoken: "Co naprawić?", ideas: ["Drobna naprawa w domu"] },
  urzad: { q: "W jakiej sprawie?", spoken: "W jakiej sprawie do urzędu?", ideas: ["Sprawa w urzędzie"] },
  inne: { q: "Co trzeba zrobić?", spoken: "Co trzeba zrobić?", ideas: [] },
};

const CATS: { id: Cat; t: string; o?: boolean }[] = [
  { id: "zakupy", t: "Zakupy", o: true },
  { id: "leki", t: "Leki" },
  { id: "opieka", t: "Opieka osobista", o: true },
  { id: "spacer", t: "Spacer" },
  { id: "gotowanie", t: "Gotowanie" },
  { id: "naprawa", t: "Naprawa" },
  { id: "urzad", t: "Urząd" },
  { id: "inne", t: "Inne" },
];

const OPEN: Status[] = ["ready", "assigned", "revealed"];

function speechCtor(): (new () => BrowserSpeech) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeech;
    webkitSpeechRecognition?: new () => BrowserSpeech;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function catOf(id: Cat) {
  return CATS.find((item) => item.id === id) ?? CATS[7];
}

function firstName(name: string | null) {
  return name?.split(" ")[0] || "ktoś";
}

function hello(name: string) {
  const first = name.split(" ")[0] || "Anno";
  return `Dzień dobry, ${first === "Anna" ? "Anno" : first}`;
}

function sentAt(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function micMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError") return "Przeglądarka nie puściła mikrofonu. Odśwież stronę i naciśnij jeszcze raz.";
  if (name === "NotFoundError") return "Nie widzę mikrofonu. Wybierz sprawę z listy albo wpisz.";
  if (name === "NotSupportedError" || name === "SecurityError") return "Tu mikrofon nie działa. Wybierz sprawę albo wpisz.";
  return "Nie udało się nagrać. Wybierz sprawę albo wpisz.";
}

function parseVoice(text: string, audio: Blob | null): Draft {
  const lower = text.toLowerCase();
  const items: Item[] = [];
  if (/aptek|lek/.test(lower)) items.push({ cat: "leki", t: "Odebrać leki z apteki", s: "kod z recepty, jeśli go podałaś" });
  if (/zakup|chleb|mleko|sklep|jaj/.test(lower)) items.push({ cat: "zakupy", t: "Zakupy", s: "" });
  if (/lekar|wizyt/.test(lower)) items.push({ cat: "opieka", t: "Wizyta", s: "" });
  if (/spacer/.test(lower)) items.push({ cat: "spacer", t: "Spacer", s: "" });
  if (!items.length) items.push({ cat: "inne", t: text.slice(0, 90), s: "" });

  let when: { l: string } | null = null;
  if (/jutro/.test(lower) && /rano/.test(lower)) when = { l: "Jutro rano" };
  else if (/po południu/.test(lower)) when = { l: /jutro/.test(lower) ? "Jutro po południu" : "Po południu" };
  else if (/jutro/.test(lower)) when = { l: "Jutro" };
  else if (/dzi[sś]|dzisiaj/.test(lower)) when = { l: "Dziś" };
  else if (/tygodni/.test(lower)) when = { l: "W tym tygodniu" };

  const street = text.match(/ul\.?\s+[^.,]{3,48}/i);
  const where = street
    ? { a: street[0].replace(/\s+/g, " ").trim(), src: "z nagrania" }
    : /mazowieck/.test(lower)
      ? { a: "ul. Mazowiecka 4/6", src: "z nagrania" }
      : null;

  return { from: "voice", items, when, where, quote: text, audio };
}

function speak(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pl-PL";
    utter.rate = 0.92;
    window.speechSynthesis.speak(utter);
  } catch {
    /* The question stays on screen. */
  }
}

async function transcribe(token: string, blob: Blob) {
  const form = new FormData();
  form.append("audio", blob, "voice.webm");
  const res = await fetch(`/api/device/${token}/transcribe`, { method: "POST", body: form });
  if (!res.ok) return "";
  const json = (await res.json()) as { transcript?: string };
  return json.transcript ?? "";
}

function Glyph({ kind = "mic" }: { kind?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 26,
    height: 26,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (kind === "cart") {
    return (
      <svg {...common}>
        <path d="M3 4h2.2l2.3 11h10.3l2-8H6.6" />
        <circle cx="9.5" cy="19.5" r="1.5" />
        <circle cx="16.5" cy="19.5" r="1.5" />
      </svg>
    );
  }
  if (kind === "pill") {
    return (
      <svg {...common}>
        <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
        <path d="M9.5 9.5l5 5" />
      </svg>
    );
  }
  if (kind === "care") {
    return (
      <svg {...common}>
        <path d="M12 20s-6.5-4-6.5-9.2A3.6 3.6 0 0112 8.6a3.6 3.6 0 016.5 2.2C18.5 16 12 20 12 20z" />
      </svg>
    );
  }
  if (kind === "walk") {
    return (
      <svg {...common}>
        <circle cx="13" cy="4.5" r="1.8" />
        <path d="M10 21l2-6-2.5-2.5 1-4.5 3 2.5 3 1" />
      </svg>
    );
  }
  if (kind === "pot") {
    return (
      <svg {...common}>
        <path d="M4 10h16v6a4 4 0 01-4 4H8a4 4 0 01-4-4z" />
        <path d="M2.5 10h19" />
      </svg>
    );
  }
  if (kind === "tool") {
    return (
      <svg {...common}>
        <path d="M14.5 6.5a4 4 0 00-5.2 5.2L4 17v3h3l5.3-5.3a4 4 0 005.2-5.2l-2.5 2.5-2.5-.5-.5-2.5z" />
      </svg>
    );
  }
  if (kind === "doc") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4V20a.5.5 0 01-.5.5h-10.5A.5.5 0 016.5 20V4a.5.5 0 01.5-.5z" />
        <path d="M14 3.5V8h4" />
      </svg>
    );
  }
  if (kind === "more") {
    return (
      <svg {...common}>
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M3.5 10.6L12 3.5l8.5 7.1V20a1 1 0 01-1 1h-5v-6h-5v6h-5a1 1 0 01-1-1z" />
      </svg>
    );
  }
  if (kind === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }
  if (kind === "speaker") {
    return (
      <svg {...common}>
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
        <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />
      </svg>
    );
  }
  if (kind === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" />
      </svg>
    );
  }
  if (kind === "check") {
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  }
  if (kind === "pin") {
    return (
      <svg {...common}>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </svg>
    );
  }
  if (kind === "cal") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    );
  }
  if (kind === "list") {
    return (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (kind === "phone") {
    return (
      <svg {...common}>
        <path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 006.3 6.3l1.4-2.2L20 15.5V19a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3.5" />
    </svg>
  );
}

const CAT_ICON: Record<Cat, string> = {
  zakupy: "cart",
  leki: "pill",
  opieka: "care",
  spacer: "walk",
  gotowanie: "pot",
  naprawa: "tool",
  urzad: "doc",
  inne: "more",
};

function countLabel(count: number) {
  return count === 1 ? "1 prośba w toku" : `${count} prośby w toku`;
}

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function taskParts(summary: string) {
  const bits = summary.split(". ").map((part) => part.replace(/\.$/, "").trim()).filter(Boolean);
  if (bits.length >= 3) return { what: bits[0], when: bits[1], where: bits.slice(2).join(". ") };
  return { what: summary, when: "", where: "" };
}

function sentences(summary: string) {
  return summary
    .replace(/\bul\.\s+/gi, "ul\u0000")
    .split(". ")
    .map((part) => part.replace(/\.$/, "").replace(/\u0000/g, ". ").trim())
    .filter(Boolean);
}

function saidSummary(summary: string) {
  const bits = sentences(summary);
  const boilerplate = (bit: string) =>
    /z recepty, jeśli go podałaś/i.test(bit) ||
    /^(ul\.|ulica)(\s|$)/i.test(bit) ||
    /^(dziś|dzisiaj|jutro( rano| po południu| wieczorem)?|po południu|rano|w tym tygodniu)$/i.test(bit) ||
    /^(zakupy|spacer|wizyta|opieka osobista|gotowanie|naprawa|leki)$/i.test(bit) ||
    /^odebrać leki z apteki\b/i.test(bit) ||
    /^leki:\s*leki z apteki$/i.test(bit) ||
    bit === "Nagranie głosowe" ||
    bit === "Запит голосом";
  const spoken = bits
    .filter((bit) => !boilerplate(bit))
    .map((bit) => bit.replace(/^(leki|zakupy|spacer|wizyta|opieka osobista|opieka):\s*/i, "").trim())
    .filter(Boolean);
  const text = (spoken.length ? spoken : [taskParts(summary).what.replace(/:?\s*z recepty, jeśli go podałaś/i, "").replace(/:\s*$/, "").trim()]).join(". ");
  const clean = text.replace(/^halo[,!\s]+/i, "").replace(/\s+/g, " ").trim();
  if (!clean) return "Prośba";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function shortTitle(summary: string) {
  const text = summary.toLowerCase();
  if (/zakup|sklep|chleb|mleko|kupi/.test(text)) return "Zakupy";
  if (/aptek|lek/.test(text)) return "Leki";
  if (/spacer/.test(text)) return "Spacer";
  if (/opieka|lekar|wizyt/.test(text)) return "Opieka osobista";
  const line = summary.split(".")[0]?.trim() || "Prośba";
  return line.length > 28 ? `${line.slice(0, 28)}…` : line;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function HomeScreen({ token, fontClass }: { token: string; fontClass: string }) {
  const { data, error, reload } = usePoll<Feed>(`/api/device/${token}/requests`);
  const [screen, setScreen] = useState<Screen>("home");
  const [big, setBig] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [flow, setFlow] = useState<Step[]>(["review"]);
  const [heard, setHeard] = useState("");
  const [timer, setTimer] = useState("0:00");
  const [micError, setMicError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typing, setTyping] = useState<"what" | "when" | "where" | null>(null);
  const [typed, setTyped] = useState("");
  const [saying, setSaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ id: string; said: string; phase: "seek" | "found" | "done" } | null>(null);
  const [fresh, setFresh] = useState<PublicRequest | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<BrowserSpeech | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const heardRef = useRef("");
  const audioRef = useRef<Blob | null>(null);
  const mimeRef = useRef("audio/webm");
  const recForRef = useRef<"free" | "what">("free");
  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;
  const requests = data?.requests ?? [];
  const senior = data?.senior;
  const active = requests.filter((row) => OPEN.includes(row.status));
  const selected = requests.find((row) => row.id === selectedId) ?? (fresh?.id === selectedId ? fresh : null);

  useEffect(() => {
    document.documentElement.classList.toggle("big", big);
    return () => document.documentElement.classList.remove("big");
  }, [big]);

  useEffect(() => {
    const fit = () => {
      const coarse = window.matchMedia("(max-width: 600px) and (pointer: coarse)").matches;
      const scale = coarse
        ? 1
        : Math.min(1, (window.innerHeight - 48) / (852 + 24), (window.innerWidth - 32) / (393 + 24));
      document.documentElement.style.setProperty("--k", scale.toFixed(3));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.documentElement.style.removeProperty("--k");
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!notice || notice.phase === "done") return;
    const wait = notice.phase === "seek" ? 3000 : 5000;
    const next = notice.phase === "seek" ? "found" : "done";
    const id = window.setTimeout(() => {
      setNotice((current) =>
        current && current.id === notice.id && current.phase === notice.phase ? { ...current, phase: next } : current,
      );
    }, wait);
    return () => window.clearTimeout(id);
  }, [notice]);

  function showToast(text: string) {
    setToast(text);
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
    speech.onerror = () => undefined;
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

  function stopGear() {
    const rec = recRef.current;
    recRef.current = null;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void finishSpeech();
  }

  async function armRecorder() {
    beginSpeech();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"].find((item) => {
      try {
        return MediaRecorder.isTypeSupported(item);
      } catch {
        return false;
      }
    });
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mimeRef.current = mime || rec.mimeType || "audio/webm";
    chunks.current = [];
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    rec.start(250);
    recRef.current = rec;
  }

  function takeBlob() {
    return new Promise<Blob | null>((resolve) => {
      const rec = recRef.current;
      recRef.current = null;
      const pack = () => (chunks.current.length ? new Blob(chunks.current, { type: mimeRef.current }) : null);
      if (!rec || rec.state === "inactive") {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        resolve(pack());
        return;
      }
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        resolve(pack());
      };
      rec.stop();
    });
  }

  useEffect(() => {
    if (screen !== "rec") return;
    let dead = false;
    setMicError(null);
    setHeard("");
    heardRef.current = "";
    audioRef.current = null;
    setTimer("0:00");
    const started = Date.now();
    const clock = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      setTimer(`0:${String(seconds).padStart(2, "0")}`);
    }, 250);
    void armRecorder()
      .then(() => {
        if (dead) stopGear();
      })
      .catch((err: unknown) => {
        if (!dead) setMicError(micMessage(err));
      });
    return () => {
      dead = true;
      window.clearInterval(clock);
      stopGear();
    };
    // armRecorder closes over fresh refs; it should run once per visit to the recording screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (screen !== "analyze") return;
    let gone = false;
    setStep(0);
    const timers = [window.setTimeout(() => setStep(1), 500), window.setTimeout(() => setStep(2), 1100)];
    void (async () => {
      let text = heardRef.current.trim();
      const blob = audioRef.current;
      if (text.length < 2 && blob && blob.size > 800) {
        try {
          text = (await transcribe(token, blob)).trim();
        } catch {
          text = "";
        }
        heardRef.current = text;
        if (!gone) setHeard(text);
      }
      if (gone) return;
      setStep(3);
      if (text.length < 2) {
        showToast("Nic nie usłyszałam. Spróbuj jeszcze raz.");
        setScreen(recForRef.current === "what" ? "what" : "home");
        return;
      }
      const parsed = parseVoice(text, blob);
      const current = draftRef.current;
      const merged: Draft = recForRef.current === "what" && current?.items[0]
        ? {
            ...current,
            items: [{ ...current.items[0], s: text.trim() }],
            when: parsed.when ?? current.when,
            where: parsed.where ?? current.where,
            quote: text.trim(),
            audio: blob,
          }
        : parsed;
      setDraft(merged);
      const steps: Step[] = [];
      if (!merged.when) steps.push("when");
      if (!merged.where) steps.push("where");
      steps.push("review");
      setFlow(steps);
      setTyping(null);
      setScreen(steps[0]);
    })();
    return () => {
      gone = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [screen, token]);

  function pickCat(id: Cat) {
    const cat = catOf(id);
    const next: Draft = { from: "quick", items: [{ cat: cat.id, t: cat.t, s: "" }], when: null, where: null, quote: "", audio: null };
    setDraft(next);
    setFlow(["what", "when", "where", "review"]);
    setTyping(null);
    setSaying(false);
    setScreen("what");
  }

  function startRec(intent: "free" | "what") {
    recForRef.current = intent;
    setMicError(null);
    setScreen("rec");
  }

  function chooseWhat(detail: string) {
    const value = detail.trim();
    if (!value) return;
    setDraft((current) => {
      if (!current?.items[0]) return current;
      return { ...current, items: [{ ...current.items[0], s: value }], quote: value };
    });
    setTyped("");
    goNext("what");
  }

  function goNext(current: Step) {
    const index = flow.indexOf(current);
    setTyping(null);
    setSaying(false);
    setScreen(flow[index + 1] ?? "review");
  }

  async function finishRecording() {
    const text = await finishSpeech();
    heardRef.current = text || heardRef.current;
    audioRef.current = await takeBlob();
    const blob = audioRef.current;
    if (heardRef.current.trim().length < 2 && (!blob || blob.size < 800)) {
      showToast("Nic nie usłyszałam. Spróbuj jeszcze raz.");
      setScreen(recForRef.current === "what" ? "what" : "home");
      return;
    }
    setScreen("analyze");
  }

  async function toggleSay(kind: "when" | "where") {
    if (!saying) {
      setSaying(true);
      setMicError(null);
      try {
        await armRecorder();
      } catch (err) {
        setSaying(false);
        setMicError(micMessage(err));
      }
      return;
    }
    setSaying(false);
    const text = (await finishSpeech()) || heardRef.current;
    const blob = await takeBlob();
    let heardLine = text.trim();
    if (heardLine.length < 2 && blob && blob.size > 800) heardLine = (await transcribe(token, blob)).trim();
    if (!heardLine) {
      showToast("Nie usłyszałam. Wybierz odpowiedź albo wpisz.");
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      if (kind === "when") return { ...current, when: { l: heardLine } };
      return { ...current, where: { a: heardLine, src: "powiedziany" } };
    });
    goNext(kind);
  }

  function saveTyped(kind: "what" | "when" | "where") {
    const value = typed.trim();
    if (!value) return;
    if (kind === "what") {
      chooseWhat(value);
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      if (kind === "when") return { ...current, when: { l: value } };
      return { ...current, where: { a: value, src: "wpisany" } };
    });
    setTyped("");
    goNext(kind);
  }

  function leaveQuestion(current: Step) {
    setSaying(false);
    stopGear();
    setTyping(null);
    if (current !== "what" && draft?.when && draft.where) {
      setScreen("review");
      return;
    }
    const index = flow.indexOf(current);
    setScreen(index > 0 ? flow[index - 1] : "home");
  }

  async function send() {
    if (!draft || busy) return;
    if (!draft.when || !draft.where || draft.items.length === 0) return;
    setBusy(true);
    const head = draft.items.map((item) => [item.t, item.s].filter(Boolean).join(": ")).join(". ");
    const extra = draft.quote && !head.includes(draft.quote) ? draft.quote : "";
    const transcript = [head, draft.when.l, draft.where.a, extra].filter(Boolean).join(". ");
    try {
      const res = draft.audio
        ? await fetch(`/api/device/${token}/requests`, {
            method: "POST",
            body: (() => {
              const form = new FormData();
              form.append("audio", draft.audio as Blob, "voice.webm");
              form.append("transcript", transcript);
              return form;
            })(),
          })
        : await fetch(`/api/device/${token}/requests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript }),
          });
      const json = (await res.json()) as { error?: string; request?: PublicRequest };
      if (!res.ok) throw new Error(json.error ?? "Nie wysłano");
      reload();
      setDraft(null);
      if (json.request) setFresh(json.request);
      setNotice({
        id: json.request?.id ?? "",
        said: saidSummary(json.request?.summary || transcript),
        phase: "seek",
      });
      setScreen("home");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie wysłano");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSelected() {
    if (!selected) return;
    setCancelOpen(false);
    setBusy(true);
    const res = await fetch(`/api/device/${token}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id }),
    });
    setBusy(false);
    if (!res.ok) {
      showToast("Nie anulowano");
      return;
    }
    reload();
    showToast("Anulowano prośbę");
  }

  const tab = screen === "request" || screen === "task" ? "request" : "home";
  const showTabs = screen !== "rec" && screen !== "analyze";
  const progress = flow.length > 1 ? flow : [];
  const progressAt = progress.indexOf(screen as Step);

  return (
    <div className={`halo ${fontClass}`}>
      <div className="stage">
        <span className="blob a" aria-hidden="true" />
        <span className="blob b" aria-hidden="true" />
        <div className="fit">
        <div className="phone" aria-label="HaloBlisko">
          <div className="sbar" aria-hidden="true">
            <span>9:41</span>
            <svg viewBox="0 0 64 12" fill="#0F1D33" aria-hidden="true">
              <rect x="0" y="8" width="3" height="4" rx="1" />
              <rect x="5" y="6" width="3" height="6" rx="1" />
              <rect x="10" y="3" width="3" height="9" rx="1" />
              <rect x="15" y="0" width="3" height="12" rx="1" />
              <path d="M30 3.5a9 9 0 0112 0l-1.6 1.7a6.6 6.6 0 00-8.8 0zM33 6.7a4.6 4.6 0 016 0L36 10z" />
              <rect x="45" y="1" width="17" height="10" rx="3" fill="none" stroke="#0F1D33" strokeWidth="1.4" />
              <rect x="47" y="3" width="13" height="6" rx="1.5" />
            </svg>
          </div>
          <div className="app">
            {screen === "home" ? (
              <section className="screen" aria-labelledby="hello">
                <div className="hello">
                  <h1 className="h1" id="hello">{senior ? hello(senior.name) : "Dzień dobry"}</h1>
                  <button type="button" className="round" aria-pressed={big} aria-label="Większe litery" onClick={() => setBig((on) => !on)}>
                    A+
                  </button>
                </div>
                {notice ? (
                  <button
                    type="button"
                    className={`row now ${notice.phase}`}
                    aria-live="polite"
                    onClick={() => {
                      if (notice.id) {
                        setSelectedId(notice.id);
                        setScreen("task");
                        return;
                      }
                      setScreen("request");
                    }}
                  >
                    <span className="ic" aria-hidden="true">
                      <Glyph kind={notice.phase === "done" ? "check" : notice.phase === "found" ? "user" : "clock"} />
                    </span>
                    <span>
                      <b>
                        {notice.phase === "seek"
                          ? "Szukamy pomocy"
                          : notice.phase === "found"
                            ? "Pomoc znaleziona"
                            : "Pomoc udzielona"}
                        {notice.phase === "seek" ? <span className="dots" aria-hidden="true" /> : null}
                      </b>
                      {notice.phase === "seek" ? <small>{notice.said}</small> : null}
                    </span>
                    <Chevron />
                  </button>
                ) : active.length > 0 ? (
                  <button type="button" className="row now" onClick={() => setScreen("request")}>
                    <span className="ic" aria-hidden="true"><Glyph kind="clock" /></span>
                    <span>
                      <b>{countLabel(active.length)}</b>
                      <small>{[...new Set(active.map((row) => shortTitle(row.summary)))].slice(0, 2).join(", ")}</small>
                    </span>
                    <Chevron />
                  </button>
                ) : null}
                <button type="button" className="voice" onClick={() => startRec("free")}>
                  <span className="m" aria-hidden="true"><Glyph /></span>
                  <b>Powiedz, czego potrzebujesz</b>
                </button>
                <p className="label">albo wybierz</p>
                <div className="grid">
                  {CATS.slice(0, 4).map((cat) => (
                    <button key={cat.id} type="button" className="tile" onClick={() => pickCat(cat.id)}>
                      <span className={`ic${cat.o ? " o" : ""}`} aria-hidden="true"><Glyph kind={CAT_ICON[cat.id]} /></span>
                      <b>{cat.t}</b>
                    </button>
                  ))}
                </div>
                <button type="button" className="row" onClick={() => setScreen("more")}>
                  <span className="ic" aria-hidden="true"><Glyph kind="more" /></span>
                  <b>Więcej</b>
                  <Chevron />
                </button>
                {micError || error ? <p className="err">{micError ?? error}</p> : null}
              </section>
            ) : null}

            {screen === "rec" ? (
              <section className="screen" aria-labelledby="h-rec">
                <div className="nav">
                  <button type="button" className="icon" aria-label="Anuluj nagrywanie" onClick={() => setScreen(recForRef.current === "what" ? "what" : "home")}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                  <span />
                  <span className="timer"><i aria-hidden="true" />{timer}</span>
                </div>
                <div className="rec-wrap">
                  <h1 className="h1" id="h-rec">Słucham…</h1>
                  <span className="bigmic" aria-hidden="true"><Glyph /></span>
                  <div className="live" aria-live="polite">
                    {heard ? <>{heard}<span className="cursor" aria-hidden="true" /></> : <span className="ph">{recForRef.current === "what" && draft ? WHAT[draft.items[0]?.cat ?? "inne"].spoken : "Mów spokojnie, jak do sąsiadki."}</span>}
                  </div>
                  <p className="priv">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
                    </svg>
                    <span>Słyszy to tylko koordynatorka MOPS</span>
                  </p>
                  {micError ? <p className="err">{micError}</p> : null}
                </div>
                <div className="foot">
                  <button type="button" className="btn b-primary" onClick={() => void finishRecording()}>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" /></svg>
                    Gotowe
                  </button>
                </div>
              </section>
            ) : null}

            {screen === "analyze" ? (
              <section className="screen" aria-labelledby="h-an">
                <div className="nav"><span /><span /><span /></div>
                <h1 className="h1" id="h-an">Chwileczkę…</h1>
                <p className="live" style={{ minHeight: 0 }}>{heard ? `„${heard}”` : "Zamieniam mowę na tekst."}</p>
                <ol className="steps">
                  {["Zapisuję nagranie", "Zamieniam mowę na tekst", "Robię listę zadań"].map((label, index) => (
                    <li key={label} className={index < step ? "done" : index === step ? "cur" : ""}>
                      <span className="c" aria-hidden="true">{index < step ? "✓" : index + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {screen === "what" && draft?.items[0] ? (
              <section className="screen" aria-labelledby="q-what">
                <div className="nav">
                  <button type="button" className="icon" aria-label="Wróć" onClick={() => leaveQuestion("what")}>
                    <BackIcon />
                  </button>
                  <span className="prog" aria-hidden="true">
                    {progress.map((item, index) => <i key={item} className={index <= progressAt ? "on" : ""} />)}
                  </span>
                  <span />
                </div>
                <div className="assist">
                  <span className="av" aria-hidden="true"><Glyph kind="speaker" /></span>
                  <div className="bubble">
                    <b id="q-what">{WHAT[draft.items[0].cat].q}</b>
                    <button type="button" onClick={() => speak(WHAT[draft.items[0].cat].spoken)}>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
                      Posłuchaj pytania
                    </button>
                  </div>
                </div>
                <button type="button" className="voice" onClick={() => startRec("what")}>
                  <span className="m" aria-hidden="true"><Glyph /></span>
                  <b>Powiedz, czego potrzebujesz</b>
                </button>
                {WHAT[draft.items[0].cat].ideas.length > 0 ? (
                  <>
                    <div className="or">albo wybierz</div>
                    <div className="ans">
                      {WHAT[draft.items[0].cat].ideas.map((idea) => (
                        <button key={idea} type="button" className="btn b-white" onClick={() => chooseWhat(idea)}>
                          {idea}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                <button type="button" className="btn b-outline" onClick={() => { setTyping("what"); setTyped(draft.items[0]?.s ?? ""); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                  Wpisz ręcznie
                </button>
                {typing === "what" ? (
                  <div className="field">
                    <input
                      value={typed}
                      aria-label="Co trzeba zrobić"
                      placeholder="np. chleb, mleko i jajka"
                      onChange={(event) => setTyped(event.target.value)}
                    />
                    <button type="button" className="btn b-primary" onClick={() => saveTyped("what")}>Zapisz</button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {screen === "when" || screen === "where" ? (
              <section className="screen">
                <div className="nav">
                  <button type="button" className="icon" aria-label="Wróć" onClick={() => leaveQuestion(screen)}>
                    <BackIcon />
                  </button>
                  <span className="prog" aria-hidden="true">
                    {progress.map((item, index) => <i key={item} className={index <= progressAt ? "on" : ""} />)}
                  </span>
                  <span />
                </div>
                <div className="assist">
                  <span className="av" aria-hidden="true"><Glyph kind="speaker" /></span>
                  <div className="bubble">
                    <b>{screen === "when" ? "Kiedy potrzebujesz pomocy?" : "Pod jaki adres?"}</b>
                    <button type="button" onClick={() => speak(screen === "when" ? "Kiedy potrzebujesz pomocy?" : "Pod jaki adres przyjść?")}>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
                      Posłuchaj pytania
                    </button>
                  </div>
                </div>
                <button type="button" className={`btn b-voice${saying ? " on" : ""}`} onClick={() => void toggleSay(screen)}>
                  <Glyph />
                  {saying ? "Słucham… stuknij, gdy skończysz" : screen === "when" ? "Powiedz" : "Powiedz adres"}
                </button>
                {screen === "when" ? (
                  <>
                    <div className="or">albo wybierz</div>
                    <div className="ans">
                      {[
                        ["Dziś", "Dziś"],
                        ["Jutro rano", "Jutro rano"],
                        ["Jutro po południu", "Jutro po południu"],
                        ["W tym tygodniu", "Obojętnie, w tym tygodniu"],
                      ].map(([value, label]) => (
                        <button key={value} type="button" className="btn b-white" onClick={() => { setDraft((current) => current && { ...current, when: { l: value } }); goNext("when"); }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="or">albo</div>
                    <button
                      type="button"
                      className="btn b-white"
                      onClick={() => {
                        const address = senior?.address || "ul. Mazowiecka 4/6";
                        setDraft((current) => current && { ...current, where: { a: address, src: "z lokalizacji telefonu" } });
                        showToast("Mam adres z lokalizacji");
                        goNext("where");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        <circle cx="12" cy="12" r="7" />
                      </svg>
                      Użyj mojej lokalizacji
                    </button>
                  </>
                )}
                <button type="button" className="btn b-outline" onClick={() => { setTyping(screen); setTyped(""); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                  Wpisz ręcznie
                </button>
                {typing === screen ? (
                  <div className="field">
                    <input
                      value={typed}
                      aria-label={screen === "when" ? "Kiedy" : "Adres"}
                      placeholder={screen === "when" ? "np. w piątek o 12:00" : "ulica, numer domu i mieszkania"}
                      onChange={(event) => setTyped(event.target.value)}
                    />
                    <button type="button" className="btn b-primary" onClick={() => saveTyped(screen)}>Zapisz</button>
                  </div>
                ) : null}
                {micError ? <p className="err">{micError}</p> : null}
              </section>
            ) : null}

            {screen === "review" && draft ? (
              <section className="screen" aria-labelledby="h-rev">
                <div className="nav">
                  <button type="button" className="icon" aria-label="Wróć" onClick={() => {
                    const steps = flow.filter((step) => step !== "review");
                    setScreen(steps[steps.length - 1] ?? "home");
                  }}>
                    <BackIcon />
                  </button>
                  <span className="prog" aria-hidden="true">
                    {progress.map((item, index) => <i key={item} className={index <= progressAt ? "on" : ""} />)}
                  </span>
                  <span />
                </div>
                <h1 className="h1" id="h-rev">Sprawdź i wyślij</h1>
                <div className="sec">
                  <p className="label">Co trzeba zrobić</p>
                  <div className="box">
                    {draft.items.map((item, index) => (
                      <div className="li" key={`${item.t}-${index}`}>
                        <span className={`ic${catOf(item.cat).o ? " o" : ""}`} aria-hidden="true"><Glyph kind={CAT_ICON[item.cat]} /></span>
                        <span>
                          <b>{item.t}</b>
                          {item.s ? <small>{item.s}</small> : null}
                        </span>
                        {draft.items.length > 1 ? (
                          <button type="button" className="x" aria-label={`Usuń: ${item.t}`} onClick={() => setDraft((current) => current && { ...current, items: current.items.filter((_, i) => i !== index) })}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sec">
                  <p className="label">Kiedy</p>
                  <div className="box">
                    <button type="button" className="li" onClick={() => setScreen("when")}>
                      <span className="ic" aria-hidden="true"><Glyph kind="cal" /></span>
                      <span><b>{draft.when?.l}</b></span>
                      <span className="edit">Zmień</span>
                    </button>
                  </div>
                </div>
                <div className="sec">
                  <p className="label">Gdzie</p>
                  <div className="box">
                    <button type="button" className="li" onClick={() => setScreen("where")}>
                      <span className="ic" aria-hidden="true"><Glyph kind="pin" /></span>
                      <span>
                        <b>{draft.where?.a}</b>
                        <small>{draft.where?.src}</small>
                      </span>
                      <span className="edit">Zmień</span>
                    </button>
                  </div>
                </div>
                <div className="foot">
                  <button type="button" className="btn b-primary" disabled={busy} onClick={() => void send()}>{busy ? "Wysyłam…" : "Wyślij"}</button>
                  {draft.from === "voice" ? <button type="button" className="link" onClick={() => setScreen("rec")}>Nagraj od nowa</button> : null}
                </div>
              </section>
            ) : null}

            {screen === "more" ? (
              <section className="screen" aria-labelledby="h-more">
                <div className="nav">
                  <button type="button" className="icon" aria-label="Wróć" onClick={() => setScreen("home")}><BackIcon /></button>
                  <span /><span />
                </div>
                <h1 className="h1" id="h-more">W czym pomóc?</h1>
                <div className="stack">
                  {CATS.map((cat) => (
                    <button key={cat.id} type="button" className="row" onClick={() => pickCat(cat.id)}>
                      <span className={`ic${cat.o ? " o" : ""}`} aria-hidden="true"><Glyph kind={CAT_ICON[cat.id]} /></span>
                      <b>{cat.t}</b>
                      <Chevron />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {screen === "request" ? (
              <RequestList
                requests={requests}
                onOpen={(id) => { setSelectedId(id); setScreen("task"); }}
                onRecord={() => startRec("free")}
              />
            ) : null}

            {screen === "task" && selected ? (
              <TaskView
                row={selected}
                phase={notice?.id === selected.id ? notice.phase : null}
                onBack={() => setScreen("request")}
                onHome={() => setScreen("home")}
                onCancel={() => setCancelOpen(true)}
              />
            ) : null}

            {showTabs ? (
              <nav className="tabs" aria-label="Menu">
                <button type="button" className="tab" aria-current={tab === "home" ? "page" : undefined} onClick={() => setScreen("home")}><Glyph kind="home" />Start</button>
                <button type="button" className="tab" aria-current={tab === "request" ? "page" : undefined} onClick={() => setScreen("request")}>
                  {active.length > 0 && tab !== "request" ? <span className="badge" /> : null}
                  <Glyph kind="list" />Moje prośby
                </button>
                <button type="button" className="tab" onClick={() => setCallOpen(true)}><Glyph kind="phone" />Zadzwoń</button>
              </nav>
            ) : null}

            {callOpen ? (
              <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="h-call">
                <div className="sheet">
                  <span className="grab" aria-hidden="true" />
                  <b id="h-call">MOPS {senior?.district || "Krowodrza"}</b>
                  <p className="tel">12 345 67 89</p>
                  <button type="button" className="btn b-primary" onClick={() => { setCallOpen(false); showToast("Wybierz 12 345 67 89 na telefonie"); }}>Zadzwoń</button>
                  <button type="button" className="btn b-outline" onClick={() => setCallOpen(false)}>Zamknij</button>
                </div>
              </div>
            ) : null}

            {cancelOpen ? (
              <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="h-cancel">
                <div className="sheet">
                  <span className="grab" aria-hidden="true" />
                  <b id="h-cancel">Anulować prośbę?</b>
                  <button type="button" className="btn b-danger-fill" onClick={() => void cancelSelected()}>Tak, anuluj</button>
                  <button type="button" className="btn b-outline" onClick={() => setCancelOpen(false)}>Nie</button>
                </div>
              </div>
            ) : null}

            {toast ? (
              <div className="toast" role="status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span>{toast}</span>
              </div>
            ) : null}
          </div>
          <div className="homebar" aria-hidden="true" />
        </div>
        </div>
      </div>
    </div>
  );
}

function statusView(row: PublicRequest) {
  const who = firstName(row.volunteerName);
  if (row.status === "ready") return { k: "wait", label: "Szukamy pomocy", hero: "Szukamy pomocy", sub: "Koordynatorka MOPS wybiera osobę" };
  if (row.status === "assigned") return { k: "go", label: `Przyjdzie ${who}`, hero: `${who} przyjdzie`, sub: "Osoba jest wybrana" };
  if (row.status === "revealed") return { k: "go", label: `${who} w drodze`, hero: `${who} jest w drodze`, sub: "Załatwia tę sprawę" };
  if (row.status === "done") return { k: "ok", label: "Gotowe", hero: "Gotowe!", sub: `${who} to załatwił` };
  return { k: "off", label: "Anulowana", hero: "Anulowana", sub: "Ta prośba jest zamknięta" };
}

function RequestList({ requests, onOpen, onRecord }: { requests: PublicRequest[]; onOpen: (id: string) => void; onRecord: () => void }) {
  const active = requests.filter((row) => OPEN.includes(row.status));
  const done = requests.filter((row) => row.status === "done");
  const cancelled = requests.filter((row) => row.status === "cancelled");
  return (
    <section className="screen" data-s="request" aria-labelledby="h-req">
      <div className="hello"><h1 className="h1" id="h-req">Moje prośby</h1></div>
      <div className="stack">{active.map((row) => <TaskButton key={row.id} row={row} onOpen={onOpen} />)}</div>
      {done.length > 0 ? <p className="label">Zrobione</p> : null}
      <div className="stack">{done.map((row) => <TaskButton key={row.id} row={row} onOpen={onOpen} closed />)}</div>
      {cancelled.length > 0 ? <p className="label">Anulowane</p> : null}
      <div className="stack">{cancelled.map((row) => <TaskButton key={row.id} row={row} onOpen={onOpen} closed />)}</div>
      {active.length === 0 ? (
        <div className="stack">
          <p className="sub">Nie masz teraz żadnej prośby.</p>
          <button type="button" className="btn b-voice" onClick={onRecord}><Glyph />Powiedz, czego potrzebujesz</button>
        </div>
      ) : null}
    </section>
  );
}

function TaskButton({ row, onOpen, closed }: { row: PublicRequest; onOpen: (id: string) => void; closed?: boolean }) {
  const view = statusView(row);
  return (
    <button type="button" className={`task${closed ? " closed" : ""}`} onClick={() => onOpen(row.id)}>
      <span className="ic" aria-hidden="true"><Glyph kind={/lek|aptek/i.test(row.summary) ? "pill" : /zakup/i.test(row.summary) ? "cart" : "list"} /></span>
      <span>
        <b>{row.summary || "Prośba"}</b>
        <span className="meta"><span className={`st ${view.k}`}><i aria-hidden="true" />{view.label}</span>{sentAt(row.createdAt)}</span>
      </span>
      <Chevron />
    </button>
  );
}

function TaskView({
  row,
  phase,
  onBack,
  onHome,
  onCancel,
}: {
  row: PublicRequest;
  phase: "seek" | "found" | "done" | null;
  onBack: () => void;
  onHome: () => void;
  onCancel: () => void;
}) {
  const [played, setPlayed] = useState<"seek" | "found" | "done">("seek");
  useEffect(() => {
    if (phase || row.status !== "ready") return;
    setPlayed("seek");
    const foundAt = window.setTimeout(() => setPlayed("found"), 3000);
    const doneAt = window.setTimeout(() => setPlayed("done"), 8000);
    return () => {
      window.clearTimeout(foundAt);
      window.clearTimeout(doneAt);
    };
  }, [phase, row.id, row.status]);
  const step = phase ?? (row.status === "ready" ? played : null);
  const real = statusView(row);
  const view = step === "seek"
    ? { k: "wait" as const, label: "Szukamy pomocy", hero: "Szukamy pomocy", sub: "W trakcie poszukiwania" }
    : step === "found"
      ? { k: "go" as const, label: "Pomoc znaleziona", hero: "Pomoc znaleziona", sub: "Ktoś już pomaga" }
      : step === "done"
        ? { k: "ok" as const, label: "Pomoc udzielona", hero: "Pomoc udzielona", sub: "Gotowe" }
        : real;
  const who = firstName(row.volunteerName);
  const labels = ["Wysłana", "Wybór osoby", row.volunteerName ? `Pomoże ${who}` : "Ktoś przyjdzie", "Gotowe"];
  const idx = step === "seek" ? 1 : step === "found" ? 2 : step === "done" ? 4 : { ready: 1, assigned: 2, revealed: 3, done: 4, cancelled: 1 }[row.status];
  const open = OPEN.includes(row.status);
  return (
    <section className="screen" data-s="task" aria-labelledby="h-task">
      <div className="nav">
        <button type="button" className="icon" aria-label="Wróć do listy" onClick={onBack}><BackIcon /></button>
        <span /><span />
      </div>
      <div className={`hero ${view.k}${step === "seek" ? " seek" : ""}`}>
        <span className="ic" aria-hidden="true"><Glyph kind={view.k === "wait" ? "clock" : view.k === "go" ? "user" : "check"} /></span>
        <span>
          <b id="h-task">
            {view.hero}
            {step === "seek" ? <span className="dots" aria-hidden="true" /> : null}
          </b>
          <small>{view.sub}</small>
        </span>
      </div>
      <div className="box">
        <div className="li">
          <span className="ic" aria-hidden="true"><Glyph kind={/lek|aptek/i.test(row.summary) ? "pill" : /zakup|kupi/i.test(row.summary) ? "cart" : "list"} /></span>
          <span>
            <b>{saidSummary(row.summary)}</b>
            <small>Tak powiedziałaś koordynatorce</small>
          </span>
          <span />
        </div>
        <div className="li">
          <span className="ic" aria-hidden="true"><Glyph kind="cal" /></span>
          <span><b>{taskParts(row.summary).when || `Wysłana ${sentAt(row.createdAt)}`}</b><small>Wysłana {sentAt(row.createdAt)}</small></span>
          <span />
        </div>
        {taskParts(row.summary).where ? (
          <div className="li">
            <span className="ic" aria-hidden="true"><Glyph kind="pin" /></span>
            <span><b>{taskParts(row.summary).where}</b></span>
            <span />
          </div>
        ) : null}
        {row.hasAudio ? <div className="li"><audio className="clip" controls src={`/api/audio/${row.id}`} /></div> : null}
      </div>
      {row.status !== "cancelled" ? (
        <ol className="tlh" aria-label="Postęp">
          {labels.map((label, index) => (
            <li key={label} className={index < idx ? "done" : index === idx ? "cur" : ""}>
              <span className="c" aria-hidden="true">{index < idx ? "✓" : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      ) : null}
      <div className={`actbar${open ? "" : " single"}`}>
        <button type="button" className="btn b-primary" onClick={onHome}><Glyph kind="home" />Na start</button>
        {open ? <button type="button" className="btn b-danger" onClick={onCancel}>Anuluj</button> : null}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Debug, NavyButton, OrangeButton, Phone, cardClass } from "@/components/phone";
import { usePoll } from "@/lib/use-poll";
import type { PublicRequest, Volunteer } from "@/lib/types";

const people = [
  { id: "v-jan", name: "Jan", hello: "Janie", ready: "Jestem dostępny" },
  { id: "v-ewa", name: "Ewa", hello: "Ewo", ready: "Jestem dostępna" },
  { id: "v-piotr", name: "Piotr", hello: "Piotrze", ready: "Jestem dostępny" },
];

type Payload = { volunteer: Volunteer; jobs: PublicRequest[] };

export default function VolunteerPage() {
  const [who, setWho] = useState(people[0].id);
  const { data, error, reload } = usePoll<Payload>(`/api/v/jobs?as=${who}`);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const person = people.find((item) => item.id === who) ?? people[0];
  const job = data?.jobs.find((item) => item.id === openId) ?? null;

  async function act(id: string, path: "reveal" | "done") {
    setNote(null);
    const res = await fetch(`/api/v/jobs/${id}/${path}?as=${who}`, { method: "POST" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) setNote(json.error ?? "Coś poszło nie tak");
    reload();
  }

  return (
    <Phone>
      {job ? (
        <JobView job={job} note={note} onBack={() => setOpenId(null)} onAct={act} />
      ) : (
        <ListView
          hello={person.hello}
          ready={person.ready}
          who={who}
          jobs={data?.jobs ?? []}
          error={error}
          onWho={(id) => {
            setWho(id);
            setOpenId(null);
          }}
          onOpen={setOpenId}
        />
      )}
      <Debug data={data} />
    </Phone>
  );
}

function ListView({
  hello,
  ready,
  who,
  jobs,
  error,
  onWho,
  onOpen,
}: {
  hello: string;
  ready: string;
  who: string;
  jobs: PublicRequest[];
  error: string | null;
  onWho: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const active = jobs.filter((job) => job.status !== "done");
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] leading-tight font-bold">Dzień dobry, {hello}</h1>
          <p className="mt-1 text-sm text-[#667085]">Pomóż komuś z Twojej filii</p>
        </div>
        <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#f47b20] shadow-[0_8px_24px_rgba(27,42,74,0.06)]">
          <Bell />
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fff1e6] px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f47b20]" />
          {ready}
        </span>
        <span className="text-[#f47b20]">▾</span>
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        {people.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onWho(item.id)}
            className={who === item.id ? "font-semibold text-[#f47b20]" : "text-[#98a2b3]"}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Zadania dla Ciebie</h2>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-3 space-y-3">
        {active.length === 0 ? <p className="text-sm text-[#667085]">Nie masz teraz zlecenia.</p> : null}
        {active.map((job) => (
          <article key={job.id} className={cardClass()}>
            <div className="flex gap-3">
              <IconBadge kind={kindOf(job.summary)} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{titleOf(job.summary)}</p>
                <p className="mt-0.5 text-sm text-[#667085]">
                  {job.district} · {whenLabel(job.createdAt)}
                </p>
                <p className="mt-2 text-xs text-[#98a2b3]">{tagOf(job.summary)}</p>
              </div>
            </div>
            <div className="mt-4">
              <OrangeButton onClick={() => onOpen(job.id)}>Zobacz zadanie</OrangeButton>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function JobView({
  job,
  note,
  onBack,
  onAct,
}: {
  job: PublicRequest;
  note: string | null;
  onBack: () => void;
  onAct: (id: string, path: "reveal" | "done") => void;
}) {
  const active = job.status === "revealed" || job.status === "done";
  return (
    <>
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>‹</span>
        {active ? "Aktywne zadanie" : "Szczegóły zadania"}
      </button>
      {active ? <Active job={job} note={note} onAct={onAct} /> : <Details job={job} note={note} onAct={onAct} />}
    </>
  );
}

function Details({
  job,
  note,
  onAct,
}: {
  job: PublicRequest;
  note: string | null;
  onAct: (id: string, path: "reveal" | "done") => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <IconBadge kind={kindOf(job.summary)} />
        <h1 className="text-[26px] leading-tight font-bold">{titleOf(job.summary)}</h1>
      </div>
      <div className={`mt-5 ${cardClass()} space-y-3 text-sm`}>
        <Row icon="clock" text={whenLabel(job.createdAt)} />
        <Row icon="pin" text={job.district} />
        <Row icon="time" text="około 30 min" />
      </div>
      <h2 className="mt-6 text-lg font-bold">Opis</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#667085]">{descriptionOf(job.summary)}</p>
      <div className={`mt-5 flex items-center gap-3 ${cardClass()}`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4f1ec] text-lg">⌂</span>
        <div>
          <p className="font-semibold">Koordynator MOPS</p>
          <p className="text-sm text-[#667085]">Adres i kod zobaczysz po przyjęciu zlecenia.</p>
        </div>
      </div>
      {note ? <p className="mt-3 text-sm text-red-700">{note}</p> : null}
      <div className="mt-6">
        <NavyButton onClick={() => onAct(job.id, "reveal")}>Przyjmij zadanie</NavyButton>
      </div>
    </>
  );
}

function Active({
  job,
  note,
  onAct,
}: {
  job: PublicRequest;
  note: string | null;
  onAct: (id: string, path: "reveal" | "done") => void;
}) {
  const finished = job.status === "done";
  const steps = [
    { title: "Odebrano zlecenie", done: true, detail: whenLabel(job.createdAt) },
    {
      title: "Leki odebrane",
      done: true,
      detail: finished ? "Kod został ukryty" : `Kod ${job.code4 ?? "—"} · PESEL ${job.pesel ?? "—"}`,
    },
    { title: "Dostarczono seniorce", done: finished, detail: finished ? "Zamknięte" : "Ostatni krok" },
  ];
  return (
    <>
      <div className="flex items-center gap-3 rounded-[22px] bg-[#fff1e6] p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f47b20] text-white">✓</span>
        <div>
          <p className="text-lg font-bold text-[#f47b20]">{finished ? "Zakończone" : "W trakcie"}</p>
          <p className="text-sm text-[#667085]">
            {finished ? "Zlecenie jest zamknięte." : "Dokończ kroki, aby zakończyć zadanie."}
          </p>
        </div>
      </div>
      {!finished && job.address ? (
        <p className={`mt-4 ${cardClass()} text-sm`}>
          <span className="block text-xs text-[#98a2b3]">Adres</span>
          <span className="font-semibold">{job.address}</span>
        </p>
      ) : null}
      <ol className="mt-6 space-y-0">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step.done ? "bg-[#f47b20] text-white" : "border-2 border-[#f0d3bc] text-[#f0d3bc]"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              {index < steps.length - 1 ? <span className="my-1 h-8 w-0.5 bg-[#f3d7c4]" /> : null}
            </div>
            <div className="pb-3">
              <p className="font-semibold">{step.title}</p>
              <p className="text-sm text-[#667085]">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {note ? <p className="mt-3 text-sm text-red-700">{note}</p> : null}
      {finished ? null : (
        <div className="mt-4 space-y-3">
          <OrangeButton onClick={() => onAct(job.id, "done")}>Zakończ zadanie</OrangeButton>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#f0d3bc] bg-white text-[15px] font-semibold"
          >
            Skontaktuj się z MOPS
          </button>
        </div>
      )}
    </>
  );
}

function Row({ icon, text }: { icon: "clock" | "pin" | "time"; text: string }) {
  const mark = icon === "pin" ? "⌖" : icon === "time" ? "◷" : "○";
  return (
    <p className="flex items-center gap-3">
      <span className="w-5 text-center text-[#f47b20]">{mark}</span>
      {text}
    </p>
  );
}

function IconBadge({ kind }: { kind: "pharmacy" | "shop" | "visit" }) {
  const label = kind === "pharmacy" ? "💊" : kind === "shop" ? "🛒" : "🚶";
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff1e6] text-xl">{label}</span>
  );
}

function Bell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function kindOf(summary: string): "pharmacy" | "shop" | "visit" {
  const text = summary.toLowerCase();
  if (text.includes("zakup")) return "shop";
  if (text.includes("lekar")) return "visit";
  return "pharmacy";
}

function titleOf(summary: string) {
  const kind = kindOf(summary);
  if (kind === "shop") return "Zakupy spożywcze";
  if (kind === "visit") return "Wizyta u lekarza";
  if (summary.toLowerCase().includes("aptek")) return "Odbiór leków z apteki";
  return summary;
}

function tagOf(summary: string) {
  const kind = kindOf(summary);
  if (kind === "shop") return "Zakupy";
  if (kind === "visit") return "Lekarz";
  return "Apteka";
}

function descriptionOf(summary: string) {
  const kind = kindOf(summary);
  if (kind === "shop") return "Zrób zakupy z listy i zanieś je do domu seniora.";
  if (kind === "visit") return "Odprowadź osobę do lekarza i wróć z nią do domu.";
  return "Odbierz przygotowane leki i dostarcz je seniorce.";
}

function whenLabel(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const today = new Date().toDateString() === date.toDateString();
  return today ? `Dzisiaj, ${time}` : date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

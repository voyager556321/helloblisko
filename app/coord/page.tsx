"use client";

import { useEffect, useState } from "react";
import { Debug, OrangeButton, Phone, StatusPill, cardClass } from "@/components/phone";
import { paceLabel } from "@/lib/pace";
import { usePoll } from "@/lib/use-poll";
import type { PublicRequest, Volunteer } from "@/lib/types";

type Payload = {
  senior: { name: string; district: string; address: string };
  volunteers: Volunteer[];
  requests: PublicRequest[];
  speech: boolean;
};

export default function CoordPage() {
  const { data, error, reload } = usePoll<Payload>("/api/coord/requests");
  const [openId, setOpenId] = useState<string | null>(null);
  const request = data?.requests.find((item) => item.id === openId) ?? null;

  return (
    <Phone>
      {request && data ? (
        <Card
          request={request}
          volunteers={data.volunteers}
          onBack={() => setOpenId(null)}
          onChange={reload}
        />
      ) : (
        <>
          <h1 className="text-[28px] leading-tight font-bold">Centrum</h1>
          <p className="mt-1 text-sm text-[#667085]">Prośby z domów Twojej filii</p>
          <p className="mt-3 text-xs text-[#98a2b3]">
            {data?.speech ? "Transkrypcja włączona." : "Bez klucza — odsłuchaj nagranie albo wpisz zdanie."}
          </p>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-5 space-y-3">
            {data?.requests.length === 0 ? <p className="text-sm text-[#667085]">Kolejka jest pusta.</p> : null}
            {data?.requests.map((item) => (
              <button key={item.id} type="button" onClick={() => setOpenId(item.id)} className={`block w-full text-left ${cardClass()}`}>
                <StatusPill status={item.status} />
                <p className="mt-3 font-semibold">{item.summary || "Prośba głosowa"}</p>
                <p className="mt-1 text-sm text-[#667085]">
                  {item.seniorName} · {item.district}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
      <Debug data={data} />
    </Phone>
  );
}

function Card({
  request,
  volunteers,
  onBack,
  onChange,
}: {
  request: PublicRequest;
  volunteers: Volunteer[];
  onBack: () => void;
  onChange: () => void;
}) {
  const [summary, setSummary] = useState(request.summary);
  const [code4, setCode4] = useState(request.code4 ?? "");
  const [note, setNote] = useState<string | null>(null);
  const closed = request.status === "done" || request.status === "cancelled";

  useEffect(() => {
    setSummary(request.summary);
    setCode4(request.code4 ?? "");
  }, [request.id, request.status]);

  async function save() {
    setNote(null);
    const res = await fetch(`/api/coord/requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, code4: code4 || null }),
    });
    const json = (await res.json()) as { error?: string };
    setNote(res.ok ? "Zapisane" : (json.error ?? "Nie zapisano"));
    onChange();
  }

  async function assign(volunteerId: string) {
    setNote(null);
    await fetch(`/api/coord/requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, code4: code4 || null }),
    });
    const res = await fetch(`/api/coord/requests/${request.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerId }),
    });
    const json = (await res.json()) as { error?: string };
    setNote(res.ok ? "Przypisane" : (json.error ?? "Nie przypisano"));
    onChange();
  }

  return (
    <>
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>‹</span>
        Szczegóły prośby
      </button>
      <StatusPill status={request.status} />
      <h1 className="mt-3 text-[26px] leading-tight font-bold">{request.seniorName}</h1>
      <p className="mt-1 text-sm text-[#667085]">{request.district}</p>
      <div className={`mt-5 ${cardClass()}`}>
        {request.hasAudio ? (
          <audio className="w-full" controls src={`/api/audio/${request.id}`} />
        ) : (
          <p className="text-sm text-[#667085]">To prośba wpisana tekstem, bez pliku.</p>
        )}
        <p className="mt-3 text-xs text-[#98a2b3]">Transkrypcja</p>
        <p className="text-sm">{request.transcript || "—"}</p>
      </div>
      <label className="mt-5 block text-sm font-semibold" htmlFor={`summary-${request.id}`}>
        Zdanie dla wolontariusza
      </label>
      <input
        id={`summary-${request.id}`}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-[#f0e6dc] bg-white px-3"
      />
      <label className="mt-4 block text-sm font-semibold" htmlFor={`code-${request.id}`}>
        Kod recepty
      </label>
      <input
        id={`code-${request.id}`}
        value={code4}
        onChange={(event) => setCode4(event.target.value)}
        inputMode="numeric"
        className="mt-2 h-12 w-full rounded-2xl border border-[#f0e6dc] bg-white px-3"
      />
      <div className="mt-4">
        <OrangeButton onClick={save}>Zapisz</OrangeButton>
      </div>
      {closed ? null : (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold">Jedna osoba z listy filii</p>
          <p className="text-xs text-[#98a2b3]">Czas od przyjęcia do zamknięcia. Wolontariusz tego nie widzi.</p>
          {volunteers.map((volunteer) => {
            const selected = request.volunteerId === volunteer.id;
            return (
              <button
                key={volunteer.id}
                type="button"
                onClick={() => assign(volunteer.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
                  selected ? "bg-[#1b2a4a] text-white" : "bg-white shadow-[0_8px_24px_rgba(27,42,74,0.06)]"
                }`}
              >
                <span>
                  <span className="block font-semibold">{volunteer.name}</span>
                  <span className={`block text-xs ${selected ? "text-white/70" : "text-[#667085]"}`}>
                    {volunteer.districts.join(", ")}
                  </span>
                  <span className={`mt-1 block text-xs ${selected ? "text-white/70" : "text-[#667085]"}`}>
                    {paceLabel(volunteer.pace, summary)}
                  </span>
                </span>
                <span className="text-[#f47b20]">›</span>
              </button>
            );
          })}
        </div>
      )}
      {note ? <p className="mt-3 text-sm text-[#667085]">{note}</p> : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { OrangeButton, Phone, cardClass } from "@/components/phone";
import { HOME_TOKEN } from "@/lib/types";

const entries = [
  { href: `/d/${HOME_TOKEN}`, title: "Dom seniora", text: "Jedno naciśnięcie i prośba głosowa." },
  { href: "/v", title: "Wolontariusz", text: "Zlecenia przypisane jednej osobie z listy." },
  { href: "/coord", title: "Koordynator MOPS", text: "Słucha nagrania i wybiera wolontariusza." },
];

export default function Home() {
  const [note, setNote] = useState<string | null>(null);

  async function reset() {
    setNote(null);
    const res = await fetch("/api/debug/reset", { method: "POST" });
    setNote(res.ok ? "Dane demo przywrócone." : "Nie udało się zresetować.");
  }

  return (
    <Phone>
      <p className="text-[28px] leading-tight font-bold">Profil zespołu</p>
      <p className="mt-1 text-sm text-[#667085]">Trzy role jednej filii. Wygląd pod telefon.</p>
      <div className="mt-6 space-y-3">
        {entries.map((entry) => (
          <Link key={entry.href} href={entry.href} className={`block ${cardClass()}`}>
            <p className="text-lg font-semibold">{entry.title}</p>
            <p className="mt-1 text-sm text-[#667085]">{entry.text}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <OrangeButton onClick={reset}>Resetuj dane demo</OrangeButton>
      </div>
      {note ? <p className="mt-3 text-sm text-[#667085]">{note}</p> : null}
    </Phone>
  );
}

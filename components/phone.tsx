"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOME_TOKEN, type Status } from "@/lib/types";

const links = [
  { href: `/d/${HOME_TOKEN}`, label: "Start", match: "/d/" },
  { href: "/v", label: "Zadania", match: "/v" },
  { href: "/coord", label: "Centrum", match: "/coord" },
  { href: "/", label: "Profil", match: "/" },
];

export function Phone({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#F4F7FB] text-[#0F1D33]">
      <div className="flex-1 px-5 pt-6 pb-4">{children}</div>
      <nav className="sticky bottom-0 grid grid-cols-4 border-t border-[#E3E8F0] bg-white pb-[env(safe-area-inset-bottom)]">
        {links.map((link) => {
          const on = link.match === "/" ? path === "/" : path.startsWith(link.match);
          return (
            <Link key={link.href} href={link.href} className="flex flex-col items-center gap-1 py-2.5">
              <NavIcon name={link.label} on={on} />
              <span className={`text-[11px] ${on ? "font-semibold text-[#0D3B7E]" : "text-[#4A5A75]"}`}>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavIcon({ name, on }: { name: string; on: boolean }) {
  const stroke = on ? "#0D3B7E" : "#4A5A75";
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: 1.8 };
  if (name === "Start") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "Zadania") {
    return (
      <svg {...common}>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (name === "Centrum") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="9" r="3" />
      <path d="M6 19c1.2-2.6 3.2-4 6-4s4.8 1.4 6 4" strokeLinecap="round" />
    </svg>
  );
}

export function Debug({ data }: { data: unknown }) {
  return (
    <details className="mt-8">
      <summary className="cursor-pointer text-xs text-[#4A5A75]">Dane techniczne</summary>
      <pre className="mt-2 max-h-48 overflow-auto text-[11px] leading-relaxed break-all whitespace-pre-wrap text-[#4A5A75]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

const label: Record<Status, string> = {
  ready: "Czeka na koordynatora",
  assigned: "Nowe zlecenie",
  revealed: "W trakcie",
  done: "Zakończone",
  cancelled: "Anulowane",
};

export function StatusPill({ status }: { status: Status }) {
  const hot = status === "revealed" || status === "assigned";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        hot ? "bg-[#FFF1E0] text-[#A65A00]" : "bg-[#EEF3FA] text-[#4A5A75]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${hot ? "bg-[#F7992B]" : "bg-[#7D8CA5]"}`} />
      {label[status]}
    </span>
  );
}

export function OrangeButton({
  children,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0D3B7E] text-[15px] font-semibold text-white"
    >
      {children}
    </button>
  );
}

export function NavyButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0D3B7E] text-[15px] font-semibold text-white"
    >
      {children}
    </button>
  );
}

export function cardClass() {
  return "rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(15,29,51,0.05),0_8px_24px_-14px_rgba(15,29,51,0.2)]";
}

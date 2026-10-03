import type { Pace, TaskKind } from "./types";

export function emptyPace(): Pace {
  return { pharmacy: [], shop: [], visit: [], other: [] };
}

export function kindOf(summary: string): TaskKind {
  const text = summary.toLowerCase();
  if (text.includes("zakup")) return "shop";
  if (text.includes("lekar")) return "visit";
  if (text.includes("aptek") || text.includes("lek")) return "pharmacy";
  return "other";
}

export function paceLabel(pace: Pace | undefined, summary: string): string {
  const kind = kindOf(summary);
  const minutes = pace?.[kind] ?? [];
  const name = kindName(kind);
  if (minutes.length === 0) return `Jeszcze nie było ${name}`;
  const typical = median(minutes);
  if (minutes.length === 1) return `${label(kind)}: ostatnio ${typical} min`;
  return `${label(kind)}: zwykle ok. ${typical} min, ${minutes.length} razy`;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function label(kind: TaskKind) {
  if (kind === "pharmacy") return "Apteka";
  if (kind === "shop") return "Zakupy";
  if (kind === "visit") return "Lekarz";
  return "Zlecenie";
}

function kindName(kind: TaskKind) {
  if (kind === "pharmacy") return "apteki";
  if (kind === "shop") return "zakupów";
  if (kind === "visit") return "wizyty u lekarza";
  return "takiego zlecenia";
}

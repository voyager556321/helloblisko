export function splitTranscript(text: string): { summary: string; code4: string | null } {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return { summary: "", code4: null };

  const tagged = trimmed.match(/(?:kod|код|code)\D{0,12}(\d{4})/i);
  const code4 = tagged?.[1] ?? trimmed.match(/\b(\d{4})\b/)?.[1] ?? null;
  const summary = trimmed
    .replace(/\b\d{11}\b/g, "")
    .replace(/\b(?:kod|код|code)\b/gi, "")
    .replace(/\b\d{4}\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();

  return { summary: summary || "Запит голосом", code4 };
}

export async function transcribeFile(absPath: string, mime: string, filename: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "";

  try {
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(absPath);
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
    form.append("model", "whisper-large-v3");
    form.append("language", "pl");
    form.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { text?: string };
    return json.text?.trim() ?? "";
  } catch {
    return "";
  }
}

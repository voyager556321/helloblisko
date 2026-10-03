import { spawn } from "node:child_process";

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

  return { summary: summary || "Nagranie głosowe", code4 };
}

export async function transcribeFile(absPath: string, mime: string, filename: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (key) {
    const remote = await transcribeWithGroq(absPath, mime, filename, key);
    if (remote) return remote;
  }
  return transcribeLocally(absPath);
}

async function transcribeWithGroq(absPath: string, mime: string, filename: string, key: string): Promise<string> {
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

async function transcribeLocally(absPath: string): Promise<string> {
  const { access, mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const root = path.join(process.cwd(), ".cache/whisper.cpp");
  const bin = path.join(root, "build/bin/whisper-cli");
  const model = path.join(root, "models/ggml-base.bin");
  try {
    await access(bin);
    await access(model);
  } catch {
    return "";
  }

  const dir = await mkdtemp(path.join(tmpdir(), "mops-voice-"));
  const wav = path.join(dir, "voice.wav");
  try {
    await run("ffmpeg", ["-y", "-i", absPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
    const text = await run(bin, ["-m", model, "-f", wav, "-l", "pl", "-nt", "-np", "-sns"]);
    return cleanTranscript(text);
  } catch (err) {
    console.error("local transcription failed", err);
    return "";
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function cleanTranscript(text: string) {
  const line = text
    .split("\n")
    .map((item) => item.replace(/\[[^\]]+\]/g, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return "";
  if (/napisy|subtitles|oglądanie|amara\.org|dziękuję za uwagę/i.test(line)) return "";
  return line;
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(Buffer.concat(err).toString() || `${command} exited ${code}`));
      else resolve(Buffer.concat(out).toString());
    });
  });
}

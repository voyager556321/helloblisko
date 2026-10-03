import { writeFile } from "node:fs/promises";
import {
  audioPath,
  createRequest,
  latestForHome,
  listRequests,
  newAudioName,
} from "@/lib/store";
import { splitTranscript, transcribeFile } from "@/lib/voice";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

async function assertToken(token: string) {
  const { db } = await listRequests();
  return token === db.deviceToken;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!(await assertToken(token))) {
    return Response.json({ error: "Невідомий пристрій" }, { status: 404 });
  }
  return Response.json({ latest: await latestForHome() });
}

export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!(await assertToken(token))) {
    return Response.json({ error: "Невідомий пристрій" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let transcript = "";
  let audioFile: string | null = null;
  let mime: string | null = null;

  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { transcript?: string };
    transcript = body.transcript?.trim() ?? "";
    if (!transcript) return Response.json({ error: "Порожня фраза" }, { status: 400 });
  } else {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json({ error: "Немає аудіо" }, { status: 400 });
    }
    mime = audio.type || "application/octet-stream";
    const ext = mime.includes("mp4") || mime.includes("m4a") ? ".mp4" : ".webm";
    audioFile = newAudioName(ext);
    const abs = audioPath(audioFile);
    await writeFile(abs, Buffer.from(await audio.arrayBuffer()));
    const spoken = String(form.get("transcript") ?? "").trim();
    transcript = spoken || (await transcribeFile(abs, mime, `voice${ext}`));
  }

  const split = splitTranscript(transcript);
  const request = await createRequest({
    transcript,
    summary: split.summary || (audioFile ? "Nagranie głosowe" : "Prośba"),
    code4: split.code4,
    audioFile,
    mime,
  });

  return Response.json({ request, transcribed: Boolean(transcript) });
}

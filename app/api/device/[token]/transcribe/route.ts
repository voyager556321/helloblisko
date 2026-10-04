import { randomBytes } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listRequests } from "@/lib/store";
import { transcribeFile } from "@/lib/voice";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { db } = await listRequests();
  if (token !== db.deviceToken) {
    return Response.json({ error: "Nieznane urządzenie" }, { status: 404 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size < 1) {
    return Response.json({ transcript: "" });
  }

  const mime = audio.type || "audio/webm";
  const ext = /mp4|m4a|aac/.test(mime) ? ".mp4" : ".webm";
  const path = join(tmpdir(), `hb_${randomBytes(4).toString("hex")}${ext}`);
  await writeFile(path, Buffer.from(await audio.arrayBuffer()));
  try {
    const transcript = await transcribeFile(path, mime, `voice${ext}`);
    return Response.json({ transcript });
  } finally {
    await unlink(path).catch(() => undefined);
  }
}

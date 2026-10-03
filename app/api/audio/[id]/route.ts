import { readFile } from "node:fs/promises";
import { audioFor } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^r_[a-f0-9]+$/.test(id)) return new Response("Ні", { status: 404 });
  const audio = await audioFor(id);
  if (!audio) return new Response("Немає файлу", { status: 404 });
  const bytes = await readFile(audio.filePath);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": audio.mime,
      "Cache-Control": "no-store",
    },
  });
}

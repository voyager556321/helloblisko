import { revealJob } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const volunteerId = req.headers.get("x-volunteer-id") ?? new URL(req.url).searchParams.get("as") ?? "";
  const result = await revealJob(id, volunteerId);
  if ("error" in result) return Response.json(result, { status: 403 });
  return Response.json(result);
}

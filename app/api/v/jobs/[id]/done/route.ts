import { doneJob } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const volunteerId = req.headers.get("x-volunteer-id") ?? new URL(req.url).searchParams.get("as") ?? "";
  const result = await doneJob(id, volunteerId);
  if ("error" in result) return Response.json(result, { status: 409 });
  return Response.json(result);
}

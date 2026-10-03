import { patchRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { summary?: string; code4?: string | null };
  const result = await patchRequest(id, body);
  if ("error" in result) return Response.json(result, { status: 404 });
  return Response.json(result);
}

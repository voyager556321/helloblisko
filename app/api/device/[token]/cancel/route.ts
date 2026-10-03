import { cancelLatest, listRequests } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { db } = await listRequests();
  if (token !== db.deviceToken) {
    return Response.json({ error: "Невідомий пристрій" }, { status: 404 });
  }
  const result = await cancelLatest();
  if ("error" in result) return Response.json(result, { status: 409 });
  return Response.json(result);
}

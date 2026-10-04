import { cancelLatest, cancelRequest, listRequests } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { db } = await listRequests();
  if (token !== db.deviceToken) {
    return Response.json({ error: "Невідомий пристрій" }, { status: 404 });
  }
  let id = "";
  try {
    const body = (await req.json()) as { id?: string };
    id = body.id ?? "";
  } catch {
    id = "";
  }
  const result = id ? await cancelRequest(id) : await cancelLatest();
  if ("error" in result) return Response.json(result, { status: 409 });
  return Response.json(result);
}

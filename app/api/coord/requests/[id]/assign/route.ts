import { assignRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { volunteerId?: string };
  try {
    body = (await req.json()) as { volunteerId?: string };
  } catch {
    return Response.json({ error: "Обери волонтера" }, { status: 400 });
  }
  if (!body.volunteerId) return Response.json({ error: "Обери волонтера" }, { status: 400 });
  const result = await assignRequest(id, body.volunteerId);
  if ("error" in result) return Response.json(result, { status: 409 });
  return Response.json(result);
}

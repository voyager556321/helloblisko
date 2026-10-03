import { jobsFor } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const volunteerId = req.headers.get("x-volunteer-id") ?? new URL(req.url).searchParams.get("as") ?? "";
  const data = await jobsFor(volunteerId);
  if (!data) return Response.json({ error: "Невідомий волонтер" }, { status: 404 });
  return Response.json(data);
}

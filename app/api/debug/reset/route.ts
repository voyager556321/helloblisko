import { resetDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await resetDb();
  return Response.json({ ok: true });
}

import { listRequests, toPublic } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { db, volunteers } = await listRequests();
  return Response.json({
    senior: { name: db.senior.name, district: db.senior.district, address: db.senior.address },
    volunteers,
    requests: db.requests.map((row) => toPublic(db, row, true)),
    speech: Boolean(process.env.GROQ_API_KEY),
  });
}

import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await sql("select 1");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "db error" },
      { status: 503 },
    );
  }
}

import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("configId");
    const limit = Number(searchParams.get("limit") || 200);
    if (Number.isNaN(limit) || limit <= 0) {
      return Response.json({ ok: false, error: "invalid limit" }, { status: 400 });
    }
    let rows: any[] = [];
    if (configId) {
      rows = await sql`
        select log_id as "logId", config_id as "configId", started_at as "startedAt",
               duration_ms as "durationMs", status, ok, error
        from logs
        where config_id = ${configId}
        order by started_at desc
        limit ${limit}
      `;
    } else {
      rows = await sql`
        select log_id as "logId", config_id as "configId", started_at as "startedAt",
               duration_ms as "durationMs", status, ok, error
        from logs
        order by started_at desc
        limit ${limit}
      `;
    }
    return Response.json({ ok: true, data: rows });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "get logs failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { configId, startedAt, durationMs, status, ok, error } = body || {};
    if (!configId || !startedAt || typeof durationMs !== "number" || typeof ok !== "boolean") {
      return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
    }
    await sql`
      insert into logs (config_id, started_at, duration_ms, status, ok, error)
      values (${configId}, to_timestamp(${startedAt}/1000.0), ${durationMs}, ${status}, ${ok}, ${error})
    `;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "insert log failed" }, { status: 500 });
  }
}



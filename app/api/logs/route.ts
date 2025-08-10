import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get("configId");
    const limit = parseInt(searchParams.get("limit") || "30");

    if (configId) {
      const rows = await sql`
        select config_id as "configId", started_at as "startedAt", duration_ms as "durationMs", status, ok, error
        from logs
        where config_id = ${configId}
        order by started_at desc
        limit ${limit}
      `;
      return NextResponse.json({ ok: true, data: rows });
    } else {
      const rows = await sql`
        select config_id as "configId", started_at as "startedAt", duration_ms as "durationMs", status, ok, error
        from logs
        order by started_at desc
        limit ${limit}
      `;
      return NextResponse.json({ ok: true, data: rows });
    }
  } catch (error: any) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId, startedAt, durationMs, status, ok, error } = body;

    if (!configId || !startedAt || durationMs === undefined) {
      return NextResponse.json({ ok: false, error: "필수 필드가 누락되었습니다" }, { status: 400 });
    }

    await sql`
      insert into logs (config_id, started_at, duration_ms, status, ok, error)
      values (${configId}, ${new Date(startedAt).toISOString()}, ${durationMs}, ${status}, ${!!ok}, ${error || null})
    `;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/logs error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}



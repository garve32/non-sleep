import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { monitorScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const rows = await sql`
        select id, name, url, method, interval_ms as "intervalMs", form_data as "formData", enabled
        from configs
        where id = ${id}
        limit 1
      `;
      return NextResponse.json({ ok: true, data: rows[0] || null });
    } else {
      const rows = await sql`
        select id, name, url, method, interval_ms as "intervalMs", form_data as "formData", enabled
        from configs
        order by created_at asc
      `;
      return NextResponse.json({ ok: true, data: rows });
    }
  } catch (error: any) {
    console.error("GET /api/configs error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, url, method, intervalMs, formData, enabled } = body;

    if (!name || !url || !method || !intervalMs) {
      return NextResponse.json({ ok: false, error: "필수 필드가 누락되었습니다" }, { status: 400 });
    }

    if (id) {
      // 기존 설정 업데이트
      await sql`
        update configs set 
          name = ${name}, 
          url = ${url}, 
          method = ${method}, 
          interval_ms = ${intervalMs}, 
          form_data = ${JSON.stringify(formData || {})}::jsonb, 
          enabled = ${!!enabled}, 
          updated_at = now()
        where id = ${id}
      `;

      // 스케줄러 업데이트
      const updatedConfig = { id, name, url, method, intervalMs, formData: formData || {}, enabled: !!enabled };
      monitorScheduler.scheduleMonitor(updatedConfig);

      return NextResponse.json({ ok: true, data: { id } });
    } else {
      // 새 설정 생성
      const newId = crypto.randomUUID();
      await sql`
        insert into configs (id, name, url, method, interval_ms, form_data, enabled)
        values (${newId}, ${name}, ${url}, ${method}, ${intervalMs}, ${JSON.stringify(formData || {})}::jsonb, ${!!enabled})
      `;

      // 스케줄러에 추가
      const newConfig = { id: newId, name, url, method, intervalMs, formData: formData || {}, enabled: !!enabled };
      monitorScheduler.scheduleMonitor(newConfig);

      return NextResponse.json({ ok: true, data: { id: newId } });
    }
  } catch (error: any) {
    console.error("POST /api/configs error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID가 필요합니다" }, { status: 400 });
    }

    // 스케줄러에서 제거
    monitorScheduler.stopMonitor(id);

    // 데이터베이스에서 삭제
    await sql`delete from logs where config_id = ${id}`;
    await sql`delete from configs where id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/configs error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}



import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id) {
      const rows = await sql`
        select id, name, url, method, interval_ms as "intervalMs", form_data as "formData", enabled
        from configs
        where id = ${id}
        limit 1
      `;
      return Response.json({ ok: true, data: rows[0] || null });
    } else {
      const rows = await sql`
        select id, name, url, method, interval_ms as "intervalMs", form_data as "formData", enabled
        from configs
        order by created_at asc
      `;
      return Response.json({ ok: true, data: rows });
    }
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "get failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, url, method, intervalMs, formData, enabled } = body || {};
    if (!id || !name || !url || !method || !intervalMs) {
      return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
    }
    await sql`
      insert into configs (id, name, url, method, interval_ms, form_data, enabled)
      values (${id}, ${name}, ${url}, ${method}, ${intervalMs}, ${JSON.stringify(formData||{})}::jsonb, ${!!enabled})
      on conflict (id) do update set
        name = excluded.name,
        url = excluded.url,
        method = excluded.method,
        interval_ms = excluded.interval_ms,
        form_data = excluded.form_data,
        enabled = excluded.enabled,
        updated_at = now()
    `;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "upsert failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ ok: false, error: "id required" }, { status: 400 });
    // delete logs first, then config
    await sql`delete from logs where config_id = ${id}`;
    await sql`delete from configs where id = ${id}`;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "delete failed" }, { status: 500 });
  }
}



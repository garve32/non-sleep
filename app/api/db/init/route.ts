import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, hint: "POST to initialize tables" });
}

export async function POST() {
  try {
    await sql`
      create table if not exists configs (
        id text primary key,
        name text not null,
        url text not null,
        method text not null check (method in ('GET','POST')),
        interval_ms integer not null,
        form_data jsonb not null default '{}',
        enabled boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `;
    await sql`
      create table if not exists logs (
        log_id bigserial primary key,
        config_id text not null,
        started_at timestamptz not null,
        duration_ms integer not null,
        status integer,
        ok boolean not null,
        error text,
        created_at timestamptz not null default now()
      );
    `;
    // index for analytics
    await sql`create index if not exists logs_config_id_idx on logs(config_id);`;
    await sql`create index if not exists logs_started_at_idx on logs(started_at desc);`;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "init failed" }, { status: 500 });
  }
}



export const dynamic = "force-dynamic";

type PingRequest = {
  url: string;
  method: "POST" | "GET";
  formData?: Record<string, string>;
  configId?: string;
};

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const body: PingRequest = await req.json();
    if (!body?.url || !body?.method) {
      return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    let targetUrl = body.url;
    let fetchInit: RequestInit = { method: body.method, headers: {} };

    if (body.method === "POST") {
      const form = new URLSearchParams();
      Object.entries(body.formData || {}).forEach(([k, v]) => form.append(k, v));
      (fetchInit.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
      fetchInit.body = form.toString();
    } else if (body.method === "GET") {
      const qs = new URLSearchParams();
      Object.entries(body.formData || {}).forEach(([k, v]) => qs.append(k, v));
      if ([...qs.keys()].length > 0) {
        const sep = targetUrl.includes("?") ? "&" : "?";
        targetUrl += sep + qs.toString();
      }
    }

    const res = await fetch(targetUrl, fetchInit);
    const durationMs = Date.now() - startedAt;

    // fire-and-forget logging to DB if configId provided
    if (body.configId) {
      fetch(`${new URL(req.url).origin}/api/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: body.configId, startedAt, durationMs, status: res.status, ok: res.ok })
      }).catch(() => {});
    }

    return Response.json({ ok: res.ok, status: res.status, durationMs });
  } catch (e: any) {
    const durationMs = Date.now() - startedAt;
    return Response.json({ ok: false, status: null, durationMs, error: e?.message || "error" }, { status: 500 });
  }
}



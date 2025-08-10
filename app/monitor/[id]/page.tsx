"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RequestConfig, RunLog } from "@/lib/types";
import { Badge, Btn, Card, Input, Label, SectionTitle, Select, Sparkline } from "@/app/components/UI";

export default function MonitorDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const [savedConfig, setSavedConfig] = useState<RequestConfig | null>(null);
  const [draft, setDraft] = useState<RequestConfig | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/configs?id=${id}`, { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && data?.data) {
          setSavedConfig(data.data as RequestConfig);
          setDraft(data.data as RequestConfig);
        } else {
          setError(data?.error || "설정을 불러오지 못했습니다");
        }
      } catch (e: any) {
        setError(e?.message || "설정을 불러오지 못했습니다");
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/logs?configId=${id}&limit=30`, { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.data)) setLogs(data.data.map((d: any) => ({ ...d, startedAt: new Date(d.startedAt).getTime() })));
      } catch (e) {
        // ignore
      }
    })();
  }, [id]);

  const hasChanges = useMemo(() => {
    if (!savedConfig || !draft) return false;
    return JSON.stringify(savedConfig) !== JSON.stringify(draft);
  }, [savedConfig, draft]);

  const applySave = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "저장 실패");
      setSavedConfig(draft);
      setMessage("저장되었습니다");
    } catch (e: any) {
      setError(e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const revertChanges = () => {
    setDraft(savedConfig);
    setMessage(null);
    setError(null);
  };

  const deleteTask = async () => {
    if (!draft) return;
    if (!confirm("정말 삭제하시겠습니까? (관련 로그도 모두 삭제)")) return;
    try {
      const res = await fetch(`/api/configs?id=${draft.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "삭제 실패");
      location.href = "/";
    } catch (e: any) {
      setError(e?.message || "삭제 실패");
    }
  };

  const runOnce = async () => {
    if (!draft) return;
    const startedAt = Date.now();
    try {
      const response = await fetch("/api/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: draft.url, method: draft.method, formData: draft.formData, configId: draft.id })
      });
      const data = await response.json();
      const durationMs = typeof data?.durationMs === "number" ? data.durationMs : Date.now() - startedAt;
      setLogs((prev) => [{ configId: draft.id, startedAt, durationMs, status: data?.status ?? response.status, ok: !!data?.ok }, ...prev].slice(0, 400));
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;
      setLogs((prev) => [{ configId: draft!.id, startedAt, durationMs, status: null, ok: false, error: e?.message || "error" }, ...prev].slice(0, 400));
    }
  };

  useEffect(() => {
    if (!savedConfig) return;
    if (savedConfig.enabled) {
      runOnce();
      timers.current = window.setInterval(() => runOnce(), Math.max(10_000, savedConfig.intervalMs));
    }
    return () => {
      if (timers.current) window.clearInterval(timers.current);
      timers.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedConfig?.enabled, savedConfig?.intervalMs, savedConfig?.url]);

  const formatMs = (ms: number) => `${ms} ms`;

  const stats = useMemo(() => {
    if (logs.length === 0) return { avg: 0, min: 0, max: 0, uptime: 0 };
    const durations = logs.map((l) => l.durationMs);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const uptime = Math.round((logs.filter((l) => l.ok).length / logs.length) * 1000) / 10;
    return { avg, min, max, uptime };
  }, [logs]);

  if (!draft) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: 16, color: "#e6e8eb", background: "#0b0d10", minHeight: "100vh" }}>
      <a href="/" style={{ color: "#9aa4b2", textDecoration: "none" }}>← Monitors</a>
      <h2 style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700 }}>{draft.name} <Badge>HTTP</Badge></h2>
      <div className="detail-grid">
        <Card>
          <SectionTitle>설정</SectionTitle>
          {message && <div style={{ color: "#16a34a", marginBottom: 8 }}>{message}</div>}
          {error && <div style={{ color: "#ef4444", marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <Label>이름</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Label>URL</Label>
            <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
            <Label>메서드</Label>
            <Select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as any })}>
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </Select>
            <Label>주기(ms)</Label>
            <Input type="number" min={10000} value={draft.intervalMs} onChange={(e) => setDraft({ ...draft, intervalMs: Number(e.target.value) })} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong>Form Data</strong>
              <Btn small onClick={() => {
                const key = prompt("파라미터 키?")?.trim();
                if (!key) return;
                setDraft({ ...draft, formData: { ...draft.formData, [key]: "" } });
              }}>+ 필드</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {Object.entries(draft.formData).map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                  <Input
                    value={k}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      const { [k]: oldValue, ...rest } = draft.formData;
                      setDraft({ ...draft, formData: { ...rest, [newKey]: oldValue } });
                    }}
                  />
                  <Input
                    value={v}
                    onChange={(e) => setDraft({ ...draft, formData: { ...draft.formData, [k]: e.target.value } })}
                    type={k.toLowerCase().includes("password") ? "password" : "text"}
                  />
                  <Btn small variant="danger" onClick={() => { const { [k]: _omit, ...rest } = draft.formData; setDraft({ ...draft, formData: rest }); }}>삭제</Btn>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={!!draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
              자동 실행(ON)
            </label>
            <Btn onClick={() => runOnce()}>▶ 실행</Btn>
            <div style={{ flex: 1 }} />
            <Btn disabled={!hasChanges || saving} onClick={applySave}>저장</Btn>
            <Btn disabled={!hasChanges || saving} onClick={revertChanges} variant="ghost">되돌리기</Btn>
            <Btn style={{ marginLeft: 8 }} variant="danger" onClick={deleteTask} className="btn-fixed">삭제</Btn>
          </div>
        </Card>
        <Card>
          <SectionTitle>모니터링</SectionTitle>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, color: "#9aa4b2", fontSize: 12 }}>
            <div>평균 {formatMs(stats.avg)}</div>
            <div>최소 {formatMs(stats.min)}</div>
            <div>최대 {formatMs(stats.max)}</div>
            <div>가용성 {stats.uptime.toFixed(1)}%</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Sparkline points={logs.map((l) => l.durationMs).slice(0, 30).reverse()} height={60} />
          </div>
          <div className="hide-scroll" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto", overflowX: "hidden" }}>
            {logs.slice(0, 30).map((l, idx) => (
              <div key={l.startedAt + ":" + idx} style={{ border: "1px solid #2b3340", padding: 8, borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.0fr 1.0fr 0.8fr 1fr", gap: 6 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{new Date(l.startedAt).toLocaleString()}</div>
                  <div>{formatMs(l.durationMs)}</div>
                  <div>{l.ok ? `OK(${l.status})` : `FAIL(${l.status ?? "-"})`}</div>
                  <div style={{ color: "#9aa4b2" }}>{l.error || ""}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}



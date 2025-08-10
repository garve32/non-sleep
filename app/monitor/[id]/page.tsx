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
      // 주기 실행만 설정. 진입 시 즉시 실행하지 않음.
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
    if (logs.length === 0) return { avg: 0, min: 0, max: 0 };
    const durations = logs.map((l) => l.durationMs);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    return { avg, min, max };
  }, [logs]);

  if (!draft) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: 16, color: "#e6e8eb", background: "#0b0d10", minHeight: "100vh", overflowX: "hidden" }}>
      <a href="/" style={{ color: "#9aa4b2", textDecoration: "none" }}>← Monitors</a>
      <h2 style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700 }}>{draft.name} <Badge>HTTP</Badge></h2>
      <div className="detail-grid">
        <Card className="card-narrow">
          <SectionTitle>설정</SectionTitle>
          {message && <div style={{ color: "#16a34a", marginBottom: 8 }}>{message}</div>}
          {error && <div style={{ color: "#ef4444", marginBottom: 8 }}>{error}</div>}
          <div className="form-grid">
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
            <div className="form-data-grid">
              {Object.entries(draft.formData).map(([k, v]) => (
                <div key={k} className="form-data-row">
                  <Input
                    value={k}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      const { [k]: oldValue, ...rest } = draft.formData;
                      setDraft({ ...draft, formData: { ...rest, [newKey]: oldValue } });
                    }}
                    placeholder="키"
                  />
                  <Input
                    value={v}
                    onChange={(e) => setDraft({ ...draft, formData: { ...draft.formData, [k]: e.target.value } })}
                    type={k.toLowerCase().includes("password") ? "password" : "text"}
                    placeholder="값"
                  />
                  <Btn small variant="danger" onClick={() => { const { [k]: _omit, ...rest } = draft.formData; setDraft({ ...draft, formData: rest }); }}>삭제</Btn>
                </div>
              ))}
            </div>
          </div>
          <div className="action-buttons">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={!!draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
              자동 실행(ON)
            </label>
            <div className="button-group">
              <Btn onClick={() => runOnce()}>▶ 실행</Btn>
              <Btn disabled={!hasChanges || saving} onClick={applySave}>저장</Btn>
              <Btn variant="danger" onClick={deleteTask}>삭제</Btn>
            </div>
          </div>
        </Card>
        <Card className="card-narrow">
          <SectionTitle>모니터링</SectionTitle>
          <div className="stats-grid">
            <div>평균 {formatMs(stats.avg)}</div>
            <div>최소 {formatMs(stats.min)}</div>
            <div>최대 {formatMs(stats.max)}</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Sparkline points={logs.map((l) => l.durationMs).slice(0, 30).reverse()} height={60} />
          </div>
          <div className="hide-scroll" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto", overflowX: "hidden" }}>
            {logs.slice(0, 30).map((l, idx) => (
              <div key={l.startedAt + ":" + idx} style={{ border: "1px solid #2b3340", padding: 8, borderRadius: 6, fontSize: 12 }}>
                <div className="log-row">
                  <div className="log-time">{new Date(l.startedAt).toLocaleString()}</div>
                  <div className="log-duration">{formatMs(l.durationMs)}</div>
                  <div>
                    <Badge tone={l.ok ? "success" : "danger"}>{l.ok ? `OK(${l.status})` : `FAIL(${l.status ?? "-"})`}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}



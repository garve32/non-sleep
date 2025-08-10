"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RequestConfig, RunLog } from "@/lib/types";
import Modal from "./components/Modal";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Page() {
  const [configs, setConfigs] = useState<RequestConfig[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<RequestConfig | null>(null);

  // load initial configs from server
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/configs", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.data)) {
        // bootstrap with default if empty
        if (data.data.length === 0) {
          const def: RequestConfig = {
            id: generateId(),
            name: "Login Ping",
            url: "https://quiz-d0xy.onrender.com/users/login",
            method: "POST",
            intervalMs: 10 * 60 * 1000,
            formData: { login_id: "garve32", password: "init123!!" },
            enabled: false
          };
          await fetch("/api/configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def)
          });
          setConfigs([def]);
        } else {
          setConfigs(data.data as RequestConfig[]);
        }
      }
    })();
  }, []);

  // load initial logs from server
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/logs?limit=30", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.data)) {
        setLogs(data.data.map((d: any) => ({ ...d, startedAt: new Date(d.startedAt).getTime() })));
      }
    })();
  }, []);



  const timers = useRef<Map<string, number>>(new Map());

  const runOnce = async (config: RequestConfig) => {
    const startedAt = Date.now();
    try {
      const response = await fetch("/api/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: config.url, method: config.method, formData: config.formData, configId: config.id })
      });
      const data = await response.json();
      const durationMs = typeof data?.durationMs === "number" ? data.durationMs : Date.now() - startedAt;
      setLogs((prev) => [{ configId: config.id, startedAt, durationMs, status: data?.status ?? response.status, ok: !!data?.ok }, ...prev].slice(0, 400));
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;
      setLogs((prev) => [
        { configId: config.id, startedAt, durationMs, status: null, ok: false, error: e?.message || "error" },
        ...prev
      ].slice(0, 400));
    }
  };

  const startTimer = (config: RequestConfig) => {
    if (timers.current.has(config.id)) return;
    // 주기적 실행만 설정. 즉시 실행하지 않음.
    const handle = window.setInterval(() => runOnce(config), Math.max(10_000, config.intervalMs));
    timers.current.set(config.id, handle);
  };

  const stopTimer = (configId: string) => {
    const handle = timers.current.get(configId);
    if (handle) window.clearInterval(handle);
    timers.current.delete(configId);
  };

  useEffect(() => {
    configs.forEach((c) => {
      if (c.enabled) startTimer(c); else stopTimer(c.id);
    });
    return () => {
      timers.current.forEach((h) => window.clearInterval(h));
      timers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs.map((c) => `${c.id}:${c.enabled}:${c.intervalMs}:${c.url}`).join("|")]);

  const addConfig = async () => {
    const newConf: RequestConfig = {
      id: generateId(),
      name: "New Task",
      url: "https://example.com",
      method: "POST",
      intervalMs: 10 * 60 * 1000,
      formData: {},
      enabled: false
    };
    setDraft(newConf);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!draft) return;
    await fetch("/api/configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    setConfigs((prev) => [...prev, draft]);
    setCreateOpen(false);
    setDraft(null);
  };

  const removeConfig = async (id: string) => {
    stopTimer(id);
    await fetch(`/api/configs?id=${id}`, { method: "DELETE" });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const updateConfig = async (id: string, patch: Partial<RequestConfig>) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const conf = configs.find((c) => c.id === id);
    if (!conf) return;
    const next = { ...conf, ...patch } as RequestConfig;
    await fetch("/api/configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  };

  const updateFormItem = async (id: string, key: string, value: string) => {
    const target = configs.find((c) => c.id === id);
    if (!target) return;
    const next = { ...target, formData: { ...target.formData, [key]: value } } as RequestConfig;
    setConfigs((prev) => prev.map((c) => (c.id === id ? next : c)));
    await fetch("/api/configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  };

  const removeFormItem = async (id: string, key: string) => {
    const target = configs.find((c) => c.id === id);
    if (!target) return;
    const { [key]: _omit, ...rest } = target.formData;
    const next = { ...target, formData: rest } as RequestConfig;
    setConfigs((prev) => prev.map((c) => (c.id === id ? next : c)));
    await fetch("/api/configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  };

  const addFormItem = (id: string) => {
    const key = prompt("파라미터 키?")?.trim();
    if (!key) return;
    updateFormItem(id, key, "");
  };

  const formatMs = (ms: number) => `${ms} ms`;

  const logsByConfig = useMemo(() => {
    const map = new Map<string, RunLog[]>();
    for (const l of logs) {
      const key = l.configId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [logs]);

  const calcUptime = (list: RunLog[]) => {
    if (!list || list.length === 0) return { pct: 0, lastOk: undefined } as { pct: number; lastOk?: number };
    const okCount = list.filter((l) => l.ok).length;
    const pct = Math.round((okCount / list.length) * 1000) / 10; // one decimal
    const lastOk = list.find((l) => l.ok)?.startedAt;
    return { pct, lastOk };
  };

  const timeAgo = (ts?: number) => {
    if (!ts) return "-";
    const diff = Date.now() - ts;
    const min = Math.round(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min} min`;
    const hr = Math.round(min / 60);
    return `${hr} hr`;
  };

  return (
    <>
    <div className="container" style={{ display: "block" }}>
      <header className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg className="brand-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="#22c55e" strokeWidth="2" />
            <path d="M12 7v5l3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontWeight: 700 }}>Non Sleep</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={addConfig} style={{ background: "#111827", border: "1px solid #1f2937", color: "#e6e8eb", padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}>+ New monitor</button>
        </div>
      </header>
      <main style={{ padding: 16 }}>
        <h2 style={{ margin: "8px 0 12px", fontSize: 16, color: "#9aa4b2", fontWeight: 600 }}>Monitors</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {configs.map((c) => {
            const list = logsByConfig.get(c.id) || [];
            const { pct, lastOk } = calcUptime(list.slice(0, 48));
            const last = list[0];
            const isUp = last ? last.ok : false;
            return (
              <div key={c.id} className="monitor-card" style={{ border: "1px solid #222", background: "#0e1013", color: "#e6e8eb", padding: 12, borderRadius: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* 1행: 상태점 + 이름 */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: isUp ? "#22c55e" : "#ef4444" }} />
                    <a href={`/monitor/${c.id}`} style={{ color: "#e6e8eb", textDecoration: "none", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</a>
                  </div>
                  {/* 2행: URL + 메서드 (모바일 전용) */}
                  <div className="only-mobile" style={{ gap: 6, alignItems: "center", color: "#9aa4b2", fontSize: 12 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.url}</span>
                    <span className="badge" style={{ fontSize: 12, padding: "2px 6px", borderRadius: 999, background: "#111827", border: "1px solid #1f2937", marginLeft: 4 }}>HTTP, {c.method}</span>
                  </div>
                  {/* 데스크톱에서는 기존 한 줄(제목 옆 URL/HTTP) 유지 */}
                  <div className="only-desktop" style={{ gap: 8, alignItems: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ fontSize: 12, color: "#9aa4b2", overflow: "hidden", textOverflow: "ellipsis" }}>{c.url}</span>
                    <span style={{ fontSize: 12, padding: "2px 6px", borderRadius: 999, background: "#111827", border: "1px solid #1f2937" }}>HTTP</span>
                  </div>
                  {/* 3행: 상태 텍스트 (중복 제거, 항상 표시) */}
                  <div style={{ fontSize: 12, color: "#9aa4b2" }}>
                    Up {timeAgo(lastOk)} · Last check {timeAgo(last?.startedAt)} · every {Math.round(c.intervalMs / 60000)} min
                  </div>
                  {/* 4행: 프로그레스바 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                    <div className="mini-bars" style={{ gridTemplateColumns: `repeat(${Math.min(list.length, 40)}, 1fr)` }}>
                      {list.slice(0, 40).reverse().map((l, i) => (
                        <div key={i} style={{ background: l.ok ? "#22c55e" : "#ef4444" }} />
                      ))}
                    </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, textAlign: "right", fontSize: 12 }}>{pct.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
                {/* actions moved into progress row */}
              </div>
            );
          })}
        </div>
      </main>
    </div>
    <Modal open={createOpen} title="새 모니터" onClose={() => { setCreateOpen(false); setDraft(null); }}>
      {draft && (
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
          <label>이름</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <label>URL</label>
          <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <label>메서드</label>
          <select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as any })}>
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
          <label>주기(ms)</label>
          <input type="number" min={10000} value={draft.intervalMs} onChange={(e) => setDraft({ ...draft, intervalMs: Number(e.target.value) })} />
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => { setCreateOpen(false); setDraft(null); }}>취소</button>
            <button onClick={submitCreate}>생성</button>
          </div>
        </div>
      )}
    </Modal>
  </>
  );
}



export type HttpMethod = "GET" | "POST";

export type RequestConfig = {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  intervalMs: number;
  formData: Record<string, string>;
  enabled: boolean;
};

export type RunLog = {
  logId?: number;
  configId: string;
  startedAt: number;
  durationMs: number;
  status: number | null;
  ok: boolean;
  error?: string;
};



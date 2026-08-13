type LogEntry = Readonly<{
  requestId: string;
  matchId?: string;
  action?: string;
  elapsedMs?: number;
  status: "ok" | "error";
}>;

const ALLOWED_KEYS = new Set(["requestId", "matchId", "action", "elapsedMs", "status"]);

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (ALLOWED_KEYS.has(key)) result[key] = redact(val);
      else result[key] = "[redacted]";
    }
    return result;
  }
  return "[redacted]";
}

export function safeLog(entry: LogEntry): void {
  if (process.env.NODE_ENV === "production") return;
  const timestamp = new Date().toISOString();
  const redactedEntry = redact(entry);
  console.log(JSON.stringify({ timestamp, ...(redactedEntry as Record<string, unknown>) }));
}

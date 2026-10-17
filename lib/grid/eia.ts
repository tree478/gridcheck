import {
  EIA_PAGE_SIZE,
  EIA_TIMEOUT_MS,
  FETCH_HISTORY_DAYS,
  TIMEZONE,
} from "../constants";

// EIA API v2 client for ISO New England hourly generation by fuel.
// Server only: reads process.env.EIA_API_KEY. Never import from client code.

const EIA_URL = "https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/";
const RESPONDENT = "ISNE";
const DAY_MS = 24 * 60 * 60 * 1000;

export type EiaFuelRow = {
  hourStart: string; // ISO 8601 with America/New_York offset
  fuelCode: string; // raw EIA code (e.g. "NG", "BAT", "SNB"); mapped in intensity.ts
  mwh: number;
};

export type EiaErrorKind =
  | "missing_key"
  | "auth"
  | "http"
  | "network"
  | "timeout"
  | "bad_response";

// Messages never contain the API key or the request URL.
export class EiaError extends Error {
  readonly kind: EiaErrorKind;
  readonly status?: number;

  constructor(kind: EiaErrorKind, message: string, status?: number) {
    super(message);
    this.name = "EiaError";
    this.kind = kind;
    this.status = status;
  }
}

type RawRow = {
  period?: unknown;
  fueltype?: unknown;
  value?: unknown;
};

type Page = { total: number; rows: RawRow[] };

// "2026-10-16T18" (UTC) → "2026-10-16T14:00:00-04:00". DST-safe via Intl.
const nyFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "longOffset",
});

const PERIOD_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/;

export function eiaPeriodToNewYorkIso(period: string): string | null {
  const m = PERIOD_RE.exec(period);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4]);
  if (Number.isNaN(ms)) return null;
  const parts: Record<string, string> = {};
  for (const p of nyFormat.formatToParts(new Date(ms))) parts[p.type] = p.value;
  // longOffset is "GMT-04:00", or just "GMT" for a zero offset.
  const offset = parts.timeZoneName.replace("GMT", "") || "+00:00";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00${offset}`;
}

function toEiaPeriod(ms: number): string {
  return new Date(ms).toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

// New York ISO string for the UTC hour starting at ms.
// toEiaPeriod always yields a valid period, so the result is never null.
export function toNewYorkIso(ms: number): string {
  return eiaPeriodToNewYorkIso(toEiaPeriod(ms)) as string;
}

// Whole UTC days, so every call on the same UTC day sends an identical query
// and hits EIA's cache (uncached queries take 60–80 s).
export function fetchWindow(now: Date): { start: string; end: string } {
  const endMs = (Math.floor(now.getTime() / DAY_MS) + 1) * DAY_MS;
  const startMs = endMs - FETCH_HISTORY_DAYS * DAY_MS;
  return { start: toEiaPeriod(startMs), end: toEiaPeriod(endMs) };
}

function buildUrl(
  key: string,
  window: { start: string; end: string },
  offset: number,
): string {
  const params = new URLSearchParams({
    frequency: "hourly",
    "data[0]": "value",
    "facets[respondent][]": RESPONDENT,
    start: window.start,
    end: window.end,
    "sort[0][column]": "period",
    "sort[0][direction]": "asc",
    offset: String(offset),
    length: String(EIA_PAGE_SIZE),
    api_key: key,
  });
  return `${EIA_URL}?${params.toString()}`;
}

async function fetchPage(url: string, signal: AbortSignal): Promise<Page> {
  let res: Response;
  try {
    res = await fetch(url, { signal, cache: "no-store" });
  } catch (err) {
    if (signal.aborted) throw new EiaError("timeout", "EIA request timed out");
    throw new EiaError(
      "network",
      `EIA request failed: ${err instanceof Error ? err.name : "unknown error"}`,
    );
  }

  let body: string;
  try {
    body = await res.text();
  } catch {
    if (signal.aborted) throw new EiaError("timeout", "EIA request timed out");
    throw new EiaError("network", "EIA response body could not be read");
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const code = errorCode(json);
    const detail = code ? ` (${code})` : "";
    if (res.status === 401 || res.status === 403) {
      throw new EiaError("auth", `EIA rejected the API key${detail}`, res.status);
    }
    throw new EiaError("http", `EIA returned HTTP ${res.status}${detail}`, res.status);
  }

  const response = (json as { response?: { total?: unknown; data?: unknown } })
    ?.response;
  const total = Number(response?.total);
  if (!response || !Array.isArray(response.data) || !Number.isFinite(total)) {
    throw new EiaError("bad_response", "EIA response is missing response.data or total");
  }
  return { total, rows: response.data as RawRow[] };
}

// EIA error bodies look like { error: { code: "API_KEY_INVALID", ... } }.
function errorCode(json: unknown): string | undefined {
  const err = (json as { error?: unknown })?.error;
  const code =
    err && typeof err === "object" ? (err as { code?: unknown }).code : undefined;
  return typeof code === "string" && /^[A-Z_]{1,40}$/.test(code) ? code : undefined;
}

// Null, empty, or non-numeric values and unparseable periods are skipped,
// never set to 0. Negative values pass through (intensity.ts handles them).
// EIA sorts by period only, so a row can repeat across a page boundary;
// the first copy of each hour + fuel is kept.
export function parseRows(rows: RawRow[]): EiaFuelRow[] {
  const out: EiaFuelRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (typeof row.period !== "string" || typeof row.fueltype !== "string") continue;
    if (row.value === null || row.value === undefined) continue;
    if (typeof row.value === "string" && row.value.trim() === "") continue;
    const mwh = Number(row.value);
    if (!Number.isFinite(mwh)) continue;
    const hourStart = eiaPeriodToNewYorkIso(row.period);
    if (!hourStart) continue;
    const id = `${hourStart}|${row.fueltype}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ hourStart, fuelCode: row.fueltype, mwh });
  }
  return out;
}

// Last FETCH_HISTORY_DAYS of hourly ISNE generation by fuel, oldest first.
// One deadline (timeoutMs) covers every page.
export async function fetchFuelMix(
  options: { now?: Date; timeoutMs?: number } = {},
): Promise<EiaFuelRow[]> {
  const key = process.env.EIA_API_KEY;
  if (!key) throw new EiaError("missing_key", "EIA_API_KEY is not set");

  const window = fetchWindow(options.now ?? new Date());
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? EIA_TIMEOUT_MS,
  );

  try {
    const first = await fetchPage(buildUrl(key, window, 0), controller.signal);
    const offsets: number[] = [];
    for (let o = EIA_PAGE_SIZE; o < first.total; o += EIA_PAGE_SIZE) offsets.push(o);
    const rest = await Promise.all(
      offsets.map((o) => fetchPage(buildUrl(key, window, o), controller.signal)),
    );
    return parseRows([first, ...rest].flatMap((p) => p.rows));
  } catch (err) {
    // If one page fails, cancel the others still in flight.
    controller.abort();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

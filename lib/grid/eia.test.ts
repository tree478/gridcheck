import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EIA_PAGE_SIZE, EIA_TIMEOUT_MS } from "../constants";
import sample from "./__fixtures__/eia-sample.json";
import {
  EiaError,
  eiaPeriodToNewYorkIso,
  fetchFuelMix,
  fetchWindow,
  parseRows,
} from "./eia";

const KEY = "test-key-SECRET123";
const NOW = new Date("2026-10-17T18:32:00Z");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function page(total: number, data: unknown[]) {
  return { response: { total: String(total), data } };
}

function row(period: string, fueltype: string, value: unknown) {
  return { period, respondent: "ISNE", fueltype, value, "value-units": "megawatthours" };
}

const fetchMock = vi.fn<typeof fetch>();

function calledUrl(i: number): URL {
  return new URL(String(fetchMock.mock.calls[i][0]));
}

async function caught(p: Promise<unknown>): Promise<EiaError> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(EiaError);
    return err as EiaError;
  }
  throw new Error("expected promise to reject");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("EIA_API_KEY", KEY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("eiaPeriodToNewYorkIso", () => {
  it("converts a UTC period to New York time (EDT)", () => {
    expect(eiaPeriodToNewYorkIso("2026-10-16T18")).toBe("2026-10-16T14:00:00-04:00");
  });

  it("converts EST in winter and crosses the date line", () => {
    expect(eiaPeriodToNewYorkIso("2026-01-15T03")).toBe("2026-01-14T22:00:00-05:00");
  });

  it("handles the 2026 spring-forward switch (Mar 8)", () => {
    expect(eiaPeriodToNewYorkIso("2026-03-08T06")).toBe("2026-03-08T01:00:00-05:00");
    // 2 AM local does not exist; the next UTC hour is 3 AM EDT.
    expect(eiaPeriodToNewYorkIso("2026-03-08T07")).toBe("2026-03-08T03:00:00-04:00");
  });

  it("handles the 2026 fall-back switch (Nov 1), keeping both 1 AM hours distinct", () => {
    expect(eiaPeriodToNewYorkIso("2026-11-01T05")).toBe("2026-11-01T01:00:00-04:00");
    expect(eiaPeriodToNewYorkIso("2026-11-01T06")).toBe("2026-11-01T01:00:00-05:00");
    expect(eiaPeriodToNewYorkIso("2026-11-01T07")).toBe("2026-11-01T02:00:00-05:00");
  });

  it("rejects malformed periods", () => {
    expect(eiaPeriodToNewYorkIso("2026-10-16")).toBeNull();
    expect(eiaPeriodToNewYorkIso("2026-10-16T18:00")).toBeNull();
    expect(eiaPeriodToNewYorkIso("")).toBeNull();
  });
});

describe("fetchWindow", () => {
  it("covers FETCH_HISTORY_DAYS ending at the next 00:00 UTC", () => {
    expect(fetchWindow(NOW)).toEqual({ start: "2026-09-20T00", end: "2026-10-18T00" });
  });

  it("is identical for every call on the same UTC day, so EIA's cache is hit", () => {
    const early = fetchWindow(new Date("2026-10-17T00:00:00Z"));
    const late = fetchWindow(new Date("2026-10-17T23:59:59Z"));
    expect(early).toEqual(late);
    expect(fetchWindow(new Date("2026-10-18T00:00:00Z"))).not.toEqual(late);
  });
});

describe("parseRows", () => {
  it("parses the real 48 h fixture", () => {
    const rows = parseRows(sample.response.data);
    expect(rows).toHaveLength(480);
    expect(rows[0].hourStart).toBe("2026-10-15T00:00:00-04:00");
    expect(rows.at(-1)?.hourStart).toBe("2026-10-16T23:00:00-04:00");
    expect(new Set(rows.map((r) => r.fuelCode))).toEqual(
      new Set(["BAT", "NG", "NUC", "OIL", "OTH", "PS", "SNB", "SUN", "WAT", "WND"]),
    );
    for (const r of rows) expect(Number.isFinite(r.mwh)).toBe(true);
  });

  it("skips null, empty, and non-numeric values instead of using 0, and keeps negatives", () => {
    const rows = parseRows([
      row("2026-10-16T18", "NG", "8772"),
      row("2026-10-16T18", "OIL", null),
      row("2026-10-16T18", "SUN", ""),
      row("2026-10-16T18", "WND", "n/a"),
      row("2026-10-16T18", "PS", "-120"),
      row("bad-period", "NUC", "3300"),
      { period: "2026-10-16T18", value: "5" },
    ]);
    expect(rows).toEqual([
      { hourStart: "2026-10-16T14:00:00-04:00", fuelCode: "NG", mwh: 8772 },
      { hourStart: "2026-10-16T14:00:00-04:00", fuelCode: "PS", mwh: -120 },
    ]);
  });
});

describe("fetchFuelMix", () => {
  it("sends the expected query", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(page(1, [row("2026-10-16T18", "NG", "1")])));
    await fetchFuelMix({ now: NOW });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = calledUrl(0);
    expect(url.origin + url.pathname).toBe(
      "https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/",
    );
    const q = url.searchParams;
    expect(q.get("frequency")).toBe("hourly");
    expect(q.get("data[0]")).toBe("value");
    expect(q.get("facets[respondent][]")).toBe("ISNE");
    expect(q.get("start")).toBe("2026-09-20T00");
    expect(q.get("end")).toBe("2026-10-18T00");
    expect(q.get("sort[0][column]")).toBe("period");
    expect(q.get("sort[0][direction]")).toBe("asc");
    expect(q.get("offset")).toBe("0");
    expect(q.get("length")).toBe(String(EIA_PAGE_SIZE));
    expect(q.get("api_key")).toBe(KEY);
  });

  it("fetches the second page using the total from the first", async () => {
    const total = EIA_PAGE_SIZE + 2;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(page(total, [row("2026-10-16T17", "NG", "1")])))
      .mockResolvedValueOnce(
        jsonResponse(page(total, [row("2026-10-16T18", "NG", "2"), row("2026-10-16T18", "NUC", "3")])),
      );

    const rows = await fetchFuelMix({ now: NOW });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calledUrl(1).searchParams.get("offset")).toBe(String(EIA_PAGE_SIZE));
    expect(rows.map((r) => r.mwh)).toEqual([1, 2, 3]);
  });

  it("drops a row repeated across the page boundary", async () => {
    const total = EIA_PAGE_SIZE + 1;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(page(total, [row("2026-10-16T18", "NG", "1"), row("2026-10-16T18", "NUC", "2")])),
      )
      .mockResolvedValueOnce(
        jsonResponse(page(total, [row("2026-10-16T18", "NUC", "2"), row("2026-10-16T18", "WND", "3")])),
      );

    const rows = await fetchFuelMix({ now: NOW });

    expect(rows.map((r) => r.fuelCode)).toEqual(["NG", "NUC", "WND"]);
  });

  it("throws missing_key without calling fetch", async () => {
    vi.stubEnv("EIA_API_KEY", "");
    const err = await caught(fetchFuelMix({ now: NOW }));
    expect(err.kind).toBe("missing_key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws auth on 403 with the EIA error code", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: "API_KEY_INVALID", message: "bad key" } }, 403),
    );
    const err = await caught(fetchFuelMix({ now: NOW }));
    expect(err.kind).toBe("auth");
    expect(err.status).toBe(403);
    expect(err.message).toContain("API_KEY_INVALID");
  });

  it("throws http on a 504 with an HTML body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html><body>504 Gateway Time-out</body></html>", { status: 504 }),
    );
    const err = await caught(fetchFuelMix({ now: NOW }));
    expect(err.kind).toBe("http");
    expect(err.status).toBe(504);
  });

  it("throws bad_response on a 200 that isn't the expected JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 200 }));
    expect((await caught(fetchFuelMix({ now: NOW }))).kind).toBe("bad_response");

    fetchMock.mockResolvedValueOnce(jsonResponse({ response: { total: "1" } }));
    expect((await caught(fetchFuelMix({ now: NOW }))).kind).toBe("bad_response");
  });

  it("throws network when fetch itself fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await caught(fetchFuelMix({ now: NOW }))).kind).toBe("network");
  });

  describe("timeout", () => {
    // A fetch that only settles when its signal aborts.
    function hangingFetch(_url: RequestInfo | URL, init?: RequestInit) {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    }

    it("aborts after EIA_TIMEOUT_MS by default", async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation(hangingFetch);
      const p = caught(fetchFuelMix({ now: NOW }));
      await vi.advanceTimersByTimeAsync(EIA_TIMEOUT_MS - 1);
      expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect((await p).kind).toBe("timeout");
    });

    it("uses one deadline across pages, overridable with timeoutMs", async () => {
      vi.useFakeTimers();
      fetchMock
        .mockImplementationOnce(async () => {
          await new Promise((r) => setTimeout(r, 900));
          return jsonResponse(page(EIA_PAGE_SIZE + 1, []));
        })
        .mockImplementation(hangingFetch);
      const p = caught(fetchFuelMix({ now: NOW, timeoutMs: 1000 }));
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect((await p).kind).toBe("timeout");
    });
  });

  it("never puts the API key in error messages", async () => {
    const failures: (() => Promise<Response>)[] = [
      async () => jsonResponse({ error: { code: "API_KEY_INVALID", message: `key ${KEY}` } }, 403),
      async () => new Response(`<html>${KEY}</html>`, { status: 504 }),
      async () => new Response(`garbage ${KEY}`, { status: 200 }),
      async () => {
        throw new TypeError(`fetch failed for ${KEY}`);
      },
    ];
    for (const fail of failures) {
      fetchMock.mockImplementationOnce(fail);
      const err = await caught(fetchFuelMix({ now: NOW }));
      expect(err.message).not.toContain(KEY);
      expect(String(err.stack)).not.toContain(KEY);
    }
  });
});

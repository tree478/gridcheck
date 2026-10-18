import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: async () => {},
}));
import { GET as getImage } from "../../app/api/campus/image/route";
import { GET as getStatus, POST } from "../../app/api/campus/visualize/route";
import { ACTIVITY_CATALOG } from "../constants";
import { schedule } from "../scheduling/schedule";
import { addMinutes } from "../scheduling/time";
import type { HourIntensity, ScheduleRequest } from "../types";
import {
  clearCampusMemoryForTests,
  setCampusCacheDirForTests,
} from "./cache";
import { IMAGINE_EDITS_URL, IMAGINE_GENERATIONS_URL, IMAGINE_MODEL } from "./config";
import {
  fillGenerationLimitForTests,
  resetGenerationLimitForTests,
} from "./imagine";
import { campusSceneStatus, resetCampusInflightForTests, visualizeCampus } from "./visualize";

const KEY = "test-key-SECRET123";
const MARKER = "DRAW-A-LOGO-MARKER-9f3c";
const NOW = "2026-10-18T08:50:00-04:00";
const HOUR_9 = "2026-10-18T09:00:00-04:00";
const B64 = "aGVsbG8=";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function generated(extra: Record<string, unknown> = {}) {
  return jsonResponse({ data: [{ b64_json: B64, mime_type: "image/png", ...extra }] });
}

function hours(start: string, values: number[]): HourIntensity[] {
  let cursor = start;
  return values.map((gco2PerKwh) => {
    const hour = { hourStart: cursor, gco2PerKwh, tier: "pattern" as const };
    cursor = addMinutes(cursor, 60);
    return hour;
  });
}

function scheduleRequest(): ScheduleRequest {
  const washer = ACTIVITY_CATALOG.find((activity) => activity.id === "washer");
  if (!washer) throw new Error("washer missing from catalog");
  return {
    items: [
      {
        activity: { ...washer, name: MARKER },
        durationMin: 60,
        energyKwh: 0.5,
        delayStart: false,
      },
    ],
    now: NOW,
    deadline: "2026-10-18T14:00:00-04:00",
    busy: [
      {
        start: "2026-10-18T12:00:00-04:00",
        end: "2026-10-18T13:00:00-04:00",
        asleep: false,
        title: MARKER,
      },
    ],
    fixedRuns: [],
    forecast: hours(HOUR_9, [400, 120, 300, 180, 250]),
    diversitySeed: 1,
  };
}

function resetState() {
  resetCampusInflightForTests();
  resetGenerationLimitForTests();
  setCampusCacheDirForTests(null);
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => generated());
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("XAI_API_KEY", KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
  resetState();
});

afterEach(() => {
  resetState();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function outbound(call = 0): { url: string; body: Record<string, unknown>; authorization: string } {
  const url = String(fetchMock.mock.calls[call][0]);
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  const headers = init.headers as Record<string, string>;
  return {
    url,
    body: JSON.parse(String(init.body)) as Record<string, unknown>,
    authorization: headers.Authorization,
  };
}

describe("visualizeCampus", () => {
  it("rejects an invalid scene before calling Grok Imagine", async () => {
    await expect(visualizeCampus({ scene: "campus" })).rejects.toMatchObject({
      status: 400,
      code: "invalid_request",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a custom prompt so the route cannot proxy arbitrary images", async () => {
    await expect(
      visualizeCampus({ scene: "normal", prompt: "a cat in a hat" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a missing key without calling the image service", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    await expect(visualizeCampus({ scene: "normal" })).rejects.toMatchObject({
      status: 503,
      code: "missing_credentials",
      message: "Image generation is not configured on the server.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generates a scene and serves it again from cache", async () => {
    const first = await visualizeCampus({ scene: "normal" });
    const second = await visualizeCampus({ scene: "normal" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(first.imageUrl).toContain("/api/campus/image?scene=normal");
    expect(first.generatedBy).toBe("Grok Imagine");
    expect(first.model).toBe(IMAGINE_MODEL);
    expect(first.isIllustrative).toBe(true);
    expect(first.scheduleContext).toBeNull();
    expect(first.title).toBe("The Campus We See");
    expect(first.imageExpiresAt).toBeNull();
    expect(first.imageDataUrl).toBe(`data:image/png;base64,${B64}`);
    expect(JSON.stringify(first)).not.toContain(KEY);

    const sent = outbound();
    expect(sent.url).toBe(IMAGINE_GENERATIONS_URL);
    expect(sent.authorization).toBe(`Bearer ${KEY}`);
    expect(sent.body.model).toBe(IMAGINE_MODEL);
    expect(sent.body.response_format).toBe("b64_json");
    expect(sent.body.aspect_ratio).toBe("16:9");
    expect(JSON.stringify(sent.body)).not.toContain(KEY);
  });

  it("edits the cached normal scene for visual continuity", async () => {
    await visualizeCampus({ scene: "normal" });
    const revealed = await visualizeCampus({ scene: "revealed" });
    expect(revealed.continuity).toBe("edited-from-normal");
    expect(revealed.title).toBe("The Campus We Don't See");
    const sent = outbound(1);
    expect(sent.url).toBe(IMAGINE_EDITS_URL);
    const image = sent.body.image as { url: string };
    expect(image.url.startsWith("data:image/png;base64,")).toBe(true);
    expect(String(sent.body.prompt)).toContain("Keep the same campus");
    expect(String(sent.body.prompt)).not.toContain(MARKER);
  });

  it("generates revealed from scratch when the normal scene is not cached", async () => {
    const revealed = await visualizeCampus({ scene: "revealed" });
    expect(revealed.continuity).toBe("text-to-image");
    expect(outbound().url).toBe(IMAGINE_GENERATIONS_URL);
  });

  it("does not put schedule text or invented savings into the prompt", async () => {
    const request = scheduleRequest();
    const result = await visualizeCampus({ scene: "optimized", scheduleRequest: request });
    const washer = ACTIVITY_CATALOG.find((activity) => activity.id === "washer");
    if (!washer) throw new Error("washer missing from catalog");
    const trusted = schedule({
      ...request,
      items: [{ ...request.items[0], activity: washer }],
      busy: [{ start: "2026-10-18T12:00:00-04:00", end: "2026-10-18T13:00:00-04:00", asleep: false }],
    });
    const activityResult = trusted.results[0];
    if (!activityResult.ok) throw new Error(activityResult.reason);
    const recommended = activityResult.options.find((option) => option.labels.includes("recommended"));
    if (!recommended) throw new Error("missing recommended");

    expect(result.scheduleContext).toMatchObject({
      activityId: "washer",
      activityName: "Washer",
      modeledGrams: recommended.modeledGrams,
      savedVsSoonestGrams: recommended.savedVsSoonestGrams,
      savedVsSoonestPct: recommended.savedVsSoonestPct,
      recommendedStart: recommended.start,
      recommendedEnd: recommended.end,
      estimatesAreModeled: true,
      scope: "one-appliance",
    });
    expect(result.scheduleContext?.gco2PerKwh).not.toBeNull();
    const prompt = String(outbound().body.prompt);
    expect(prompt).not.toContain(MARKER);
    expect(prompt).not.toContain("Washer");
    expect(prompt).not.toContain(String(recommended.modeledGrams));
  });

  it("refuses an unusable schedule before spending an image call", async () => {
    const request = scheduleRequest();
    request.items[0].durationMin = 10;
    await expect(visualizeCampus({ scene: "normal", scheduleRequest: request })).rejects.toMatchObject({
      status: 400,
      code: "invalid_request",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream failures to a frontend-safe error", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { message: `leak ${KEY}` } }, 500),
    );
    await expect(visualizeCampus({ scene: "normal" })).rejects.toMatchObject({
      status: 502,
      code: "upstream_unavailable",
      message: "The image service could not generate that scene right now.",
    });
  });

  it("maps upstream rate limits without copying the response body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: KEY }, 429));
    await expect(visualizeCampus({ scene: "normal" })).rejects.toMatchObject({
      status: 429,
      code: "upstream_rate_limited",
    });
  });

  it("maps timeouts", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error(`slow ${KEY}`), { name: "TimeoutError" }));
    await expect(visualizeCampus({ scene: "normal" })).rejects.toMatchObject({
      status: 504,
      code: "timeout",
      message: "Image generation took too long. Try again in a moment.",
    });
  });

  it("hides network errors that include the key", async () => {
    fetchMock.mockRejectedValue(new Error(`connect ${KEY}`));
    try {
      await visualizeCampus({ scene: "normal" });
      throw new Error("expected rejection");
    } catch (err) {
      expect(err).toMatchObject({ status: 502, code: "upstream_unavailable" });
      expect(err instanceof Error ? err.message : "").not.toContain(KEY);
    }
  });

  it("stops after the hourly generation budget", async () => {
    fillGenerationLimitForTests(Date.now());
    await expect(visualizeCampus({ scene: "normal" })).rejects.toMatchObject({
      status: 429,
      code: "rate_limited",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares one in-flight generation across two callers", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(async () => {
      await gate;
      return generated();
    });
    const first = visualizeCampus({ scene: "normal" });
    const second = visualizeCampus({ scene: "normal" });
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.imageUrl).toBe(b.imageUrl);
  });

  it("downloads a temporary https URL and does not return it", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === IMAGINE_GENERATIONS_URL) {
        return jsonResponse({
          data: [{ url: "https://images.example.test/campus.jpg", mime_type: "image/jpeg" }],
        });
      }
      return new Response(Buffer.from("pixels"), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    });
    const result = await visualizeCampus({ scene: "normal" });
    expect(result.imageUrl).not.toContain("images.example.test");
    expect(result.mimeType).toBe("image/jpeg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not follow a non-https image URL", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ url: "http://127.0.0.1/secret", mime_type: "image/jpeg" }] }),
    );
    await expect(visualizeCampus({ scene: "normal" })).rejects.toMatchObject({
      code: "upstream_unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reloads a scene from the local disk cache", async () => {
    const dir = path.join(process.cwd(), ".campus-cache-test");
    mkdirSync(dir, { recursive: true });
    setCampusCacheDirForTests(dir);
    try {
      await visualizeCampus({ scene: "normal" });
      clearCampusMemoryForTests();
      resetGenerationLimitForTests();
      const again = await visualizeCampus({ scene: "normal" });
      expect(again.cached).toBe(true);
      expect(again.persistence).toBe("process-memory-and-local-disk");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not generate images while reporting which scenes are ready", async () => {
    expect(campusSceneStatus().scenes.normal.ready).toBe(false);
    await visualizeCampus({ scene: "revealed" });
    fetchMock.mockClear();
    const status = campusSceneStatus();
    expect(status.generatesOnGet).toBe(false);
    expect(status.scenes.revealed.ready).toBe(true);
    expect(status.scenes.normal.ready).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("HTTP routes", () => {
  it("returns a frontend-safe invalid scene from POST", async () => {
    const response = await POST(
      new Request("http://localhost/api/campus/visualize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scene: "nope" }),
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "Scene must be normal, revealed, or optimized.",
      code: "invalid_request",
    });
    expect(JSON.stringify(body)).not.toContain(KEY);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/campus/visualize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "invalid_request" });
  });

  it("rejects a non-JSON content type", async () => {
    const response = await POST(
      new Request("http://localhost/api/campus/visualize", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ scene: "normal" }),
      }),
    );
    expect(response.status).toBe(415);
  });

  it("rejects an oversized body", async () => {
    const response = await POST(
      new Request("http://localhost/api/campus/visualize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scene: "normal", padding: "x".repeat(120_000) }),
      }),
    );
    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the image bytes from the cache URL and 404 before that", async () => {
    const missing = await getImage(new Request("http://localhost/api/campus/image?scene=normal"));
    expect(missing.status).toBe(404);

    const created = await POST(
      new Request("http://localhost/api/campus/visualize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scene: "normal" }),
      }),
    );
    const payload = await created.json();
    expect(created.status).toBe(200);
    const image = await getImage(new Request(`http://localhost${payload.imageUrl}`));
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await image.arrayBuffer()).toString()).toBe("hello");
    expect(JSON.stringify(payload)).not.toContain(KEY);
  });

  function sequenceRequest(body: Record<string, unknown> = { sequence: true }) {
    return new Request("http://localhost/api/campus/visualize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function readNdjson(response: Response): Promise<unknown[]> {
    const text = await response.text();
    return text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as unknown);
  }

  it("streams normal, revealed, and optimized in one request", async () => {
    const response = await POST(sequenceRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const lines = await readNdjson(response);
    expect(lines).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const scenes = lines.map((line) => {
      expect(line).toMatchObject({ type: "scene" });
      return (line as { scene: { scene: string; imageDataUrl: string; continuity: string; cached: boolean } }).scene;
    });
    expect(scenes.map((item) => item.scene)).toEqual(["normal", "revealed", "optimized"]);
    expect(scenes[0].continuity).toBe("text-to-image");
    expect(scenes[1].continuity).toBe("edited-from-normal");
    expect(scenes[2].continuity).toBe("edited-from-normal");
    for (const item of scenes) {
      expect(item.imageDataUrl.startsWith("data:image/")).toBe(true);
      expect(item.cached).toBe(false);
    }
    expect(outbound(0).url).toBe(IMAGINE_GENERATIONS_URL);
    expect(outbound(1).url).toBe(IMAGINE_EDITS_URL);
    expect(outbound(2).url).toBe(IMAGINE_EDITS_URL);
    expect(JSON.stringify(lines)).not.toContain(KEY);
  });

  it("replays a sequence from cache without calling xAI", async () => {
    const first = await POST(sequenceRequest());
    await readNdjson(first);
    fetchMock.mockClear();
    const response = await POST(sequenceRequest());
    const lines = await readNdjson(response);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line).toMatchObject({ type: "scene", scene: { cached: true } });
    }
  });

  it("rejects a sequence that also sends a prompt, an image, or a scene", async () => {
    const prompt = await POST(sequenceRequest({ sequence: true, prompt: "a cat in a hat" }));
    const image = await POST(sequenceRequest({ sequence: true, image: "data:image/png;base64,aaaa" }));
    const scene = await POST(sequenceRequest({ sequence: true, scene: "normal" }));
    expect(prompt.status).toBe(400);
    expect(image.status).toBe(400);
    expect(scene.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a missing key for a sequence without calling the image service", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const response = await POST(sequenceRequest());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      code: "missing_credentials",
      error: "Image generation is not configured on the server.",
    });
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("emits the finished scene and one error when a later scene fails", async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      if (calls === 2) return jsonResponse({ error: `leak ${KEY}` }, 500);
      return generated();
    });
    const response = await POST(sequenceRequest());
    expect(response.status).toBe(200);
    const lines = await readNdjson(response);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ type: "scene", scene: { scene: "normal", continuity: "text-to-image" } });
    expect(lines[1]).toMatchObject({
      type: "error",
      code: "upstream_unavailable",
      scene: "revealed",
      error: "The image service could not generate that scene right now.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(lines)).not.toContain(KEY);
  });

  it("reports cache status without generating", async () => {
    const response = await getStatus();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.generatesOnGet).toBe(false);
    expect(body.scenes.optimized.ready).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

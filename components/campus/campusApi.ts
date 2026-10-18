import { mockScheduleResult } from "@/lib/mocks/schedule";
import { sceneCopy } from "./campusScenes";
import type {
  CampusSceneId,
  CampusScheduleContext,
  CampusVisualizeResponse,
} from "./campusTypes";

/**
 * Flip to false once POST /api/campus/visualize is finalized and live.
 * Until then, the experience uses cinematic CSS placeholders + mock schedule.
 */
export const CAMPUS_USE_MOCK = true;

const MOCK_LATENCY_MS = 900;

function mockScheduleContext(): CampusScheduleContext {
  const washer = mockScheduleResult.results.find(
    (r) => r.ok && r.activityId === "washer",
  );
  if (!washer || !washer.ok) {
    return {
      activityLabel: "Washer",
      recommendedStart: "2026-10-18T13:00:00-04:00",
      recommendedEnd: "2026-10-18T14:00:00-04:00",
      savedGrams: 40,
    };
  }
  const recommended = washer.options.find((o) =>
    o.labels.includes("recommended"),
  );
  if (!recommended) {
    throw new Error("Mock washer Recommended option missing");
  }
  return {
    activityLabel: "Washer",
    recommendedStart: recommended.start,
    recommendedEnd: recommended.end,
    savedGrams: recommended.savedVsSoonestGrams,
  };
}

function mockResponse(scene: CampusSceneId): CampusVisualizeResponse {
  const copy = sceneCopy(scene);
  return {
    scene,
    imageUrl: null,
    title: copy.title,
    description: copy.description,
    generatedBy: "Grok Imagine",
    isIllustrative: true,
    scheduleContext: scene === "thinks" ? mockScheduleContext() : null,
  };
}

async function fetchMock(
  scene: CampusSceneId,
): Promise<CampusVisualizeResponse> {
  await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
  return mockResponse(scene);
}

async function fetchLive(
  scene: CampusSceneId,
): Promise<CampusVisualizeResponse> {
  const res = await fetch("/api/campus/visualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scene }),
  });
  if (!res.ok) {
    throw new Error(`Campus visualize failed (${res.status})`);
  }
  return (await res.json()) as CampusVisualizeResponse;
}

/** Load one scene visualization (mock or live). */
export async function fetchCampusScene(
  scene: CampusSceneId,
): Promise<CampusVisualizeResponse> {
  return CAMPUS_USE_MOCK ? fetchMock(scene) : fetchLive(scene);
}

/** Prefetch all scenes; rejects if any scene fails. */
export async function fetchAllCampusScenes(): Promise<
  Record<CampusSceneId, CampusVisualizeResponse>
> {
  const ids: CampusSceneId[] = ["seen", "revealed", "thinks"];
  const results = await Promise.all(ids.map((id) => fetchCampusScene(id)));
  return {
    seen: results[0],
    revealed: results[1],
    thinks: results[2],
  };
}

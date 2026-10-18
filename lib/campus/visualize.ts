import { readScene, writeScene, campusPersistence } from "./cache";
import type { StoredScene } from "./cache";
import { IMAGINE_MODEL } from "./config";
import { invalidRequest } from "./errors";
import { requestCampusImage, takeGenerationSlot } from "./imagine";
import { readScheduleContext } from "./schedule-context";
import { SCENE_COPY, isCampusScene } from "./scenes";
import type {
  CampusScene,
  CampusSceneStatus,
  CampusScheduleContext,
  CampusStatusResponse,
  CampusVisualResponse,
} from "./types";
import { CAMPUS_SCENES } from "./types";

const DISALLOWED = new Set([
  "prompt",
  "image",
  "images",
  "model",
  "n",
  "referenceImage",
  "referenceImageUrl",
  "negative_prompt",
  "response_format",
]);

const ALLOWED = new Set(["scene", "force", "scheduleRequest"]);

const inflight = new Map<CampusScene, Promise<StoredScene>>();

export function resetCampusInflightForTests(): void {
  inflight.clear();
}

type VisualizeRequest = {
  scene: CampusScene;
  force: boolean;
  scheduleRequest: unknown | undefined;
};

export function parseVisualizeRequest(body: unknown): VisualizeRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw invalidRequest("Request body must be a JSON object.");
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (DISALLOWED.has(key)) {
      throw invalidRequest(
        "This endpoint only generates the three campus scenes. It does not accept a prompt or a reference image.",
      );
    }
    if (!ALLOWED.has(key)) throw invalidRequest(`Unexpected field "${key}".`);
  }
  if (!isCampusScene(record.scene)) {
    throw invalidRequest("Scene must be normal, revealed, or optimized.");
  }
  if (record.force !== undefined && typeof record.force !== "boolean") {
    throw invalidRequest("force must be true or false.");
  }
  return {
    scene: record.scene,
    force: record.force === true,
    scheduleRequest: record.scheduleRequest,
  };
}

export function campusImagePath(scene: CampusScene, generatedAt: string): string {
  return `/api/campus/image?scene=${scene}&v=${encodeURIComponent(generatedAt)}`;
}

function toResponse(
  scene: CampusScene,
  image: StoredScene,
  cached: boolean,
  scheduleContext: CampusScheduleContext | null,
): CampusVisualResponse {
  const copy = SCENE_COPY[scene];
  return {
    scene,
    imageUrl: campusImagePath(scene, image.generatedAt),
    mimeType: image.mimeType,
    imageExpiresAt: null,
    persistence: campusPersistence(),
    title: copy.title,
    description: copy.description,
    generatedBy: "Grok Imagine",
    model: IMAGINE_MODEL,
    isIllustrative: true,
    cached,
    continuity: image.continuity,
    generatedAt: image.generatedAt,
    scheduleContext,
  };
}

async function getOrCreateImage(scene: CampusScene, force: boolean): Promise<{ image: StoredScene; cached: boolean }> {
  if (!force) {
    const cached = readScene(scene);
    if (cached) return { image: cached, cached: true };
    const pending = inflight.get(scene);
    if (pending) return { image: await pending, cached: true };
  }

  const job = (async () => {
    takeGenerationSlot();
    const reference = scene === "normal" ? null : readScene("normal");
    const image = await requestCampusImage(scene, reference);
    writeScene(scene, image);
    return image;
  })();

  if (!force) inflight.set(scene, job);
  try {
    const image = await job;
    return { image, cached: false };
  } finally {
    if (inflight.get(scene) === job) inflight.delete(scene);
  }
}

export async function visualizeCampus(body: unknown): Promise<CampusVisualResponse> {
  const request = parseVisualizeRequest(body);
  let scheduleContext: CampusScheduleContext | null = null;
  if (request.scheduleRequest !== undefined && request.scheduleRequest !== null) {
    scheduleContext = readScheduleContext(request.scheduleRequest);
  }
  const image = await getOrCreateImage(request.scene, request.force);
  return toResponse(request.scene, image.image, image.cached, scheduleContext);
}

export function campusSceneStatus(): CampusStatusResponse {
  const scenes = {} as Record<CampusScene, CampusSceneStatus>;
  for (const scene of CAMPUS_SCENES) {
    const image = readScene(scene);
    scenes[scene] = image
      ? { ready: true, generatedAt: image.generatedAt, imageUrl: campusImagePath(scene, image.generatedAt) }
      : { ready: false, generatedAt: null, imageUrl: null };
  }
  return { scenes, persistence: campusPersistence(), generatesOnGet: false };
}

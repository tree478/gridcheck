import {
  GENERATION_WINDOW_MS,
  IMAGINE_ASPECT_RATIO,
  IMAGINE_EDITS_URL,
  IMAGINE_GENERATIONS_URL,
  IMAGINE_MODEL,
  IMAGINE_QUALITY,
  IMAGINE_RESOLUTION,
  IMAGINE_TIMEOUT_MS,
  MAX_GENERATIONS_PER_HOUR,
  MAX_IMAGE_BYTES,
} from "./config";
import { CampusError } from "./errors";
import { promptFor } from "./scenes";
import type { StoredScene } from "./cache";
import type { CampusScene } from "./types";

const generationTimes: number[] = [];

export function resetGenerationLimitForTests(): void {
  generationTimes.length = 0;
}

export function fillGenerationLimitForTests(now: number): void {
  generationTimes.length = 0;
  for (let index = 0; index < MAX_GENERATIONS_PER_HOUR; index += 1) {
    generationTimes.push(now);
  }
}

export function takeGenerationSlot(now = Date.now()): void {
  const cutoff = now - GENERATION_WINDOW_MS;
  while (generationTimes.length > 0 && generationTimes[0] < cutoff) generationTimes.shift();
  if (generationTimes.length >= MAX_GENERATIONS_PER_HOUR) {
    throw new CampusError(
      "rate_limited",
      "Campus image generation is paused so we don't create too many images. Reuse a scene that was already generated, or try again later.",
      429,
    );
  }
  generationTimes.push(now);
}

function readApiKey(): string {
  if (typeof window !== "undefined") {
    throw new CampusError(
      "missing_credentials",
      "Image generation is not configured on the server.",
      503,
    );
  }
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) {
    throw new CampusError(
      "missing_credentials",
      "Image generation is not configured on the server.",
      503,
    );
  }
  return key;
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

async function postImagine(url: string, body: Record<string, unknown>): Promise<unknown> {
  const key = readApiKey();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(IMAGINE_TIMEOUT_MS),
    });
  } catch (err) {
    if (isTimeout(err)) {
      throw new CampusError(
        "timeout",
        "Image generation took too long. Try again in a moment.",
        504,
      );
    }
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new CampusError(
      "upstream_auth",
      "The image service rejected the server credentials.",
      502,
      response.status,
    );
  }
  if (response.status === 429) {
    throw new CampusError(
      "upstream_rate_limited",
      "The image service is busy right now. Wait a moment and try again.",
      429,
      response.status,
    );
  }
  if (response.status === 408 || response.status === 504) {
    throw new CampusError(
      "timeout",
      "Image generation took too long. Try again in a moment.",
      504,
      response.status,
    );
  }
  if (!response.ok) {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
      response.status,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
      response.status,
    );
  }
}

type ImagePayload = {
  b64_json?: unknown;
  url?: unknown;
  mime_type?: unknown;
};

function firstImage(body: unknown): ImagePayload {
  if (!body || typeof body !== "object") {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }
  return data[0] as ImagePayload;
}

function mimeTypeOf(value: unknown): string {
  if (typeof value === "string" && value.startsWith("image/")) return value.split(";")[0];
  return "image/jpeg";
}

function decodeBase64(b64: string, mimeType: string): StoredScene {
  const compact = b64.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }
  const bytes = Buffer.from(compact, "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }
  return {
    bytes: new Uint8Array(bytes),
    mimeType,
    generatedAt: new Date().toISOString(),
    continuity: "text-to-image",
  };
}

async function inlineRemoteImage(url: string, mimeType: string): Promise<StoredScene> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }
  if (parsed.protocol !== "https:") {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString(), { signal: AbortSignal.timeout(IMAGINE_TIMEOUT_MS) });
  } catch (err) {
    if (isTimeout(err)) {
      throw new CampusError(
        "timeout",
        "Image generation took too long. Try again in a moment.",
        504,
      );
    }
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }

  if (!response.ok) {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
      response.status,
    );
  }

  const headerType = response.headers.get("content-type")?.split(";")[0]?.trim();
  const resolved = headerType && headerType.startsWith("image/") ? headerType : mimeType;
  if (!resolved.startsWith("image/")) {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new CampusError(
      "upstream_unavailable",
      "The image service could not generate that scene right now.",
      502,
    );
  }

  return {
    bytes: new Uint8Array(buffer),
    mimeType: resolved,
    generatedAt: new Date().toISOString(),
    continuity: "text-to-image",
  };
}

async function imageFromResponse(body: unknown): Promise<StoredScene> {
  const image = firstImage(body);
  const mimeType = mimeTypeOf(image.mime_type);
  if (typeof image.b64_json === "string" && image.b64_json.length > 0) {
    return decodeBase64(image.b64_json, mimeType);
  }
  if (typeof image.url === "string" && image.url.length > 0) {
    return inlineRemoteImage(image.url, mimeType);
  }
  throw new CampusError(
    "upstream_unavailable",
    "The image service could not generate that scene right now.",
    502,
  );
}

function generationBody(prompt: string): Record<string, unknown> {
  return {
    model: IMAGINE_MODEL,
    prompt,
    n: 1,
    aspect_ratio: IMAGINE_ASPECT_RATIO,
    resolution: IMAGINE_RESOLUTION,
    quality: IMAGINE_QUALITY,
    response_format: "b64_json",
  };
}

/**
 * One Grok Imagine call. Server only: reads XAI_API_KEY and never returns it.
 * When `reference` is set, uses the documented image-edit endpoint so the
 * campus composition can stay put. The caller chooses the prompt; user text
 * never reaches this function.
 */
export async function requestCampusImage(
  scene: CampusScene,
  reference: StoredScene | null,
): Promise<StoredScene> {
  const editing = scene !== "normal" && reference !== null;
  const prompt = promptFor(scene, editing ? "edited-from-normal" : "text-to-image");
  const body = editing
    ? {
        ...generationBody(prompt),
        image: {
          url: `data:${reference.mimeType};base64,${Buffer.from(reference.bytes).toString("base64")}`,
          type: "image_url",
        },
      }
    : generationBody(prompt);

  const response = await postImagine(editing ? IMAGINE_EDITS_URL : IMAGINE_GENERATIONS_URL, body);
  const image = await imageFromResponse(response);
  return editing ? { ...image, continuity: "edited-from-normal" } : image;
}

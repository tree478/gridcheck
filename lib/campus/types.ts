import type { ActivityId, Tier } from "../types";

export const CAMPUS_SCENES = ["normal", "revealed", "optimized"] as const;

export type CampusScene = (typeof CAMPUS_SCENES)[number];

export type CampusContinuity = "text-to-image" | "edited-from-normal";

export type CampusPersistence = "process-memory" | "process-memory-and-local-disk";

/** Real scheduler output for Miranda's text overlay. Never painted into the image. */
export type CampusScheduleContext = {
  activityId: ActivityId;
  activityName: string;
  durationMin: number;
  energyKwh: number;
  recommendedStart: string;
  recommendedEnd: string;
  loadAt: string | null;
  modeledGrams: number;
  savedVsSoonestGrams: number;
  savedVsSoonestPct: number;
  confidence: Tier;
  /** Intensity of the forecast hour that contains recommendedStart, when that hour was in the request. */
  gco2PerKwh: number | null;
  estimatesAreModeled: true;
  /** GridCheck ranks one appliance. The picture is not a campus-wide optimization. */
  scope: "one-appliance";
  scopeNote: string;
};

export type CampusVisualResponse = {
  scene: CampusScene;
  /** Same-origin path. Not an xAI URL. xAI URLs expire; this one lasts for the server process, and across restarts when the local disk cache is on. */
  imageUrl: string;
  /** Display this. A later GET of imageUrl can hit a different serverless instance with an empty cache. */
  imageDataUrl: string;
  mimeType: string;
  imageExpiresAt: null;
  persistence: CampusPersistence;
  title: string;
  description: string;
  generatedBy: "Grok Imagine";
  model: "grok-imagine-image-2.0";
  isIllustrative: true;
  cached: boolean;
  continuity: CampusContinuity;
  generatedAt: string;
  scheduleContext: CampusScheduleContext | null;
};

export type CampusSceneStatus = {
  ready: boolean;
  generatedAt: string | null;
  imageUrl: string | null;
};

export type CampusStatusResponse = {
  scenes: Record<CampusScene, CampusSceneStatus>;
  persistence: CampusPersistence;
  generatesOnGet: false;
};

export type CampusErrorCode =
  | "invalid_request"
  | "payload_too_large"
  | "missing_credentials"
  | "rate_limited"
  | "upstream_rate_limited"
  | "timeout"
  | "upstream_auth"
  | "upstream_unavailable"
  | "not_found"
  | "internal";

export type CampusErrorBody = {
  error: string;
  code: CampusErrorCode;
};

export type CampusSequenceEvent =
  | { type: "scene"; scene: CampusVisualResponse }
  | { type: "error"; error: string; code: CampusErrorCode; scene: CampusScene | null };

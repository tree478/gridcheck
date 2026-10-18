// Server-side limits for Grok Imagine. Not shared app config; lib/constants.ts stays untouched.
export const IMAGINE_MODEL = "grok-imagine-image-2.0";
export const IMAGINE_GENERATIONS_URL = "https://api.x.ai/v1/images/generations";
export const IMAGINE_EDITS_URL = "https://api.x.ai/v1/images/edits";
export const IMAGINE_TIMEOUT_MS = 55_000;
export const IMAGINE_ASPECT_RATIO = "16:9";
export const IMAGINE_RESOLUTION = "1k";
export const IMAGINE_QUALITY = "medium";

/** Enough for three scenes plus a few retries. Cache hits do not count. */
export const MAX_GENERATIONS_PER_HOUR = 9;
export const GENERATION_WINDOW_MS = 60 * 60 * 1000;

export const MAX_REQUEST_BYTES = 100_000;
export const MAX_IMAGE_BYTES = 8_000_000;
export const MAX_FORECAST_HOURS = 200;
export const MAX_BUSY_BLOCKS = 200;
export const MAX_FIXED_RUNS = 20;

export const SCOPE_NOTE =
  "GridCheck recommended a time for one appliance. This campus image is an artistic future vision, not a campus-wide optimization and not a map of real electrical infrastructure.";

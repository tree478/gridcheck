import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MAX_IMAGE_BYTES } from "./config";
import type { CampusContinuity, CampusPersistence, CampusScene } from "./types";

export type StoredScene = {
  bytes: Uint8Array;
  mimeType: string;
  generatedAt: string;
  continuity: CampusContinuity;
};

type DiskScene = {
  mimeType: string;
  generatedAt: string;
  continuity: CampusContinuity;
  imageBase64: string;
};

const memory = new Map<CampusScene, StoredScene>();

/** undefined = default rules. null = memory only. string = that directory. */
let dirOverride: string | null | undefined;

function diskDir(): string | null {
  if (dirOverride !== undefined) return dirOverride;
  if (process.env.VITEST === "true") return null;
  return path.join(process.cwd(), ".campus-cache");
}

export function campusPersistence(): CampusPersistence {
  return diskDir() ? "process-memory-and-local-disk" : "process-memory";
}

export function setCampusCacheDirForTests(dir: string | null): void {
  dirOverride = dir;
  memory.clear();
}

export function resetCampusCacheForTests(): void {
  memory.clear();
  dirOverride = undefined;
}

export function clearCampusMemoryForTests(): void {
  memory.clear();
}

export function readScene(scene: CampusScene): StoredScene | null {
  const cached = memory.get(scene);
  if (cached) return cached;
  const fromDisk = loadScene(scene);
  if (fromDisk) memory.set(scene, fromDisk);
  return fromDisk;
}

export function writeScene(scene: CampusScene, image: StoredScene): void {
  memory.set(scene, image);
  const dir = diskDir();
  if (!dir) return;
  try {
    mkdirSync(dir, { recursive: true });
    const payload: DiskScene = {
      mimeType: image.mimeType,
      generatedAt: image.generatedAt,
      continuity: image.continuity,
      imageBase64: Buffer.from(image.bytes).toString("base64"),
    };
    writeFileSync(path.join(dir, `${scene}.json`), JSON.stringify(payload));
  } catch (err) {
    console.error(
      "campus cache write failed:",
      err instanceof Error ? err.name : "unknown error",
    );
  }
}

function loadScene(scene: CampusScene): StoredScene | null {
  const dir = diskDir();
  if (!dir) return null;
  try {
    const raw = readFileSync(path.join(dir, `${scene}.json`), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return decodeDiskScene(parsed);
  } catch {
    return null;
  }
}

function decodeDiskScene(parsed: unknown): StoredScene | null {
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Partial<DiskScene>;
  if (record.continuity !== "text-to-image" && record.continuity !== "edited-from-normal") {
    return null;
  }
  if (typeof record.mimeType !== "string" || !record.mimeType.startsWith("image/")) return null;
  if (typeof record.generatedAt !== "string" || typeof record.imageBase64 !== "string") return null;
  const bytes = Buffer.from(record.imageBase64, "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
  return {
    bytes: new Uint8Array(bytes),
    mimeType: record.mimeType,
    generatedAt: record.generatedAt,
    continuity: record.continuity,
  };
}

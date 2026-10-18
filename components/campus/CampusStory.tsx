"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CampusErrorCode, CampusScene } from "@/lib/campus/types";

type StoryScene = {
  id: CampusScene;
  title: string;
  description: string;
};

const SCENES: StoryScene[] = [
  {
    id: "normal",
    title: "The Campus We See",
    description: "Every light tells a story. Every building draws power.",
  },
  {
    id: "revealed",
    title: "The Campus We Don't See",
    description: "Beneath the surface, an invisible network connects us all.",
  },
  {
    id: "optimized",
    title: "The Campus That Thinks",
    description: "What if every decision worked with the grid, instead of against it?",
  },
];

const RETRYABLE = new Set<CampusErrorCode>(["timeout", "upstream_rate_limited"]);

export type CampusRecommendation = {
  name: string;
  windowLabel: string;
  savedGrams: number;
};

type StoryError = {
  error: string;
  code: CampusErrorCode;
  scene: CampusScene | null;
};

export type CampusImageSources = Partial<Record<CampusScene, string | null>>;

function readySources(initial: CampusImageSources | undefined): Partial<Record<CampusScene, string>> {
  const images: Partial<Record<CampusScene, string>> = {};
  for (const item of SCENES) {
    const url = initial?.[item.id];
    if (typeof url === "string" && url.startsWith("/api/campus/image?")) images[item.id] = url;
  }
  return images;
}

function errorFrom(body: unknown, scene: CampusScene | null): StoryError {
  const record = body && typeof body === "object" ? (body as { error?: unknown; code?: unknown }) : {};
  return {
    error: typeof record.error === "string" ? record.error : "Something went wrong while preparing that scene.",
    code: typeof record.code === "string" ? (record.code as CampusErrorCode) : "internal",
    scene,
  };
}

export default function CampusStory({
  recommendation,
  initialImages,
}: {
  recommendation: CampusRecommendation | null;
  /** Same-origin paths for scenes already stored on this machine. */
  initialImages?: CampusImageSources;
}) {
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState<Partial<Record<CampusScene, string>>>(() => readySources(initialImages));
  const [error, setError] = useState<StoryError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const scene = SCENES[index];
  const last = index === SCENES.length - 1;
  const nextScene = SCENES[index + 1];
  const nextReady = nextScene ? Boolean(images[nextScene.id]) : false;
  const pending = SCENES.find((item) => !images[item.id]);
  const pendingNumber = pending ? SCENES.indexOf(pending) + 1 : 0;
  const normalUrl = initialImages?.normal ?? null;
  const revealedUrl = initialImages?.revealed ?? null;
  const optimizedUrl = initialImages?.optimized ?? null;

  useEffect(() => {
    const seeded = readySources({ normal: normalUrl, revealed: revealedUrl, optimized: optimizedUrl });
    const missing = SCENES.map((item) => item.id).filter((id) => !seeded[id]);
    if (missing.length === 0) return;

    const controller = new AbortController();
    let ignore = false;

    async function loadMissing() {
      setError(null);
      for (const sceneId of missing) {
        if (ignore) return;
        try {
          const response = await fetch("/api/campus/visualize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scene: sceneId }),
            signal: controller.signal,
          });
          const body: unknown = await response.json().catch(() => null);
          if (!response.ok) {
            if (!ignore) setError(errorFrom(body, sceneId));
            return;
          }
          const imageUrl =
            body && typeof body === "object" ? (body as { imageUrl?: unknown }).imageUrl : null;
          if (typeof imageUrl !== "string" || !imageUrl.startsWith("/api/campus/image?")) {
            if (!ignore) {
              setError({
                error: "Something went wrong while preparing that scene.",
                code: "internal",
                scene: sceneId,
              });
            }
            return;
          }
          if (!ignore) setImages((current) => ({ ...current, [sceneId]: imageUrl }));
        } catch (err) {
          if (controller.signal.aborted || ignore) return;
          if (err instanceof Error && err.name === "AbortError") return;
          if (!ignore) {
            setError({
              error: "Something went wrong while preparing that scene.",
              code: "internal",
              scene: sceneId,
            });
          }
          return;
        }
      }
    }

    void loadMissing();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [attempt, normalUrl, revealedUrl, optimizedUrl]);

  return (
    <section
      className="fixed inset-0 z-50 overflow-hidden bg-[#05070d] text-white"
      aria-labelledby="campus-scene-title"
    >
      {SCENES.map((item, itemIndex) => {
        const src = images[item.id];
        if (!src) return null;
        return (
          // Same-origin bytes already stored for this scene. The optimizer cannot fetch this route.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              itemIndex === index ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10"
        aria-hidden
      />

      <div className="relative flex h-full flex-col justify-end px-5 pb-6 sm:px-10 sm:pb-8">
        <div className="mx-auto w-full max-w-5xl">
          {last && recommendation ? (
            <div className="mb-5 max-w-sm rounded-2xl border border-white/15 bg-black/55 px-4 py-3 backdrop-blur-md">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                GridCheck recommendation
              </p>
              <p className="mt-2 text-lg font-bold">{recommendation.name}</p>
              <p className="text-sm text-white/80">{recommendation.windowLabel}</p>
              <p className="mt-2 text-sm text-white/75">
                About {recommendation.savedGrams} g CO₂ saved vs. soonest (modeled estimate)
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 max-w-xl" role="alert">
              <p className="text-sm text-white/80">{error.error}</p>
              {RETRYABLE.has(error.code) ? (
                <button
                  type="button"
                  onClick={() => setAttempt((current) => current + 1)}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}

          {pending && !error ? (
            <p className="mb-4 max-w-xl text-sm text-white/80" aria-live="polite">
              Painting the campus, scene {pendingNumber} of {SCENES.length}. This can take about a
              minute.
            </p>
          ) : null}

          <h1
            id="campus-scene-title"
            className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl"
          >
            {scene.title}
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/75 sm:text-lg">{scene.description}</p>
          {last ? (
            <p className="mt-4 max-w-xl text-sm text-white/70">
              One campus. Thousands of decisions. One invisible grid.
            </p>
          ) : null}
          <p className="mt-3 max-w-xl text-xs text-white/50">
            Artistic illustration of a fictional campus. Not a map of real infrastructure, and not a
            campus-wide optimization.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-sm text-white/70" aria-live="polite">
              <span className="flex items-center gap-1.5" aria-hidden>
                {SCENES.map((item, itemIndex) => (
                  <span
                    key={item.id}
                    className={`h-1 rounded-full ${
                      itemIndex === index ? "w-8 bg-cyan-400" : "w-4 bg-white/30"
                    }`}
                  />
                ))}
              </span>
              <span>
                {index + 1} / {SCENES.length}
              </span>
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                Exit
              </Link>
              {last ? (
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-bold text-slate-950 hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  Back to GridCheck
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIndex((current) => Math.min(current + 1, SCENES.length - 1))}
                  disabled={!nextReady}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-bold text-slate-950 hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next Scene
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

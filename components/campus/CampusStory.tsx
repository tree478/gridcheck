"use client";

import Link from "next/link";
import { useState } from "react";
import type { CampusScene } from "@/lib/campus/types";

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

export type CampusRecommendation = {
  name: string;
  windowLabel: string;
  savedGrams: number;
};

function imageSrc(scene: CampusScene): string {
  return `/api/campus/image?scene=${scene}`;
}

export default function CampusStory({
  recommendation,
}: {
  recommendation: CampusRecommendation | null;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<CampusScene | null>(null);
  const scene = SCENES[index];
  const last = index === SCENES.length - 1;

  return (
    <section
      className="fixed inset-0 z-50 overflow-hidden bg-[#05070d] text-white"
      aria-labelledby="campus-scene-title"
    >
      {SCENES.map((item, itemIndex) => (
        <img
          key={item.id}
          src={imageSrc(item.id)}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            itemIndex === index ? "opacity-100" : "opacity-0"
          }`}
          onError={() => setFailed(item.id)}
        />
      ))}

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

          {failed === scene.id ? (
            <p className="mb-4 max-w-xl text-sm text-white/80" role="alert">
              That campus image is not on this server yet. Generate it once, then reopen this story.
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
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-bold text-slate-950 hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
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

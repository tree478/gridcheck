"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CAMPUS_USE_MOCK, fetchAllCampusScenes } from "./campusApi";
import CampusControls from "./CampusControls";
import CampusLoading from "./CampusLoading";
import CampusScene from "./CampusScene";
import { CAMPUS_SCENE_IDS, sceneIndex } from "./campusScenes";
import type { CampusSceneId, CampusVisualizeResponse } from "./campusTypes";
import "./campus.css";

const LOAD_ERROR =
  "We couldn't generate the campus visuals right now. Your GridCheck data is fine — try again in a moment.";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      scenes: Record<CampusSceneId, CampusVisualizeResponse>;
      current: CampusSceneId;
      fading: boolean;
    };

export default function InvisibleCampus() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);
  const fadeTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllCampusScenes()
      .then((scenes) => {
        if (cancelled) return;
        setState({
          status: "ready",
          scenes,
          current: "seen",
          fading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error", message: LOAD_ERROR });
      });
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const exit = useCallback(() => {
    router.push("/impact");
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") exit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit]);

  useEffect(() => {
    return () => {
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
    };
  }, []);

  function retry() {
    setState({ status: "loading" });
    setRetryToken((n) => n + 1);
  }

  function goNext() {
    setState((prev) => {
      if (prev.status !== "ready" || prev.fading) return prev;
      const i = sceneIndex(prev.current);
      if (i < 0 || i >= CAMPUS_SCENE_IDS.length - 1) return prev;
      return { ...prev, fading: true };
    });
    if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        const i = sceneIndex(prev.current);
        if (i < 0 || i >= CAMPUS_SCENE_IDS.length - 1) {
          return { ...prev, fading: false };
        }
        return {
          ...prev,
          current: CAMPUS_SCENE_IDS[i + 1],
          fading: false,
        };
      });
    }, 420);
  }

  const isLast =
    state.status === "ready" &&
    sceneIndex(state.current) === CAMPUS_SCENE_IDS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="The Invisible Campus"
    >
      {state.status === "loading" ? <CampusLoading /> : null}

      {state.status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-cyan-200/70">
            The Invisible Campus
          </p>
          <p className="max-w-md text-lg font-semibold text-white">
            Something went wrong
          </p>
          <p className="max-w-md text-sm leading-relaxed text-white/65">
            {state.message}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-bold text-[#041018] hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={exit}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-black/40 px-5 text-sm font-semibold text-white/90 hover:border-white/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Back to Impact
            </button>
          </div>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div
            className={`absolute inset-0 transition-opacity duration-500 ease-out ${
              state.fading ? "opacity-0" : "opacity-100"
            }`}
          >
            <CampusScene
              data={state.scenes[state.current]}
              animKey={state.current}
            />
          </div>

          <CampusControls
            scene={state.current}
            onNext={goNext}
            onExit={exit}
            isLast={isLast}
          />

          <p className="pointer-events-none absolute right-4 top-6 z-20 max-w-[11rem] text-right text-[0.625rem] leading-snug text-white/40 sm:right-8 sm:top-10 sm:max-w-xs">
            Artistic illustration
            {CAMPUS_USE_MOCK ? " · preview placeholders" : ""}
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            Generated with Grok Imagine
          </p>
        </>
      ) : null}
    </div>
  );
}

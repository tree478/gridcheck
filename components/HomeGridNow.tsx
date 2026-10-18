"use client";

import { useEffect, useState } from "react";
import GridNowCard from "@/components/GridNowCard";
import { ERROR_CLASS } from "@/components/planner/plannerStyles";
import type { GridResponse, HourIntensity } from "@/lib/types";

type Status = "loading" | "ready" | "error";

function isHourIntensity(value: unknown): value is HourIntensity {
  if (typeof value !== "object" || value === null) return false;
  const hour = value as Record<string, unknown>;
  return (
    typeof hour.hourStart === "string" &&
    typeof hour.gco2PerKwh === "number" &&
    Number.isFinite(hour.gco2PerKwh) &&
    (hour.tier === "measured" || hour.tier === "forecast" || hour.tier === "pattern")
  );
}

function isGridResponse(value: unknown): value is GridResponse {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    body.region === "ISNE" &&
    typeof body.generatedAt === "string" &&
    typeof body.forecastMadeAt === "string" &&
    typeof body.latestDataHour === "string" &&
    (body.source === "live" || body.source === "fallback") &&
    Array.isArray(body.recent) &&
    body.recent.every(isHourIntensity) &&
    Array.isArray(body.forecast) &&
    body.forecast.every(isHourIntensity)
  );
}

export default function HomeGridNow() {
  const [grid, setGrid] = useState<GridResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/grid", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("grid");
        const body: unknown = await response.json();
        if (!isGridResponse(body)) throw new Error("grid");
        if (!cancelled) {
          setGrid(body);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGrid(null);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <section
        aria-labelledby="grid-now-heading"
        className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[0_8px_28px_rgba(18,32,28,0.06)] sm:p-6"
      >
        <h2 id="grid-now-heading" className="text-sm font-semibold text-ink">
          The grid:
        </h2>
        <p role="status" aria-live="polite" className="mt-4 text-secondary">
          Loading New England grid data… This can take a few seconds.
        </p>
      </section>
    );
  }

  if (status === "error" || !grid) {
    return (
      <section
        aria-labelledby="grid-now-heading"
        className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[0_8px_28px_rgba(18,32,28,0.06)] sm:p-6"
      >
        <h2 id="grid-now-heading" className="text-sm font-semibold text-ink">
          The grid:
        </h2>
        <p role="alert" className={`mt-4 ${ERROR_CLASS}`}>
          We couldn&apos;t load grid data right now. Try again in a little
          while.
        </p>
      </section>
    );
  }

  return (
    <div className="min-w-0">
      {grid.source === "fallback" ? (
        <p role="status" className="mb-3 text-sm text-secondary">
          Using cached grid data.
        </p>
      ) : null}
      <GridNowCard grid={grid} />
    </div>
  );
}

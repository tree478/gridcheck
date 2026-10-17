"use client";

import { useId, useRef, useState } from "react";
import type { BusyBlock } from "@/lib/types";
import { busyBlocksToForm, type BusyFormBlock } from "./plannerModel";
import { icsHorizonMs, parseIcsToBusyBlocks } from "./icsBusy";
import { ERROR_CLASS, HINT_CLASS } from "./plannerStyles";

type Props = {
  now: string;
  blocks: BusyFormBlock[];
  onBusyLoaded: (blocks: BusyFormBlock[], fileName: string) => void;
  onClear: () => void;
  onRemove: (key: string) => void;
};

export default function BusyBlockFields({
  now,
  blocks,
  onBusyLoaded,
  onClear,
  onRemove,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyReading, setBusyReading] = useState(false);

  async function onFileChange(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".ics")) {
      setError("Please choose a .ics calendar file.");
      return;
    }
    setBusyReading(true);
    try {
      const text = await file.text();
      const { startMs, endMs } = icsHorizonMs(now);
      let parsed: BusyBlock[];
      try {
        parsed = parseIcsToBusyBlocks(text, startMs, endMs);
      } catch {
        setError(
          `We couldn't read ${file.name}. Make sure it's a valid .ics file.`,
        );
        setBusyReading(false);
        return;
      }
      if (parsed.length === 0) {
        setError(
          `${file.name} had no timed busy events in the next week. All-day and free events are skipped.`,
        );
        setBusyReading(false);
        return;
      }
      setFileName(file.name);
      onBusyLoaded(busyBlocksToForm(parsed, "ics"), file.name);
    } catch {
      setError("Something went wrong reading that file. Try again.");
    } finally {
      setBusyReading(false);
    }
  }

  return (
    <fieldset className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <legend className="float-left w-full">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold text-primary">
            02
          </span>
          <span className="text-xl font-semibold tracking-tight text-ink">
            When are you busy?
          </span>
        </span>
      </legend>
      <p className="clear-both mt-1 text-sm text-secondary">
        Upload a calendar file so options land when you can do them. Must be a{" "}
        <strong className="font-semibold text-ink">.ics</strong> file. Your
        calendar stays in this browser tab and is never uploaded to our servers.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".ics,text/calendar"
          className="sr-only"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={busyReading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {busyReading ? "Reading…" : "Upload .ics calendar"}
        </button>
        {fileName ? (
          <button
            type="button"
            onClick={() => {
              setFileName(null);
              setError(null);
              if (inputRef.current) inputRef.current.value = "";
              onClear();
            }}
            className="text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Clear {fileName}
          </button>
        ) : (
          <span className={HINT_CLASS}>Accepts .ics only</span>
        )}
      </div>

      {error ? (
        <p role="alert" className={`mt-3 ${ERROR_CLASS}`}>
          {error}
        </p>
      ) : null}

      {blocks.length > 0 ? (
        <ul className="mt-4 space-y-0 overflow-hidden rounded-[var(--radius-input)] border border-border bg-chip/50">
          {blocks.map((b) => (
            <li
              key={b.key}
              className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 w-1 shrink-0 self-stretch rounded-full bg-busy"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {b.title ?? "Busy"}
                  </p>
                  <p className={`mt-0.5 ${HINT_CLASS}`}>
                    {b.startLocal.replace("T", " · ")} →{" "}
                    {b.endLocal.replace("T", " · ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(b.key)}
                aria-label={`Remove ${b.title ?? "busy block"}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-[var(--radius-button)] border border-dashed border-border px-4 py-3 text-sm text-muted">
          No calendar loaded yet. Choose a <strong>.ics</strong> file to
          continue.
        </p>
      )}
    </fieldset>
  );
}

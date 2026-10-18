"use client";

import type { ChangeEvent } from "react";
import {
  errorKey,
  type BusyFormBlock,
  type PlannerErrors,
} from "./plannerModel";
import {
  CHECKBOX_CLASS,
  ERROR_CLASS,
  FOCUS_RING,
  HINT_CLASS,
  INPUT_CLASS,
  INPUT_ERROR,
  INPUT_OK,
  LABEL_CLASS,
  SECONDARY_BUTTON,
} from "./plannerStyles";

type Patch = Partial<Pick<BusyFormBlock, "startLocal" | "endLocal" | "asleep">>;

type Props = {
  baseId: string;
  blocks: BusyFormBlock[];
  errors: PlannerErrors;
  importNotice: string | null;
  importError: string | null;
  onLoadDemo: () => void;
  onImportFile: (file: File) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onChange: (key: string, patch: Patch) => void;
};

export default function BusyBlockFields({
  baseId,
  blocks,
  errors,
  importNotice,
  importError,
  onLoadDemo,
  onImportFile,
  onAdd,
  onRemove,
  onChange,
}: Props) {
  const asleepCount = blocks.filter((b) => b.asleep).length;
  const importId = `${baseId}-import`;

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onImportFile(file);
  }

  // Demo / add-manual stay available to PlannerForm but are not shown — step 02 is .ics only.
  void onLoadDemo;
  void onAdd;

  return (
    <fieldset className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <legend className="float-left w-full">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold text-primary">02</span>
          <span className="text-xl font-semibold tracking-tight text-ink">
            When are you busy?
          </span>
        </span>
      </legend>
      <p className={`clear-both mt-1 text-sm text-secondary`}>
        Upload a calendar file so options land when you can do them. Must be a{" "}
        <strong className="font-semibold text-ink">.ics</strong> file. Your
        calendar stays in this browser tab and is never uploaded to our servers.
      </p>

      <div className="mt-5 flex min-w-0 flex-wrap items-center gap-3">
        <label
          htmlFor={importId}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover ${FOCUS_RING}`}
        >
          Upload .ics calendar
          <input
            id={importId}
            type="file"
            accept=".ics,text/calendar"
            onChange={onFile}
            className="sr-only"
          />
        </label>
        <span className={HINT_CLASS}>Accepts .ics only</span>
      </div>
      {importNotice && (
        <p role="status" className="mt-3 text-sm text-secondary">
          {importNotice}
        </p>
      )}
      {importError && (
        <p role="alert" className={ERROR_CLASS}>
          {importError}
        </p>
      )}

      {blocks.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-button)] border border-dashed border-border px-4 py-3 text-sm text-muted">
          No calendar loaded yet. Choose a <strong>.ics</strong> file to
          continue.
        </p>
      ) : (
        <>
          <p className={`mt-3 ${HINT_CLASS}`} aria-live="polite">
            {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
            {asleepCount > 0 && ` · ${asleepCount} asleep`}
          </p>
          <ul className="mt-2 space-y-2">
            {blocks.map((b, index) => {
              const startId = `${baseId}-busy-${b.key}-start`;
              const endId = `${baseId}-busy-${b.key}-end`;
              const asleepId = `${baseId}-busy-${b.key}-asleep`;
              const startError = errors[errorKey.busyStart(b.key)];
              const endError = errors[errorKey.busyEnd(b.key)];
              const name = b.title ?? `Busy block ${index + 1}`;

              return (
                <li
                  key={b.key}
                  className={`rounded-[var(--radius-card)] border p-3 ${
                    b.asleep
                      ? "border-sleep bg-sleep"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium">
                      <span className="break-words">{name}</span>
                      {b.asleep && (
                        <span className="ml-2 inline-block rounded bg-sleep px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                          Asleep
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemove(b.key)}
                      aria-label={`Remove ${name}`}
                      className={`${SECONDARY_BUTTON} -mt-1 -mr-1 shrink-0 px-3`}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={startId} className={LABEL_CLASS}>
                        Starts
                      </label>
                      <input
                        id={startId}
                        type="datetime-local"
                        value={b.startLocal}
                        onChange={(e) =>
                          onChange(b.key, { startLocal: e.target.value })
                        }
                        aria-invalid={startError ? true : undefined}
                        aria-describedby={
                          startError ? `${startId}-error` : undefined
                        }
                        className={`mt-1 ${INPUT_CLASS} ${startError ? INPUT_ERROR : INPUT_OK}`}
                      />
                      {startError && (
                        <p id={`${startId}-error`} className={ERROR_CLASS}>
                          {startError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={endId} className={LABEL_CLASS}>
                        Ends
                      </label>
                      <input
                        id={endId}
                        type="datetime-local"
                        value={b.endLocal}
                        onChange={(e) =>
                          onChange(b.key, { endLocal: e.target.value })
                        }
                        aria-invalid={endError ? true : undefined}
                        aria-describedby={
                          endError ? `${endId}-error` : undefined
                        }
                        className={`mt-1 ${INPUT_CLASS} ${endError ? INPUT_ERROR : INPUT_OK}`}
                      />
                      {endError && (
                        <p id={`${endId}-error`} className={ERROR_CLASS}>
                          {endError}
                        </p>
                      )}
                    </div>
                  </div>

                  <label
                    htmlFor={asleepId}
                    className="mt-1 flex min-h-11 cursor-pointer items-center gap-3"
                  >
                    <input
                      id={asleepId}
                      type="checkbox"
                      checked={b.asleep}
                      onChange={(e) =>
                        onChange(b.key, { asleep: e.target.checked })
                      }
                      className={CHECKBOX_CLASS}
                    />
                    <span className="text-sm">
                      <span className="font-medium">I&apos;m asleep</span>
                      <span className={`block ${HINT_CLASS}`}>
                        Runs can continue while you sleep; loading can&apos;t.
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </fieldset>
  );
}

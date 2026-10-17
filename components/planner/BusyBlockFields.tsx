"use client";

import { errorKey, type BusyFormBlock, type PlannerErrors } from "./plannerModel";
import {
  CHECKBOX_CLASS,
  ERROR_CLASS,
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
  onLoadDemo: () => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onChange: (key: string, patch: Patch) => void;
};

export default function BusyBlockFields({ baseId, blocks, errors, onLoadDemo, onAdd, onRemove, onChange }: Props) {
  const asleepCount = blocks.filter((b) => b.asleep).length;

  return (
    <fieldset>
      <legend className="text-base font-semibold">When are you busy?</legend>
      <p className={`mt-1 ${HINT_CLASS}`}>
        Add the times you can&apos;t load or unload, and mark the ones you&apos;re asleep. Times are Eastern. Your
        schedule stays in this tab and is never uploaded.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onLoadDemo} className={SECONDARY_BUTTON}>
          {blocks.length > 0 ? "Reload demo schedule" : "Use demo schedule"}
        </button>
        <button type="button" onClick={onAdd} className={SECONDARY_BUTTON}>
          Add busy block
        </button>
      </div>

      {blocks.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No busy blocks yet. Without any, every hour before the deadline counts as free.
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
                  className={`rounded-xl border p-3 ${
                    b.asleep
                      ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium">
                      <span className="break-words">{name}</span>
                      {b.asleep && (
                        <span className="ml-2 inline-block rounded bg-indigo-700 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-indigo-300 dark:text-zinc-950">
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
                        onChange={(e) => onChange(b.key, { startLocal: e.target.value })}
                        aria-invalid={startError ? true : undefined}
                        aria-describedby={startError ? `${startId}-error` : undefined}
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
                        onChange={(e) => onChange(b.key, { endLocal: e.target.value })}
                        aria-invalid={endError ? true : undefined}
                        aria-describedby={endError ? `${endId}-error` : undefined}
                        className={`mt-1 ${INPUT_CLASS} ${endError ? INPUT_ERROR : INPUT_OK}`}
                      />
                      {endError && (
                        <p id={`${endId}-error`} className={ERROR_CLASS}>
                          {endError}
                        </p>
                      )}
                    </div>
                  </div>

                  <label htmlFor={asleepId} className="mt-1 flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      id={asleepId}
                      type="checkbox"
                      checked={b.asleep}
                      onChange={(e) => onChange(b.key, { asleep: e.target.checked })}
                      className={CHECKBOX_CLASS}
                    />
                    <span className="text-sm">
                      <span className="font-medium">I&apos;m asleep</span>
                      <span className={`block ${HINT_CLASS}`}>Runs can continue while you sleep; loading can&apos;t.</span>
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

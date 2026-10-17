"use client";

import type { ActivityId } from "@/lib/types";
import { activityDisplayName } from "@/components/schedule-grid/overlays";
import ActivityIcon from "./activityIcons";
import {
  errorKey,
  type ActivityFormState,
  type PlannerErrors,
} from "./plannerModel";
import { CHECKBOX_CLASS, ERROR_CLASS } from "./plannerStyles";

type Patch = Partial<
  Pick<
    ActivityFormState,
    "selected" | "durationMin" | "energyKwh" | "delayStart"
  >
>;

type Props = {
  baseId: string;
  items: ActivityFormState[];
  errors: PlannerErrors;
  onChange: (id: ActivityId, patch: Patch) => void;
};

function formatDuration(min: number): string {
  if (min % 60 === 0) return `${min / 60} hr`;
  if (min > 60) return `${Math.floor(min / 60)} hr ${min % 60} min`;
  return `${min} min`;
}

export default function ActivityFields({
  baseId,
  items,
  errors,
  onChange,
}: Props) {
  const groupError = errors[errorKey.activities];
  const groupErrorId = `${baseId}-activities-error`;

  return (
    <fieldset
      aria-describedby={groupError ? groupErrorId : undefined}
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
    >
      <legend className="float-left w-full">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold text-primary">
            01
          </span>
          <span className="text-xl font-semibold tracking-tight text-ink">
            What do you need to run?
          </span>
        </span>
      </legend>
      <p className="clear-both mt-1 text-sm text-secondary">
        Pick one or more.
      </p>
      {groupError && (
        <p id={groupErrorId} role="alert" className={ERROR_CLASS}>
          {groupError}
        </p>
      )}

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const { activity } = item;
          const id = activity.id;
          const checkboxId = `${baseId}-act-${id}`;
          const delayId = `${baseId}-delay-${id}`;
          const selected = item.selected;
          const isWide = id === "laptop";
          const duration = Number(item.durationMin) || activity.defaultDurationMin;

          return (
            <li
              key={id}
              className={`relative ${isWide ? "sm:col-span-2" : ""}`}
            >
              <label
                htmlFor={checkboxId}
                className={`flex min-h-11 cursor-pointer flex-col gap-2 rounded-[var(--radius-card)] border p-4 transition-colors ${
                  selected
                    ? "border-primary bg-primary-tint/40"
                    : "border-border bg-surface hover:border-primary/40"
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-start gap-3">
                    <ActivityIcon id={id} />
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-ink">
                        {activityDisplayName(id)}
                      </span>
                      <span className="mt-0.5 block text-sm text-secondary">
                        {formatDuration(duration)}
                      </span>
                    </span>
                  </span>
                  <span className="relative shrink-0">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={selected}
                      onChange={(e) =>
                        onChange(id, { selected: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={`flex size-6 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-input bg-surface"
                      }`}
                    >
                      {selected ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2.5 6.2 4.8 8.5 9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </span>
                  </span>
                </span>

              </label>
              {selected && activity.supportsDelayStart ? (
                <div className="mt-2 flex items-center gap-2 px-1 text-sm text-secondary">
                  <input
                    id={delayId}
                    type="checkbox"
                    checked={item.delayStart}
                    onChange={(e) =>
                      onChange(id, { delayStart: e.target.checked })
                    }
                    className={CHECKBOX_CLASS}
                  />
                  <label htmlFor={delayId} className="cursor-pointer">
                    Has delay-start (can run while you sleep)
                  </label>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

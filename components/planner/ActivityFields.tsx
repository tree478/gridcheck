"use client";

import { SLOT_MINUTES } from "@/lib/constants";
import type { ActivityId } from "@/lib/types";
import { activityDisplayName } from "@/components/schedule-grid/overlays";
import {
  errorKey,
  type ActivityFormState,
  type PlannerErrors,
} from "./plannerModel";
import {
  CHECKBOX_CLASS,
  ERROR_CLASS,
  INPUT_CLASS,
  INPUT_ERROR,
  INPUT_OK,
} from "./plannerStyles";

const FIELD_LABEL = "block text-base font-medium text-ink";

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

export default function ActivityFields({
  baseId,
  items,
  errors,
  onChange,
}: Props) {
  const groupError = errors[errorKey.activities];
  const groupErrorId = `${baseId}-activities-error`;

  // Catalog still has EV + laptop; planner shows one "Device charging" (ev).
  const visibleItems = items.filter((item) => item.activity.id !== "laptop");

  return (
    <fieldset aria-describedby={groupError ? groupErrorId : undefined}>
      <legend className="text-xl font-semibold tracking-tight text-ink">
        What do you want to run?
      </legend>
      {groupError && (
        <p id={groupErrorId} role="alert" className={ERROR_CLASS}>
          {groupError}
        </p>
      )}

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {visibleItems.map((item) => {
          const { activity } = item;
          const id = activity.id;
          const checkboxId = `${baseId}-act-${id}`;
          const durationId = `${baseId}-dur-${id}`;
          const energyId = `${baseId}-kwh-${id}`;
          const delayId = `${baseId}-delay-${id}`;
          const durationError = errors[errorKey.duration(id)];
          const energyError = errors[errorKey.energy(id)];

          return (
            <li
              key={id}
              className={`rounded-[var(--radius-card)] border p-3 ${
                item.selected
                  ? "border-primary bg-primary-tint"
                  : "border-border bg-surface"
              }`}
            >
              <label
                htmlFor={checkboxId}
                className="flex min-h-11 cursor-pointer items-center gap-3"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => onChange(id, { selected: e.target.checked })}
                  className={CHECKBOX_CLASS}
                />
                <span className="min-w-0 text-lg font-semibold text-ink">
                  {activityDisplayName(id)}
                </span>
              </label>

              {item.selected && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={durationId} className={FIELD_LABEL}>
                      Duration (min)
                    </label>
                    <input
                      id={durationId}
                      type="number"
                      inputMode="numeric"
                      min={SLOT_MINUTES}
                      step={SLOT_MINUTES}
                      value={item.durationMin}
                      onChange={(e) =>
                        onChange(id, { durationMin: e.target.value })
                      }
                      aria-invalid={durationError ? true : undefined}
                      aria-describedby={
                        durationError ? `${durationId}-error` : undefined
                      }
                      className={`mt-1 ${INPUT_CLASS} ${durationError ? INPUT_ERROR : INPUT_OK}`}
                    />
                    {durationError && (
                      <p id={`${durationId}-error`} className={ERROR_CLASS}>
                        {durationError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={energyId} className={FIELD_LABEL}>
                      Energy (kWh)
                    </label>
                    <input
                      id={energyId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={item.energyKwh}
                      onChange={(e) =>
                        onChange(id, { energyKwh: e.target.value })
                      }
                      aria-invalid={energyError ? true : undefined}
                      aria-describedby={
                        energyError ? `${energyId}-error` : undefined
                      }
                      className={`mt-1 ${INPUT_CLASS} ${energyError ? INPUT_ERROR : INPUT_OK}`}
                    />
                    {energyError && (
                      <p id={`${energyId}-error`} className={ERROR_CLASS}>
                        {energyError}
                      </p>
                    )}
                  </div>

                  {activity.supportsDelayStart && (
                    <label
                      htmlFor={delayId}
                      className="col-span-2 flex min-h-11 cursor-pointer items-center gap-3"
                    >
                      <input
                        id={delayId}
                        type="checkbox"
                        checked={item.delayStart}
                        onChange={(e) =>
                          onChange(id, { delayStart: e.target.checked })
                        }
                        className={CHECKBOX_CLASS}
                      />
                      <span className="text-base font-medium">
                        Use delay-start
                      </span>
                    </label>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

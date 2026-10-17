"use client";

import { SLOT_MINUTES } from "@/lib/constants";
import type { ActivityId, AttentionType } from "@/lib/types";
import { errorKey, type ActivityFormState, type PlannerErrors } from "./plannerModel";
import {
  CHECKBOX_CLASS,
  ERROR_CLASS,
  HINT_CLASS,
  INPUT_CLASS,
  INPUT_ERROR,
  INPUT_OK,
  LABEL_CLASS,
} from "./plannerStyles";

const ATTENTION_TEXT: Record<AttentionType, string> = {
  start: "You're needed at the start",
  startEnd: "You're needed at the start and the end",
  throughout: "You're needed the whole time",
};

type Patch = Partial<Pick<ActivityFormState, "selected" | "durationMin" | "energyKwh" | "delayStart">>;

type Props = {
  baseId: string;
  items: ActivityFormState[];
  errors: PlannerErrors;
  onChange: (id: ActivityId, patch: Patch) => void;
};

export default function ActivityFields({ baseId, items, errors, onChange }: Props) {
  const groupError = errors[errorKey.activities];
  const groupErrorId = `${baseId}-activities-error`;

  return (
    <fieldset aria-describedby={groupError ? groupErrorId : undefined}>
      <legend className="text-base font-semibold">What do you want to run?</legend>
      <p className={`mt-1 ${HINT_CLASS}`}>
        Pick one or more. Defaults come from typical appliance values; edit them to match yours. Energy is per cycle,
        in kWh.
      </p>
      {groupError && (
        <p id={groupErrorId} role="alert" className={ERROR_CLASS}>
          {groupError}
        </p>
      )}

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
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
              className={`rounded-xl border p-3 ${
                item.selected
                  ? "border-emerald-600 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/30"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <label htmlFor={checkboxId} className="flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => onChange(id, { selected: e.target.checked })}
                  className={`mt-1 ${CHECKBOX_CLASS}`}
                />
                <span className="min-w-0">
                  <span className="block font-medium">{activity.name}</span>
                  <span className={`block ${HINT_CLASS}`}>
                    {activity.defaultDurationMin} min · {activity.defaultEnergyKwh} kWh · {ATTENTION_TEXT[activity.attention]}
                  </span>
                </span>
              </label>

              {item.selected && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={durationId} className={LABEL_CLASS}>
                      Duration (min)
                    </label>
                    <input
                      id={durationId}
                      type="number"
                      inputMode="numeric"
                      min={SLOT_MINUTES}
                      step={SLOT_MINUTES}
                      value={item.durationMin}
                      onChange={(e) => onChange(id, { durationMin: e.target.value })}
                      aria-invalid={durationError ? true : undefined}
                      aria-describedby={durationError ? `${durationId}-error` : undefined}
                      className={`mt-1 ${INPUT_CLASS} ${durationError ? INPUT_ERROR : INPUT_OK}`}
                    />
                    {durationError && (
                      <p id={`${durationId}-error`} className={ERROR_CLASS}>
                        {durationError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={energyId} className={LABEL_CLASS}>
                      Energy (kWh)
                    </label>
                    <input
                      id={energyId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={item.energyKwh}
                      onChange={(e) => onChange(id, { energyKwh: e.target.value })}
                      aria-invalid={energyError ? true : undefined}
                      aria-describedby={energyError ? `${energyId}-error` : undefined}
                      className={`mt-1 ${INPUT_CLASS} ${energyError ? INPUT_ERROR : INPUT_OK}`}
                    />
                    {energyError && (
                      <p id={`${energyId}-error`} className={ERROR_CLASS}>
                        {energyError}
                      </p>
                    )}
                  </div>

                  {activity.supportsDelayStart && (
                    <label htmlFor={delayId} className="col-span-2 flex min-h-11 cursor-pointer items-center gap-3">
                      <input
                        id={delayId}
                        type="checkbox"
                        checked={item.delayStart}
                        onChange={(e) => onChange(id, { delayStart: e.target.checked })}
                        className={CHECKBOX_CLASS}
                      />
                      <span className="text-sm">
                        <span className="font-medium">Use delay-start</span>
                        <span className={`block ${HINT_CLASS}`}>
                          Load it when you&apos;re free; the appliance starts itself later.
                        </span>
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

import type { Activity, ScheduleOption } from "@/lib/types";
import {
  ACCENT_BUTTON,
  HINT_CLASS,
  PRIMARY_BUTTON,
} from "@/components/planner/plannerStyles";
import {
  attentionLines,
  cardTitle,
  cardTone,
  confidenceLabel,
  formatWeekday,
  modeledGramsLine,
  savingsLine,
} from "./optionCardModel";
import {
  activityDisplayName,
  formatClock,
} from "@/components/schedule-grid/overlays";

const TONE_SHELL = {
  recommended: "border-l-4 border-l-scale-dirty bg-scale-dirty/10",
  greenest: "border-l-4 border-l-primary bg-primary-tint",
  soonest: "border-l-4 border-l-primary/40 bg-transparent",
  alternative: "border-l-4 border-l-border bg-transparent",
};

const TITLE_CLASS = {
  recommended: "text-2xl font-bold text-scale-dirty",
  greenest: "text-lg font-semibold text-primary",
  soonest: "text-lg font-semibold text-primary",
  alternative: "text-base font-medium text-secondary",
};

const CONFIDENCE_CLASS = {
  pattern: "border-dashed border-primary/40 text-primary",
  forecast: "border-solid border-scale-dirty text-scale-dirty",
  measured: "border-solid border-primary text-primary",
};

type Props = {
  activity: Activity;
  option: ScheduleOption;
  onChoose: () => void;
};

export default function OptionCard({ activity, option, onChoose }: Props) {
  const tone = cardTone(option.labels);
  const title = cardTitle(option.labels);
  const weekday = formatWeekday(option.start);
  const confidence = confidenceLabel(option.confidence);
  const isRecommended = tone === "recommended";

  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-[var(--radius-button)] border border-border p-4 ${TONE_SHELL[tone]} ${
        isRecommended ? "p-5 sm:p-6" : "opacity-90"
      }`}
    >
      <h4 className={`leading-snug ${TITLE_CLASS[tone]}`}>{title}</h4>

      <p
        className={`mt-2 text-secondary ${
          isRecommended ? "text-base font-medium" : "text-sm"
        }`}
      >
        <span className="sr-only">Time window </span>
        {weekday}{" "}
        <time dateTime={option.start}>{formatClock(option.start)}</time>–
        <time dateTime={option.end}>{formatClock(option.end)}</time>
      </p>

      <p
        className={`mt-2 text-secondary ${
          isRecommended ? "text-lg font-semibold tabular-nums" : "text-sm"
        }`}
      >
        {modeledGramsLine(option.modeledGrams)}
      </p>
      <p
        className={`mt-1 ${isRecommended ? "text-sm text-secondary" : HINT_CLASS}`}
      >
        {savingsLine(option)}
      </p>

      <p className="mt-3">
        <span className="sr-only">Confidence </span>
        <span
          className={`inline-flex min-h-8 items-center rounded border px-2.5 py-1 text-xs font-medium ${CONFIDENCE_CLASS[option.confidence]}`}
        >
          {confidence}
        </span>
      </p>

      <ul className={`mt-3 space-y-1 ${HINT_CLASS}`}>
        {attentionLines(activity).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2 sm:mt-auto sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onChoose}
          className={isRecommended ? ACCENT_BUTTON : PRIMARY_BUTTON}
        >
          Choose {activityDisplayName(activity.id)}
        </button>
      </div>
    </article>
  );
}

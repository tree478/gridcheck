import type { Activity, ScheduleOption } from "@/lib/types";
import { HINT_CLASS, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/planner/plannerStyles";
import {
  CALENDAR_PLACEHOLDER,
  attentionLines,
  cardTitle,
  cardTone,
  confidenceLabel,
  formatWeekday,
  modeledGramsLine,
  savingsLine,
} from "./optionCardModel";
import { formatClock } from "@/components/schedule-grid/overlays";

const TONE_CLASS = {
  recommended: "border-emerald-700 dark:border-emerald-400",
  greenest: "border-teal-700 dark:border-teal-400",
  soonest: "border-sky-700 dark:border-sky-400",
  alternative: "border-zinc-300 dark:border-zinc-600",
};

const TITLE_CLASS = {
  recommended: "text-emerald-800 dark:text-emerald-300",
  greenest: "text-teal-800 dark:text-teal-300",
  soonest: "text-sky-800 dark:text-sky-300",
  alternative: "text-zinc-800 dark:text-zinc-200",
};

const CONFIDENCE_CLASS = {
  pattern: "border-dashed border-zinc-500 text-zinc-800 dark:border-zinc-400 dark:text-zinc-200",
  forecast: "border-solid border-sky-700 text-sky-900 dark:border-sky-400 dark:text-sky-200",
  measured: "border-solid border-emerald-700 text-emerald-900 dark:border-emerald-400 dark:text-emerald-200",
};

type Props = {
  activity: Activity;
  option: ScheduleOption;
  onChoose: () => void;
  calendarHintId: string;
};

export default function OptionCard({ activity, option, onChoose, calendarHintId }: Props) {
  const tone = cardTone(option.labels);
  const title = cardTitle(option.labels);
  const weekday = formatWeekday(option.start);
  const confidence = confidenceLabel(option.confidence);

  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-xl border-2 bg-white p-4 dark:bg-zinc-950 ${TONE_CLASS[tone]}`}
    >
      <h4 className={`text-lg font-semibold leading-snug ${TITLE_CLASS[tone]}`}>{title}</h4>

      <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
        <span className="sr-only">Time window </span>
        {weekday}{" "}
        <time dateTime={option.start}>{formatClock(option.start)}</time>
        –
        <time dateTime={option.end}>{formatClock(option.end)}</time>
      </p>

      <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">{modeledGramsLine(option.modeledGrams)}</p>
      <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{savingsLine(option)}</p>

      <p className="mt-3">
        <span className="sr-only">Confidence </span>
        <span
          className={`inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-xs font-medium ${CONFIDENCE_CLASS[option.confidence]}`}
        >
          {confidence}
        </span>
      </p>

      <ul className={`mt-3 space-y-1 ${HINT_CLASS}`}>
        {attentionLines(activity, option).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2 sm:mt-auto sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled
          aria-describedby={calendarHintId}
          title={CALENDAR_PLACEHOLDER}
          className={`${SECONDARY_BUTTON} w-full cursor-not-allowed opacity-70 sm:w-auto`}
        >
          Add to calendar
          <span className="sr-only">. {CALENDAR_PLACEHOLDER}</span>
        </button>
        <button type="button" onClick={onChoose} className={PRIMARY_BUTTON}>
          Choose {activity.name}
        </button>
      </div>
    </article>
  );
}

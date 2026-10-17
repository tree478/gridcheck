import type { ActivityResult, ScheduleOption } from "@/lib/types";
import OptionCard from "./OptionCard";
import {
  activityById,
  activityName,
  chosenSummary,
  noWindowDetails,
  visibleOptions,
} from "./optionCardModel";

type Props = {
  result: ActivityResult;
  chosen: ScheduleOption | null;
  onChoose: (option: ScheduleOption) => void;
  calendarHintId: string;
};

export default function OptionCards({ result, chosen, onChoose, calendarHintId }: Props) {
  const name = activityName(result.activityId);
  const headingId = `${result.activityId}-options-heading`;

  if (!result.ok) {
    const details = noWindowDetails(result);
    return (
      <section aria-labelledby={headingId} className="min-w-0">
        <h3 id={headingId} className="text-xl font-semibold">
          {name}
        </h3>
        <p className="mt-2 text-zinc-800 dark:text-zinc-200">{details?.reason}</p>
        {details?.suggestion ? (
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">{details.suggestion}</p>
        ) : null}
      </section>
    );
  }

  if (chosen) {
    return (
      <section aria-labelledby={headingId} className="min-w-0">
        <h3 id={headingId} className="text-xl font-semibold">
          {name}
        </h3>
        <p role="status" className="mt-2 rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-3 text-sm text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100">
          {chosenSummary(name, chosen)}
        </p>
      </section>
    );
  }

  const activity = activityById(result.activityId);
  const options = visibleOptions(result.options);

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h3 id={headingId} className="text-xl font-semibold">
        {name}
      </h3>
      {activity && options.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <li
              key={`${option.start}-${option.end}-${option.labels.join("-")}`}
              className="min-w-0"
            >
              <OptionCard
                activity={activity}
                option={option}
                onChoose={() => onChoose(option)}
                calendarHintId={calendarHintId}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">No choosable times for this activity.</p>
      )}
    </section>
  );
}

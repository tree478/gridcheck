import type { ActivityResult, ScheduleOption } from "@/lib/types";
import OptionCard from "./OptionCard";
import {
  activityById,
  activityName,
  cardTone,
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

export default function OptionCards({
  result,
  chosen,
  onChoose,
  calendarHintId,
}: Props) {
  const name = activityName(result.activityId);
  const headingId = `${result.activityId}-options-heading`;

  if (!result.ok) {
    const details = noWindowDetails(result);
    return (
      <section aria-labelledby={headingId} className="min-w-0">
        <h3 id={headingId} className="text-xl font-semibold text-ink">
          {name}
        </h3>
        <p className="mt-2 text-secondary">{details?.reason}</p>
        {details?.suggestion ? (
          <p className="mt-2 text-muted">{details.suggestion}</p>
        ) : null}
      </section>
    );
  }

  if (chosen) {
    return (
      <section aria-labelledby={headingId} className="min-w-0">
        <h3 id={headingId} className="text-xl font-semibold text-ink">
          {name}
        </h3>
        <p
          role="status"
          className="mt-3 border-l-4 border-l-primary bg-primary-tint px-4 py-3 text-sm text-callout"
        >
          {chosenSummary(name, chosen)}
        </p>
      </section>
    );
  }

  const activity = activityById(result.activityId);
  const options = visibleOptions(result.options);
  const ordered = [...options].sort((a, b) => {
    const aRec = cardTone(a.labels) === "recommended" ? 0 : 1;
    const bRec = cardTone(b.labels) === "recommended" ? 0 : 1;
    return aRec - bRec;
  });

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h3 id={headingId} className="text-xl font-semibold text-ink">
        {name}
      </h3>
      {activity && ordered.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ordered.map((option) => {
            const recommended = cardTone(option.labels) === "recommended";
            return (
              <li
                key={`${option.start}-${option.end}-${option.labels.join("-")}`}
                className={`min-w-0 ${recommended ? "sm:col-span-2" : ""}`}
              >
                <OptionCard
                  activity={activity}
                  option={option}
                  onChoose={() => onChoose(option)}
                  calendarHintId={calendarHintId}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-muted">No choosable times for this activity.</p>
      )}
    </section>
  );
}

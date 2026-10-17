// Shared Tailwind class strings for the planner form. Same palette and focus ring as ScheduleGrid.

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const INPUT_CLASS = `block min-h-11 w-full rounded-[var(--radius-input)] border border-input bg-surface px-3 py-2 text-base text-ink placeholder:text-muted ${FOCUS_RING}`;

export const INPUT_OK = "border-input";
export const INPUT_ERROR = "border-error";

export const CHECKBOX_CLASS = `h-5 w-5 shrink-0 rounded border-input accent-primary ${FOCUS_RING}`;

export const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-ink bg-surface px-4 text-btn font-bold text-ink hover:bg-chip ${FOCUS_RING}`;

export const PRIMARY_BUTTON = `inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-button)] bg-primary px-5 text-btn font-bold text-white hover:bg-primary-hover sm:w-auto ${FOCUS_RING}`;

export const LABEL_CLASS = "block text-sm font-medium text-ink";
export const HINT_CLASS = "text-xs text-muted";
export const ERROR_CLASS = "mt-1 text-sm text-error";

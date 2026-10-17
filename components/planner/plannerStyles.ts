// Shared Tailwind class strings for the planner form. Same palette and focus ring as ScheduleGrid.

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:focus-visible:outline-emerald-400";

export const INPUT_CLASS =
  `block min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 dark:bg-zinc-950 dark:text-zinc-50 ${FOCUS_RING}`;

export const INPUT_OK = "border-zinc-300 dark:border-zinc-700";
export const INPUT_ERROR = "border-red-600 dark:border-red-400";

export const CHECKBOX_CLASS = `h-5 w-5 shrink-0 rounded border-zinc-400 accent-emerald-700 dark:accent-emerald-400 ${FOCUS_RING}`;

export const SECONDARY_BUTTON =
  `inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${FOCUS_RING}`;

export const PRIMARY_BUTTON =
  `inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-700 px-5 text-base font-semibold text-white hover:bg-emerald-800 sm:w-auto dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300 ${FOCUS_RING}`;

export const LABEL_CLASS = "block text-sm font-medium text-zinc-800 dark:text-zinc-200";
export const HINT_CLASS = "text-xs text-zinc-600 dark:text-zinc-400";
export const ERROR_CLASS = "mt-1 text-sm text-red-700 dark:text-red-300";

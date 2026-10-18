"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import { setSessionUsername } from "@/components/auth/sessionStore";
import {
  mockLogin,
  defaultLoginState,
  validateLogin,
  type LoginFormState,
} from "./loginModel";
import {
  ERROR_CLASS,
  FOCUS_RING,
  HINT_CLASS,
  INPUT_CLASS,
  INPUT_ERROR,
  INPUT_OK,
  LABEL_CLASS,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from "../planner/plannerStyles";

const WRONG_MESSAGE =
  "That username or password does not match a profile on this device.";

export default function LoginForm() {
  const router = useRouter();
  const baseId = useId();
  const [state, setState] = useState<LoginFormState>(defaultLoginState);
  const [attempted, setAttempted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const fieldErrors = useMemo(
    () => (attempted ? validateLogin(state) : {}),
    [attempted, state],
  );
  const usernameError = wrong ? WRONG_MESSAGE : fieldErrors.username;
  const passwordError = fieldErrors.password;

  const usernameId = `${baseId}-username`;
  const passwordId = `${baseId}-password`;

  function patch(next: Partial<LoginFormState>) {
    const editingContent =
      next.username !== undefined || next.password !== undefined;
    if (editingContent) {
      setLoggedInUsername(null);
      setFailure(null);
    }
    if (next.username !== undefined) setWrong(false);
    setState((s) => ({ ...s, ...next }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setFailure(null);
    setWrong(false);
    setLoggedInUsername(null);
    try {
      const errors = validateLogin(state);
      if (Object.keys(errors).length > 0) return;
      const result = mockLogin(state.username);
      if (!result.ok) {
        setWrong(true);
        return;
      }
      setLoggedInUsername(result.username);
      setSessionUsername(result.username);
      // Mock login only — opens tracked schedules and emissions on Impact.
      router.push("/impact");
    } catch {
      setFailure(
        "Something went wrong. Please check the fields and try again.",
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Log in"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor={usernameId} className={LABEL_CLASS}>
            Username
          </label>
          <input
            id={usernameId}
            type="text"
            autoComplete="username"
            value={state.username}
            onChange={(e) => patch({ username: e.target.value })}
            aria-invalid={usernameError ? true : undefined}
            aria-describedby={usernameError ? `${usernameId}-error` : undefined}
            className={`mt-1 ${INPUT_CLASS} ${usernameError ? INPUT_ERROR : INPUT_OK}`}
          />
          {usernameError && (
            <p id={`${usernameId}-error`} role="alert" className={ERROR_CLASS}>
              {usernameError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={passwordId} className={LABEL_CLASS}>
            Password
          </label>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <input
              id={passwordId}
              type={state.showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={state.password}
              onChange={(e) => patch({ password: e.target.value })}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={
                passwordError ? `${passwordId}-error` : undefined
              }
              className={`min-w-0 flex-1 basis-40 ${INPUT_CLASS} ${passwordError ? INPUT_ERROR : INPUT_OK}`}
            />
            <button
              type="button"
              aria-pressed={state.showPassword}
              aria-controls={passwordId}
              onClick={() => patch({ showPassword: !state.showPassword })}
              className={SECONDARY_BUTTON}
            >
              {state.showPassword ? "Hide password" : "Show password"}
            </button>
          </div>
          {passwordError && (
            <p id={`${passwordId}-error`} role="alert" className={ERROR_CLASS}>
              {passwordError}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        {failure && (
          <p role="alert" className={`mb-3 ${ERROR_CLASS}`}>
            {failure}
          </p>
        )}

        <button type="submit" className={PRIMARY_BUTTON}>
          Log in
        </button>

        <p className="mt-3 text-sm text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className={`font-medium text-ink underline underline-offset-2 hover:text-primary ${FOCUS_RING}`}
          >
            Sign up
          </Link>
        </p>

        <div role="status" aria-live="polite">
          {loggedInUsername && (
            <div className="mt-4 rounded-[var(--radius-button)] border border-primary bg-primary-tint p-3 text-sm text-callout">
              <p className="font-semibold">{loggedInUsername}</p>
              <p className={`mt-1 ${HINT_CLASS}`}>
                This profile stays on this device. It is not a real account and
                is not real security. GridWait has no server login.
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

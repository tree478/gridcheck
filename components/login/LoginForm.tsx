"use client";

import Link from "next/link";
import { useId, useMemo, useState, type FormEvent } from "react";
import {
  mockLogin,
  mockResetProfile,
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
const RESET_MESSAGE =
  "Reset is a mock in this build. Nothing was deleted. Real reset lands when T-C8 exists.";

type ForgotStep = "hidden" | "explain" | "confirm";

export default function LoginForm() {
  const baseId = useId();
  const [state, setState] = useState<LoginFormState>(defaultLoginState);
  const [attempted, setAttempted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("hidden");
  const [resetDone, setResetDone] = useState(false);

  const fieldErrors = useMemo(
    () => (attempted ? validateLogin(state) : {}),
    [attempted, state],
  );
  const usernameError = wrong ? WRONG_MESSAGE : fieldErrors.username;
  const passwordError = fieldErrors.password;

  const usernameId = `${baseId}-username`;
  const passwordId = `${baseId}-password`;
  const forgotId = `${baseId}-forgot`;

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
    } catch {
      setFailure(
        "Something went wrong. Please check the fields and try again.",
      );
    }
  }

  function onConfirmReset() {
    const result = mockResetProfile();
    if (result.ok) {
      setResetDone(true);
      setForgotStep("explain");
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

        <p className="mt-3">
          <Link
            href="/signup"
            className={`inline-flex min-h-11 items-center text-sm font-medium text-secondary underline underline-offset-2 hover:text-ink ${FOCUS_RING}`}
          >
            Sign up
          </Link>
        </p>

        <div className="mt-4">
          <button
            type="button"
            aria-expanded={forgotStep !== "hidden"}
            aria-controls={forgotId}
            onClick={() =>
              setForgotStep((step) => (step === "hidden" ? "explain" : step))
            }
            className={`inline-flex min-h-11 items-center text-sm font-medium text-secondary underline underline-offset-2 hover:text-ink ${FOCUS_RING}`}
          >
            Forgot password?
          </button>

          {forgotStep !== "hidden" && (
            <div id={forgotId} className="mt-3 space-y-3">
              <p className={HINT_CLASS}>
                On-device profiles have no email reset and no server recovery.
                If you forget the password, you can only reset the profile on
                this device. That is not real security.
              </p>

              {forgotStep === "explain" && (
                <button
                  type="button"
                  onClick={() => setForgotStep("confirm")}
                  className={SECONDARY_BUTTON}
                >
                  Reset profile on this device
                </button>
              )}

              {forgotStep === "confirm" && (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onConfirmReset}
                    className={SECONDARY_BUTTON}
                  >
                    Yes, reset this profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotStep("explain")}
                    className={SECONDARY_BUTTON}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div role="status" aria-live="polite">
                {resetDone && (
                  <p className={`mt-1 ${HINT_CLASS}`}>{RESET_MESSAGE}</p>
                )}
              </div>
            </div>
          )}
        </div>

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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import { setSessionUsername } from "@/components/auth/sessionStore";
import {
  mockCreateProfile,
  defaultSignupState,
  validateSignup,
  type SignupFormState,
} from "./signupModel";
import {
  CHECKBOX_CLASS,
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

const TAKEN_MESSAGE = "That username is already on this device.";

export default function SignupForm() {
  const router = useRouter();
  const baseId = useId();
  const [state, setState] = useState<SignupFormState>(defaultSignupState);
  const [attempted, setAttempted] = useState(false);
  const [taken, setTaken] = useState(false);
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const fieldErrors = useMemo(
    () => (attempted ? validateSignup(state) : {}),
    [attempted, state],
  );
  const usernameError = taken ? TAKEN_MESSAGE : fieldErrors.username;
  const passwordError = fieldErrors.password;
  const termsError = fieldErrors.terms;

  const usernameId = `${baseId}-username`;
  const passwordId = `${baseId}-password`;
  const termsId = `${baseId}-terms`;

  function patch(next: Partial<SignupFormState>) {
    const editingContent =
      next.username !== undefined ||
      next.password !== undefined ||
      next.acceptedTerms !== undefined;
    if (editingContent) {
      setCreatedUsername(null);
      setFailure(null);
    }
    if (next.username !== undefined) setTaken(false);
    setState((s) => ({ ...s, ...next }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setFailure(null);
    setTaken(false);
    setCreatedUsername(null);
    try {
      const errors = validateSignup(state);
      if (Object.keys(errors).length > 0) return;
      const result = mockCreateProfile(state.username);
      if (!result.ok) {
        setTaken(true);
        return;
      }
      setCreatedUsername(result.username);
      setSessionUsername(result.username);
      // Mock signup only — terms already required; then open Impact.
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
      aria-label="Sign up"
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
              autoComplete="new-password"
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

        <div>
          <label
            htmlFor={termsId}
            className="flex min-h-11 cursor-pointer items-start gap-3"
          >
            <input
              id={termsId}
              type="checkbox"
              checked={state.acceptedTerms}
              onChange={(e) => patch({ acceptedTerms: e.target.checked })}
              aria-invalid={termsError ? true : undefined}
              aria-describedby={termsError ? `${termsId}-error` : undefined}
              className={`mt-1 ${CHECKBOX_CLASS}`}
            />
            <span className="text-sm text-secondary">
              I agree to the terms. I understand this profile stays on this
              device and is not real security.
            </span>
          </label>
          {termsError && (
            <p id={`${termsId}-error`} role="alert" className={ERROR_CLASS}>
              {termsError}
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
          Create profile
        </button>

        <p className="mt-3 text-sm text-secondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className={`font-medium text-ink underline underline-offset-2 hover:text-primary ${FOCUS_RING}`}
          >
            Log in
          </Link>
        </p>

        <div role="status" aria-live="polite">
          {createdUsername && (
            <div className="mt-4 rounded-[var(--radius-button)] border border-primary bg-primary-tint p-3 text-sm text-callout">
              <p className="font-semibold">{createdUsername}</p>
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

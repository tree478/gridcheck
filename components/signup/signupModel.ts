// Pure, framework-free helpers for the sign-up form (T-B7).
// Relative imports (not "@/") so Vitest can resolve them without an alias.
import type { Profile } from "../../lib/types";

export type SignupFormState = {
  username: string;
  password: string;
  showPassword: boolean;
  acceptedTerms: boolean;
};

/** Flat map of field key → message. */
export type SignupErrors = {
  username?: string;
  password?: string;
  terms?: string;
};

export const MOCK_EXISTING_USERNAMES: readonly Profile["username"][] = ["guest"];

export function defaultSignupState(): SignupFormState {
  return {
    username: "",
    password: "",
    showPassword: false,
    acceptedTerms: false,
  };
}

export function validateSignup(state: SignupFormState): SignupErrors {
  const errors: SignupErrors = {};
  if (state.username === "") {
    errors.username = "Enter a username.";
  }
  if (state.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  if (!state.acceptedTerms) {
    errors.terms = "Check the box to continue.";
  }
  return errors;
}

export type MockCreateResult =
  | { ok: true; username: Profile["username"] }
  | { ok: false; error: "taken" };

export function mockCreateProfile(
  username: Profile["username"],
  existingUsernames: readonly Profile["username"][] = MOCK_EXISTING_USERNAMES,
): MockCreateResult {
  if (existingUsernames.includes(username)) {
    return { ok: false, error: "taken" };
  }
  return { ok: true, username };
}

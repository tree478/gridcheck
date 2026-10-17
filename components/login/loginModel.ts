// Pure, framework-free helpers for the log-in form (T-B8).
// Relative imports (not "@/") so Vitest can resolve them without an alias.
import type { Profile } from "../../lib/types";

export type LoginFormState = {
  username: string;
  password: string;
  showPassword: boolean;
};

/** Flat map of field key → message. */
export type LoginErrors = {
  username?: string;
  password?: string;
};

export const MOCK_EXISTING_USERNAMES: readonly Profile["username"][] = [
  "guest",
];

export function defaultLoginState(): LoginFormState {
  return {
    username: "",
    password: "",
    showPassword: false,
  };
}

export function validateLogin(state: LoginFormState): LoginErrors {
  const errors: LoginErrors = {};
  if (state.username === "") {
    errors.username = "Enter a username.";
  }
  if (state.password === "") {
    errors.password = "Enter a password.";
  }
  return errors;
}

export type MockLoginResult =
  { ok: true; username: Profile["username"] } | { ok: false; error: "wrong" };

export function mockLogin(
  username: Profile["username"],
  existingUsernames: readonly Profile["username"][] = MOCK_EXISTING_USERNAMES,
): MockLoginResult {
  if (existingUsernames.includes(username)) {
    return { ok: true, username };
  }
  return { ok: false, error: "wrong" };
}

export function mockResetProfile(): { ok: true } {
  return { ok: true };
}

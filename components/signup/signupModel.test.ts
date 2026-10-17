import { describe, expect, it } from "vitest";
import {
  mockCreateProfile,
  validateSignup,
  type SignupFormState,
} from "./signupModel";

const valid: SignupFormState = {
  username: "alex",
  password: "12345678",
  showPassword: false,
  acceptedTerms: true,
};

describe("validateSignup", () => {
  it("passes a valid form", () => {
    expect(validateSignup(valid)).toEqual({});
  });

  it("flags an empty username", () => {
    expect(validateSignup({ ...valid, username: "" }).username).toBe("Enter a username.");
  });

  it("flags a 7-character password as weak and accepts 8 characters", () => {
    expect(validateSignup({ ...valid, password: "1234567" }).password).toBe(
      "Use at least 8 characters.",
    );
    expect(validateSignup({ ...valid, password: "12345678" }).password).toBeUndefined();
  });

  it("flags terms unchecked", () => {
    expect(validateSignup({ ...valid, acceptedTerms: false }).terms).toBe(
      "Check the box to continue.",
    );
  });
});

describe("mockCreateProfile", () => {
  it("returns taken for the seeded username guest", () => {
    expect(mockCreateProfile("guest")).toEqual({ ok: false, error: "taken" });
  });

  it("returns ok with the username and does not include a password", () => {
    const result = mockCreateProfile("alex");
    expect(result).toEqual({ ok: true, username: "alex" });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");
  });
});

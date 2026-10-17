import { describe, expect, it } from "vitest";
import {
  mockLogin,
  mockResetProfile,
  validateLogin,
  type LoginFormState,
} from "./loginModel";

const valid: LoginFormState = {
  username: "guest",
  password: "any-pass",
  showPassword: false,
};

describe("validateLogin", () => {
  it("passes a valid non-empty username and password", () => {
    expect(validateLogin(valid)).toEqual({});
  });

  it("flags an empty username", () => {
    expect(validateLogin({ ...valid, username: "" }).username).toBe("Enter a username.");
  });

  it("flags an empty password", () => {
    expect(validateLogin({ ...valid, password: "" }).password).toBe("Enter a password.");
  });

  it("allows a 7-character password on login", () => {
    expect(validateLogin({ ...valid, password: "1234567" }).password).toBeUndefined();
    expect(validateLogin({ ...valid, password: "1234567" })).toEqual({});
  });
});

describe("mockLogin", () => {
  it("returns ok for the seeded username guest", () => {
    expect(mockLogin("guest")).toEqual({ ok: true, username: "guest" });
  });

  it("returns wrong for an unknown username", () => {
    expect(mockLogin("alex")).toEqual({ ok: false, error: "wrong" });
  });

  it("ok result has no password, passwordHash, or salt", () => {
    const result = mockLogin("guest");
    expect(result).toEqual({ ok: true, username: "guest" });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("salt");
  });
});

describe("mockResetProfile", () => {
  it("returns ok and does not throw", () => {
    expect(() => mockResetProfile()).not.toThrow();
    expect(mockResetProfile()).toEqual({ ok: true });
  });
});

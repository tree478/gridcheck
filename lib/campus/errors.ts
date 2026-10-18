import type { CampusErrorCode } from "./types";

export class CampusError extends Error {
  readonly code: CampusErrorCode;
  readonly status: number;
  readonly upstreamStatus?: number;

  constructor(
    code: CampusErrorCode,
    message: string,
    status: number,
    upstreamStatus?: number,
  ) {
    super(message);
    this.name = "CampusError";
    this.code = code;
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

export function invalidRequest(message: string): CampusError {
  return new CampusError("invalid_request", message, 400);
}

import { connection } from "next/server";
import { MAX_REQUEST_BYTES } from "../../../../lib/campus/config";
import { CampusError } from "../../../../lib/campus/errors";
import { campusSceneStatus, visualizeCampus } from "../../../../lib/campus/visualize";

export const maxDuration = 60;

function jsonError(status: number, error: string, code: string) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  await connection();
  return Response.json(campusSceneStatus(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  await connection();
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    return jsonError(415, "Send a JSON body.", "invalid_request");
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return jsonError(400, "Request body must be JSON.", "invalid_request");
  }
  if (Buffer.byteLength(text) > MAX_REQUEST_BYTES) {
    return jsonError(413, "That request is too large.", "payload_too_large");
  }

  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    return jsonError(400, "Request body must be JSON.", "invalid_request");
  }

  try {
    const result = await visualizeCampus(body);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof CampusError) return jsonError(err.status, err.message, err.code);
    console.error(
      "POST /api/campus/visualize failed:",
      err instanceof Error ? err.name : "unknown error",
    );
    return jsonError(500, "Something went wrong while preparing that scene.", "internal");
  }
}

import { connection } from "next/server";
import { MAX_REQUEST_BYTES } from "../../../../lib/campus/config";
import { CampusError } from "../../../../lib/campus/errors";
import { assertCampusCredentials } from "../../../../lib/campus/imagine";
import { CAMPUS_SCENES } from "../../../../lib/campus/types";
import type { CampusScene, CampusSequenceEvent } from "../../../../lib/campus/types";
import {
  campusSceneStatus,
  classifyCampusPost,
  visualizeCampus,
  visualizeSequenceScene,
} from "../../../../lib/campus/visualize";

export const maxDuration = 180;

function jsonError(status: number, error: string, code: string) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

function errorEvent(err: unknown, scene: CampusScene): CampusSequenceEvent {
  if (err instanceof CampusError) {
    return { type: "error", error: err.message, code: err.code, scene };
  }
  console.error(
    "POST /api/campus/visualize sequence failed:",
    err instanceof Error ? err.name : "unknown error",
  );
  return {
    type: "error",
    error: "Something went wrong while preparing that scene.",
    code: "internal",
    scene,
  };
}

function sequenceResponse(request: Request): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CampusSequenceEvent) => {
        if (request.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        for (const scene of CAMPUS_SCENES) {
          if (request.signal.aborted) break;
          try {
            const result = await visualizeSequenceScene(scene);
            send({ type: "scene", scene: result });
          } catch (err) {
            send(errorEvent(err, scene));
            break;
          }
        }
      } catch (err) {
        console.error(
          "POST /api/campus/visualize sequence failed:",
          err instanceof Error ? err.name : "unknown error",
        );
      } finally {
        try {
          controller.close();
        } catch {
          // The client already hung up.
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
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

  let kind: "sequence" | "scene";
  try {
    kind = classifyCampusPost(body);
  } catch (err) {
    if (err instanceof CampusError) return jsonError(err.status, err.message, err.code);
    console.error(
      "POST /api/campus/visualize failed:",
      err instanceof Error ? err.name : "unknown error",
    );
    return jsonError(500, "Something went wrong while preparing that scene.", "internal");
  }

  if (kind === "sequence") {
    try {
      assertCampusCredentials();
    } catch (err) {
      if (err instanceof CampusError) return jsonError(err.status, err.message, err.code);
      console.error(
        "POST /api/campus/visualize failed:",
        err instanceof Error ? err.name : "unknown error",
      );
      return jsonError(500, "Something went wrong while preparing that scene.", "internal");
    }
    return sequenceResponse(request);
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

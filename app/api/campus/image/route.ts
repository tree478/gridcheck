import { connection } from "next/server";
import { readScene } from "../../../../lib/campus/cache";
import { isCampusScene } from "../../../../lib/campus/scenes";

export async function GET(request: Request) {
  await connection();
  let scene: string | null;
  try {
    scene = new URL(request.url).searchParams.get("scene");
  } catch {
    return Response.json(
      { error: "Scene must be normal, revealed, or optimized.", code: "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isCampusScene(scene)) {
    return Response.json(
      { error: "Scene must be normal, revealed, or optimized.", code: "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const image = readScene(scene);
  if (!image) {
    return Response.json(
      { error: "That scene has not been generated yet.", code: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = new ArrayBuffer(image.bytes.byteLength);
  new Uint8Array(body).set(image.bytes);
  return new Response(body, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

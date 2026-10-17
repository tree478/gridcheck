import { connection } from "next/server";
import { getGrid } from "@/lib/grid/grid";

// GET /api/grid → GridResponse. connection() keeps this out of build-time
// prerendering so every request gets a forecast from the current hour.
export async function GET() {
  await connection();
  try {
    return Response.json(await getGrid(new Date()));
  } catch (err) {
    console.error("GET /api/grid failed:", err instanceof Error ? err.name : "unknown error");
    return Response.json({ error: "Grid data is unavailable right now." }, { status: 500 });
  }
}

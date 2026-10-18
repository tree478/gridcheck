import { after, connection } from "next/server";
import { getGrid, refreshInBackground } from "@/lib/grid/grid";

// Room for the background EIA refresh (90 s deadline) to finish after the response.
export const maxDuration = 120;

// GET /api/grid → GridResponse. connection() keeps this out of build-time
// prerendering so every request gets a forecast from the current hour.
export async function GET() {
  await connection();
  try {
    const now = new Date();
    const grid = await getGrid(now);
    if (grid.source === "fallback") {
      const refresh = refreshInBackground(now);
      if (refresh) after(refresh);
    }
    return Response.json(grid);
  } catch (err) {
    console.error("GET /api/grid failed:", err instanceof Error ? err.name : "unknown error");
    return Response.json({ error: "Grid data is unavailable right now." }, { status: 500 });
  }
}

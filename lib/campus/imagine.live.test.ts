import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { setCampusCacheDirForTests } from "./cache";
import { resetGenerationLimitForTests } from "./imagine";
import { resetCampusInflightForTests, visualizeCampus } from "./visualize";

// One live Grok Imagine still. Skipped unless XAI_LIVE=1.
// Does not print the API key or the temporary upstream URL.
const LIVE = process.env.XAI_LIVE === "1";

describe.skipIf(!LIVE)("Grok Imagine live", () => {
  afterAll(() => {
    resetCampusInflightForTests();
    resetGenerationLimitForTests();
  });

  it(
    "generates the normal campus scene",
    async () => {
      try {
        process.loadEnvFile(".env.local");
      } catch {
        // Fall back to whatever is already in the environment.
      }
      if (!process.env.XAI_API_KEY?.trim()) {
        throw new Error("XAI_LIVE=1 but XAI_API_KEY is not set");
      }

      setCampusCacheDirForTests(path.join(process.cwd(), ".campus-cache"));
      const started = Date.now();
      const result = await visualizeCampus({ scene: "normal", force: true });
      const seconds = ((Date.now() - started) / 1000).toFixed(1);

      expect(result.scene).toBe("normal");
      expect(result.model).toBe("grok-imagine-image-2.0");
      expect(result.cached).toBe(false);
      expect(result.isIllustrative).toBe(true);
      expect(result.imageUrl.startsWith("/api/campus/image?scene=normal")).toBe(true);

      const { readScene } = await import("./cache");
      const stored = readScene("normal");
      expect(stored).not.toBeNull();
      expect(stored && stored.bytes.length).toBeGreaterThan(1000);
      expect(stored?.mimeType.startsWith("image/")).toBe(true);
      expect(JSON.stringify(result)).not.toContain(process.env.XAI_API_KEY);
      console.log(`live campus scene: ${seconds}s, ${stored?.bytes.length} bytes, ${stored?.mimeType}`);
    },
    90_000,
  );
});

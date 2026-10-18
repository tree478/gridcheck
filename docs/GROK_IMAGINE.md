# The Invisible Campus — Grok Imagine handoff

Backend support for three artistic campus scenes. Miranda owns the UI. This document is the contract for `POST /api/campus/visualize`.

The pictures are illustrations of a fictional campus. They are not infrastructure maps, not measured electrical flows, and not a campus-wide optimization. GridCheck's scheduler still ranks **one appliance**.

Verified against the xAI docs on 18 Oct 2026:

- Generate: `POST https://api.x.ai/v1/images/generations`
- Edit: `POST https://api.x.ai/v1/images/edits`
- Model: `grok-imagine-image-2.0`
- Docs: [Image Generation](https://docs.x.ai/developers/model-capabilities/images/generation), [Images REST reference](https://docs.x.ai/developers/rest-api-reference/inference/images)

The image API does not document a seed. This backend does not send one. It locks `aspect_ratio` to `16:9` and, when scene `normal` is already cached, edits that image for `revealed` and `optimized` so the quadrangle and camera can stay put.

## Setup

1. Create an API key at [console.x.ai](https://console.x.ai) and add credits. Image generation is billed per image (xAI lists $0.04 per image for this model).
2. Put the key in `.env.local` at the repo root. That file is gitignored. Never commit it, never prefix it with `NEXT_PUBLIC_`, and never send it to the browser.

```bash
XAI_API_KEY=your_key_here
```

3. Restart `npm run dev` after changing the file. Next.js reads `XAI_API_KEY` only on the server, inside `lib/campus/imagine.ts`.

No new npm packages. No database. No accounts.

## What the server calls

Each cache miss is one synchronous xAI request:

| Field | Value |
|---|---|
| `model` | `grok-imagine-image-2.0` |
| `n` | `1` |
| `aspect_ratio` | `16:9` |
| `resolution` | `1k` |
| `quality` | `medium` |
| `response_format` | `b64_json` |

`b64_json` is requested because xAI's default image URLs are temporary. The route stores the bytes and gives the browser a same-origin path. If xAI returns a URL anyway, the server downloads that `https` URL (8 MB cap, image content type only) and stores the bytes. The temporary URL is not returned to the client. `imageExpiresAt` is `null` because the URL we return is ours.

Timeouts: each xAI call aborts at 55 seconds. The route sets `maxDuration` to 180 so one sequence of three scenes can finish. A single-scene POST stays open until that image is stored or an error is returned. A sequence POST streams each scene as it finishes. There is no job id and no polling endpoint.

`GET` never calls xAI.

## Endpoints

### `POST /api/campus/visualize`

Generates one scene, or returns the cached scene.

```json
{
  "scene": "revealed",
  "force": false,
  "scheduleRequest": null
}
```

| Field | Required | Meaning |
|---|---|---|
| `scene` | yes | `normal`, `revealed`, or `optimized` |
| `force` | no | `true` calls xAI again and replaces the cache. Default `false`. Still counts against the hourly limit. |
| `scheduleRequest` | no | A `ScheduleRequest` the planner already built (`lib/types.ts`). Omit it, or send `null`, when there is no recommendation to show. |

Rejected fields, so this cannot be used as an open image proxy: `prompt`, `image`, `images`, `model`, `n`, `referenceImage`, `referenceImageUrl`, `negative_prompt`, `response_format`, and any other unknown field. The server writes the prompt. Client text, including busy-block titles and appliance display names, is not sent to xAI.

There is no building type in the data model, so the API does not accept a building list.

`scheduleRequest` is recomputed with the existing `schedule()` function. Gram totals in the request are ignored. The activity id must be a catalog id (`washer`, `dryer`, `dishwasher`, `ev`, `laptop`). The catalog entry replaces the client's activity name and attention rules. Duration and energy are the planner's editable inputs, same as the rest of the app, and must be a whole number of minutes from 15 to 1440 and a kilowatt-hour value from 0 to 100. One appliance only. If the scheduler cannot recommend a time, the route returns 400 and does **not** spend an image call. Omit `scheduleRequest` when you only want the picture.

### Success body

```json
{
  "scene": "revealed",
  "imageUrl": "/api/campus/image?scene=revealed&v=2026-10-18T04%3A00%3A00.000Z",
  "imageDataUrl": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "imageExpiresAt": null,
  "persistence": "process-memory-and-local-disk",
  "title": "The Campus We Don't See",
  "description": "An artistic visualization of that fictional campus as an electrical network. Not a map of real infrastructure.",
  "generatedBy": "Grok Imagine",
  "model": "grok-imagine-image-2.0",
  "isIllustrative": true,
  "cached": false,
  "continuity": "edited-from-normal",
  "generatedAt": "2026-10-18T04:00:00.000Z",
  "scheduleContext": null
}
```

| Field | Meaning |
|---|---|
| `imageUrl` | Same-origin path for a process that still holds the bytes. It is not an xAI URL. On a serverless host, do not rely on a later GET of this path. |
| `imageDataUrl` | `data:<mime>;base64,...` built from the stored bytes. The story displays this. |
| `imageExpiresAt` | Always `null`. The path stays valid until this server process drops the scene, or until `force: true` replaces it. |
| `persistence` | `process-memory-and-local-disk` in `next dev` / `next start`. `process-memory` under Vitest. |
| `cached` | `true` when this response did not call xAI. |
| `continuity` | `edited-from-normal` when `revealed` or `optimized` was edited from the cached `normal` scene. `text-to-image` otherwise. |
| `isIllustrative` | Always `true`. |
| `scheduleContext` | `null`, or the object below. Render this as text. It is not drawn into the image. |

Scene copy:

| `scene` | `title` |
|---|---|
| `normal` | The Campus We See |
| `revealed` | The Campus We Don't See |
| `optimized` | The Campus That Thinks |

`scheduleContext`, when present:

```json
{
  "activityId": "washer",
  "activityName": "Washer",
  "durationMin": 60,
  "energyKwh": 0.5,
  "recommendedStart": "2026-10-18T10:00:00-04:00",
  "recommendedEnd": "2026-10-18T11:00:00-04:00",
  "loadAt": null,
  "modeledGrams": 0,
  "savedVsSoonestGrams": 0,
  "savedVsSoonestPct": 0,
  "confidence": "pattern",
  "gco2PerKwh": 120,
  "estimatesAreModeled": true,
  "scope": "one-appliance",
  "scopeNote": "GridCheck recommended a time for one appliance. This campus image is an artistic future vision, not a campus-wide optimization and not a map of real electrical infrastructure."
}
```

The numbers above are the shape, not a real result. `modeledGrams`, `savedVsSoonestGrams`, `savedVsSoonestPct`, `confidence`, and the window come from `schedule()`. `gco2PerKwh` is the forecast hour that contains `recommendedStart`, or `null` if that hour was not in the request. Every emissions figure is a modeled estimate. Label it that way. `scope` is always `one-appliance`.

Times are ISO strings, displayed in `America/New_York` like the rest of the app.

### `POST /api/campus/visualize` with `{ "sequence": true }`

Paints `normal`, then `revealed`, then `optimized` inside **one** invocation, in that order, and streams each result as soon as it is stored. `revealed` and `optimized` edit the `normal` plate held in that same process. Three separate requests can land on three instances and each would draw a new campus, so the story uses this body instead.

The body is only `{ "sequence": true }`. `scene`, `force`, `scheduleRequest`, `prompt`, and `image` are rejected. `scheduleContext` on each scene is `null`.

Response: `200`, `Content-Type: application/x-ndjson`, `Cache-Control: no-store`. The stream starts before the first image is finished. Each line is one JSON object:

```json
{ "type": "scene", "scene": { "scene": "normal", "imageDataUrl": "data:image/jpeg;base64,...", "cached": false } }
```

```json
{ "type": "error", "error": "Image generation took too long. Try again in a moment.", "code": "timeout", "scene": "revealed" }
```

If `normal` fails, later scenes are not requested. If a later scene fails, the lines already sent stay, one error line names that scene, and the stream stops. A missing `XAI_API_KEY` is a `503` JSON body before the stream starts.

`maxDuration` is 180 seconds. A cold instance spends up to three images (xAI lists $0.04 per image). A refresh that hits a new instance can spend that again. The 9-per-hour cap is still per process, not per account. A warm instance returns the three scenes from cache and does not call xAI.

Display `imageDataUrl`. Do not follow it with `GET /api/campus/image` after a cold start: that GET may hit an instance that never stored the bytes.

### `GET /api/campus/visualize`

Does not generate. Use it to decide whether to show a spinner.

```json
{
  "scenes": {
    "normal": { "ready": true, "generatedAt": "2026-10-18T04:00:00.000Z", "imageUrl": "/api/campus/image?scene=normal&v=..." },
    "revealed": { "ready": false, "generatedAt": null, "imageUrl": null },
    "optimized": { "ready": false, "generatedAt": null, "imageUrl": null }
  },
  "persistence": "process-memory-and-local-disk",
  "generatesOnGet": false
}
```

### `GET /api/campus/image?scene=normal&v=<generatedAt>`

Returns the stored bytes (`Content-Type` is the image mime type). `v` is a cache-buster for the browser. The handler ignores it and serves the current bytes for that scene.

404 when that scene has not been generated:

```json
{ "error": "That scene has not been generated yet.", "code": "not_found" }
```

## Errors

Every error is JSON. No stack traces, no API key, no upstream body.

| HTTP | `code` | When | `error` |
|---|---|---|---|
| 400 | `invalid_request` | Bad JSON, bad scene, extra fields, or a schedule `schedule()` will not recommend | A short explanation. Schedule failures use the scheduler's own reason. |
| 413 | `payload_too_large` | Body over 100 KB | That request is too large. |
| 415 | `invalid_request` | Content-Type is not JSON | Send a JSON body. |
| 429 | `rate_limited` | This process already made 9 upstream generations in the last hour | Campus image generation is paused so we don't create too many images. Reuse a scene that was already generated, or try again later. |
| 429 | `upstream_rate_limited` | xAI returned 429 | The image service is busy right now. Wait a moment and try again. |
| 502 | `upstream_auth` | xAI returned 401 or 403 | The image service rejected the server credentials. |
| 502 | `upstream_unavailable` | Any other xAI or download failure | The image service could not generate that scene right now. |
| 503 | `missing_credentials` | `XAI_API_KEY` is missing | Image generation is not configured on the server. |
| 504 | `timeout` | The call exceeded 55 seconds, or xAI returned 408/504 | Image generation took too long. Try again in a moment. |
| 500 | `internal` | Unexpected server error | Something went wrong while preparing that scene. |

Cache hits do not count toward the 9-per-hour limit. Two overlapping requests for the same scene share one upstream call.

## Cache

After a successful generation the bytes live in process memory and, outside Vitest, in `.campus-cache/<scene>.json`. That directory is gitignored. A later POST for the same scene returns `cached: true` and does not call xAI, including after a local restart.

For the demo, generate each scene once and leave the cache in place. Use `force: true` only when you intentionally want a new picture.

The cache is not shared across machines or across separate Vercel instances. On a serverless host the disk may be read-only, so a new instance starts empty and pays for another generation. The story avoids that split by streaming `imageDataUrl` from the same invocation that generated the bytes. `GET /api/campus/image` still only sees the instance that handles that GET. A platform that kills the function before 180 seconds will drop a cold sequence before the route can finish its own timeout line.

Deleting `.campus-cache/` clears the disk copy. Restart the server to clear memory too.

## Suggested order

1. `POST` `{ "scene": "normal" }` and wait. This is the plate the other two scenes edit.
2. `POST` `{ "scene": "revealed" }`.
3. `POST` `{ "scene": "optimized" }`.

If `revealed` or `optimized` runs before `normal` exists, that scene is a fresh text-to-image picture (`continuity: "text-to-image"`) using the same camera description. Generate them one at a time. Do not fire all three on every page view.

Attach a schedule only when the planner has a real `ScheduleRequest`:

```json
{
  "scene": "optimized",
  "scheduleRequest": {
    "items": [
      {
        "activity": {
          "id": "washer",
          "name": "Washer",
          "defaultDurationMin": 60,
          "defaultEnergyKwh": 0.5,
          "attention": "startEnd",
          "supportsDelayStart": true
        },
        "durationMin": 60,
        "energyKwh": 0.5,
        "delayStart": false
      }
    ],
    "now": "2026-10-18T08:50:00-04:00",
    "deadline": "2026-10-18T14:00:00-04:00",
    "busy": [],
    "fixedRuns": [],
    "forecast": [
      { "hourStart": "2026-10-18T09:00:00-04:00", "gco2PerKwh": 400, "tier": "pattern" }
    ],
    "diversitySeed": 1
  }
}
```

The forecast in a real request is the same `HourIntensity[]` the planner already has (up to 200 hours). Busy-block `title`s are dropped on the server and are never stored.

## Frontend notes

Do not import `lib/campus/imagine.ts`, `lib/campus/cache.ts`, or `lib/campus/visualize.ts` into a client component. They read the server key and the filesystem. `import type` from `lib/campus/types.ts` is safe if you want the response types. Otherwise treat the JSON above as the contract.

`components/campus/CampusStory.tsx` posts `{ "sequence": true }` once, reads the NDJSON stream, and sets each `<img src>` to that scene's `imageDataUrl`. It does not call `GET /api/campus/image`. Next stays disabled until the next scene's data URL has arrived. A `timeout` or `upstream_rate_limited` line shows one Try again button. Other errors do not retry themselves.

Put `title` and `description` in text, not inside the image. The prompts ask for no writing, logos, or watermarks, but the model can still miss. The recommendation card on the last scene is modeled-estimate copy supplied by the page, not pixels from xAI.

## Tests

Unit tests, with `fetch` mocked, live in `lib/campus/visualize.test.ts`. They cover a cache hit, an edit from the normal scene, a missing key, an invalid scene, a rejected custom prompt, upstream 500 and 429, a timeout, a network error whose message contains the key, the hourly limit, a shared in-flight call, a temporary URL that is downloaded and not returned, a non-https URL that is not fetched, disk reload, schedule numbers checked against `schedule()`, and the HTTP status codes above.

Live call, only when you mean to spend one image credit:

```bash
XAI_LIVE=1 npx vitest run lib/campus/imagine.live.test.ts
```

That generates scene `normal`, writes `.campus-cache/normal.json`, and prints the byte size and mime type. It does not print the key. `npm test` skips it.

## Known limitations

- Visual continuity is best-effort. The edit API is documented; the model can still move a building.
- No seed parameter is documented on the image endpoints, so none is sent.
- Resolution is `1k` to keep responses smaller. Quality is `medium`.
- The hourly cap is per Node process, not a global account cap. xAI's own account limits still apply.
- Serverless deploys do not share the cache. Prefer one local server for the presentation.
- A failed `scheduleRequest` blocks the image on purpose, so a bad schedule cannot spend a generation.
- Calendar event titles are not accepted. Do not add them.

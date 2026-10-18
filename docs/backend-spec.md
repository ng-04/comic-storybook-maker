# Backend spec: Comic Storybook Maker v2

> What data, rules, ownership checks and operating constraints support the journeys in `goal-spec.md`?
> Wire formats are in `api-contract-spec.md`. Values marked *(default)* are proposals; confirm them with the owner.

## 1. Architecture

```
Browser (S3 + CloudFront SPA)
   │  HTTPS + Cognito JWT
   ▼
API Gateway (HTTP API, JWT authorizer)  ──►  API Lambdas (fast, < 10 s)
                                               │  enqueue
                                               ▼
                                        SQS queues ──► Worker Lambdas (story, sheet, page-image, rewrite, export)
                                                         │            │
                                       Claude API ◄──────┘            └──► Gemini image API
DynamoDB (users, stories, characters, pages, versions, uploads, jobs, shares)
S3: uploads (private) · media (generated images) · exports (PDFs)
Secrets Manager (model API keys) · CloudWatch (logs, metrics, alarms)
```

- **Runtime:** Node.js 20 + TypeScript Lambdas; AWS CDK for all infrastructure.
- **Why queues:** API Gateway times out at 29 s; story writing takes 30–60 s and images can be slow. API Lambdas only validate, write a job record, enqueue and return `202`.
- **Model choice is server-side config** (`STORY_MODEL`, `IMAGE_MODEL`, …). The front end never sends or sees model names.

## 2. Data model

All records carry `ownerId` (Cognito `sub`), `createdAt`, `updatedAt` (ISO 8601 UTC). IDs are opaque, prefixed strings (`st_`, `c_`, `pg_`, `pn_`, `v_`, `u_`, `job_`, `sh_`).

### User
| Field | Notes |
|---|---|
| `userId` | = Cognito `sub` |
| `email` | from token, not stored if not needed |
| `quota` | counters per day: `stories`, `sheets`, `pageImages`, `exports` |

### Story
| Field | Type / rule |
|---|---|
| `storyId`, `ownerId` | |
| `title` | ≤ 80 chars *(default)* |
| `status` | `draft` → `writing` → `outline` → `illustrating` → `done` (see §4.1) |
| `revision` | integer, +1 on every write (optimistic concurrency) |
| `setup` | object, below |
| `pageOrder` | array of `pageId` (index 0 = cover, last = end) |
| `sequelOf` | optional `storyId` |

`setup`:
| Field | Rule |
|---|---|
| `desh.main` | required to write; ≤ 120 chars |
| `desh.subs[]` | 0–6 items, each ≤ 60 chars |
| `kaal.era` | one of the era list |
| `kaal.custom` | ≤ 160, optional |
| `kaal.ritu` | one of the six ritus or empty |
| `paristhiti` | ≤ 1500, optional |
| `stakes` | ≤ 160, optional |
| `inspiration[]` | subset of: Panchatantra, Jataka tales, Hitopadesha, Ramayana, Mahabharata, Puranas, Original tale |
| `katha` | required to write; ≤ 2000 |
| `lesson` | ≤ 160 |
| `darshan` | one of: None, Nyaya, Vaisheshika, Samkhya, Yoga, Mimamsa, Vedanta |
| `tone` | Adventurous · Funny · Heartwarming · Wise and calm · Gentle bedtime |
| `age` | `3–5` · `5–7` · `7–10` |
| `pageCount` | 6 · 8 · 12 (includes cover and end) |
| `style` | Comic · Watercolour · Crayon · Madhubani-inspired |
| `format` | `auto` · `single` · `grid` |
| `placeRefIds[]` | upload IDs (purpose `place-reference`) |

### Character (belongs to a story)
| Field | Rule |
|---|---|
| `characterId`, `storyId`, `ownerId` | |
| `name` | ≤ 40; a story needs ≥ 1 named `nayak` to write |
| `gender` | `male` · `female` |
| `form` | `Human` · `Animal` · `Bird` · `Divine being` |
| `role` | `nayak` · `sahayak` · `mitra` · `guru` · `parivaar` · `pratinayak` |
| `isKey` | boolean; always true for `nayak` |
| `age` | digits, optional |
| `appearance` | ≤ 300 |
| `color` | hex, assigned server-side from a palette |
| `purushartha` | `{ Dharma, Artha, Kaam, Moksh }` each `{ on: bool, note ≤ 120 }`; only meaningful if `isKey` |
| `refIds[]` | upload IDs (purpose `character-reference`), ≤ 8 *(default)* |
| `sheet` | `{ status: none|drawing|review|approved|failed, versions: [{ versionId, imageKey, fallbackNote, createdAt }], activeVersionId, approvedVersionId, error }` |

### Page
| Field | Rule |
|---|---|
| `pageId`, `storyId` | |
| `kind` | `cover` · `middle` · `end` (cover and end are fixed in position) |
| `layout` | `caption` · `full` · `grid` (cover and end are always `caption`) |
| `caption` | ≤ 400 (cover caption = title; end caption carries the seekh) |
| `imagePrompt` | ≤ 1200 (single and full layouts) |
| `bubble` | ≤ 90 (single and full layouts) |
| `location` | one of desh.main or desh.subs |
| `panels[]` | exactly 6 for grid: `{ panelId, prompt ≤ 600, bubble ≤ 90, speakerId? }` |
| `status` | `none` · `queued` · `drawing` · `done` · `failed` |
| `versions[]` | immutable `PageVersion`s |
| `activeVersionId` | |
| `error` | `{ code, message }` when failed |

### PageVersion
`{ versionId, imageKey, panelImageKeys[6]?, fallbackNote, fallbackStep: 1|2|3, promptSnapshot, createdAt }`. Never mutated; never deleted except with the story.

### Upload
`{ uploadId, ownerId, purpose: character-reference|place-reference, storyId, characterId?, key, contentType, bytes, status: pending|uploaded|deleted, createdAt }`.

### Job
`{ jobId, ownerId, kind: story|rewrite|sheet|page-image|export, target: { storyId, characterId?, pageId? }, status: queued|running|done|failed|cancelled, input (redacted), result?, error?, attempts, createdAt, startedAt?, finishedAt?, ttl }`.
Job records expire 7 days after finishing *(default)* via DynamoDB TTL.

### ShareLink
`{ token (≥ 128-bit random, URL-safe), storyId, ownerId, createdAt, revokedAt?, expiresAt? }`.

### Storage layout (S3)
```
uploads/{ownerId}/{uploadId}/{filename}        private; presigned PUT/GET only
media/{ownerId}/{storyId}/sheets/{characterId}/{versionId}.png
media/{ownerId}/{storyId}/pages/{pageId}/{versionId}.png
media/{ownerId}/{storyId}/pages/{pageId}/{versionId}/panel-{0..5}.png
exports/{ownerId}/{storyId}/{jobId}.pdf        lifecycle: delete after 7 days (default)
```
All buckets: block public access, SSE-S3 (or KMS), CORS limited to the app origin for PUT on `uploads/`. The app serves media through presigned GET URLs (≤ 1 h) or CloudFront signed URLs.

## 3. Ownership and access rules
1. **Every request is authenticated** by the API Gateway JWT authorizer, except `GET /share/{token}` and the CORS preflight.
2. **Every read or write loads the resource and checks `resource.ownerId === jwt.sub`.** On mismatch return **`404 NOT_FOUND`** (never `403`, so IDs can't be probed).
3. Child resources are checked through their story: a character, page or upload must belong to the story in the path, and the story to the caller.
4. **Jobs:** `GET /jobs/{id}` and `DELETE /jobs/{id}` only for the job's owner.
5. **Uploads:** an upload ID may only be attached to the caller's own story and character. Presigned PUT URLs are scoped to one key, one content type and a max size, and expire in 5 minutes.
6. **Share view:** resolves token → story, checks it isn't revoked or expired, and returns a **redacted** projection: title, starring names, page kinds and layouts, captions, bubbles, and presigned GET URLs for the active page images only. Never return reference images, prompts, setup, purushartha notes, emails or IDs other than the token.
7. **Exports and share view never include reference uploads.**
8. Admin access, if any, goes through the AWS console, not the API.

## 4. Business rules

### 4.1 Story lifecycle
| From → to | Trigger | Guard |
|---|---|---|
| (new) → `draft` | `POST /stories` | quota |
| `draft`/`outline` → `writing` | `POST /stories/{id}/outline` | desh.main, a named nayak and katha present; no running story job for this story |
| `writing` → `outline` | story job done | replaces pages; previous page versions are discarded with their pages *(default; see open question)* |
| `writing` → previous status | story job failed or cancelled | |
| `outline` → `illustrating` | first page-image job created | **every character sheet approved** (else `422 SHEETS_NOT_APPROVED`) |
| `illustrating` → `done` | every page `done` | computed after each page job |
| `done` → `illustrating` | a redraw starts | |

### 4.2 Outline rules
- Page count = `setup.pageCount` on generation; the user may add pages up to **14** total and delete middle pages down to **1** middle page.
- Cover is index 0 and end is the last index; only middle pages can move.
- **Format auto-pick** (when `setup.format = auto`): `score = keyCharacters + subLocations + (plotLen > 420 ? 2 : plotLen > 200 ? 1 : 0) + (age == "7–10" ? 1 : 0)`, where `plotLen = len(katha) + len(paristhiti)`. `score ≥ 5` → middle pages are `grid`, else `caption`. Return the chosen format and reason with the outline.
- Switching a page to `grid` with no panels creates 6 blank panels (establishing, close-up of A, B replying, A and B, detail, decision).

### 4.3 Story writing (Claude)
- Input: setup, characters (name, gender, form, role, isKey, appearance, purushartha), approved sheet references (as descriptions, not images, for the text model).
- Output (structured JSON, validated against the schema in `api-contract-spec.md`): title, pages with caption, imagePrompt, layout, location, panels (for grid).
- **Content rules in the system prompt:**
  - suitable for the reading age; no violence beyond fable-level peril
  - Kaam framed as wishes, ambition and love for family and friends
  - respectful of traditions; inspired by them, not copying copyrighted retellings
  - the seekh is stated on the end page
  - every image prompt ends "No text, letters or speech bubbles"
- Validate the output: page count, caption and bubble lengths, panel count 6, speakers exist. Retry once on schema failure; then fail with `GENERATION_INVALID`.
- Run an output safety check (keyword and LLM classifier) → fail with `CONTENT_BLOCKED` if it doesn't pass.

### 4.4 Image generation (Gemini) and the retry ladder
- **Sheets:** inputs are name, gender, form, appearance, style and the character's reference images. Output is a cartoon character sheet (front, side, action). No text in the image.
- **Pages:** inputs are the prompt(s), the style, and the **approved sheet images of the characters on that page** (speakers + nayak at minimum).
- **Grid pages:** 6 separate panel images in parallel (same references), returned as `panelImageKeys[0..5]`; `imageKey` may be a composite thumbnail.
- **Retry ladder** on `IMAGE_SAFETY` or `IMAGE_OTHER`:
  1. with all reference images
  2. without photo references (sheets only, or no images)
  3. text-only prompt

  Record `fallbackStep` and a plain-language `fallbackNote` ("" for step 1). If all three fail, the job fails with the last code and `attempts`.
- Transient errors (`5xx`, timeouts, throttling) retry with exponential backoff (max 3) **before** stepping down the ladder.
- **Concurrency guard:** max 3 running page-image jobs per story and N per user *(default 6)*; the server enforces "cover first" only as a recommendation (the client orders the queue).

### 4.5 Rewrite a page
Claude rewrites one page given the story context, the page and the user's current text; returns `{ caption, imagePrompt, panels? }`. Cover rewrites keep the title.

### 4.6 PDF export
Server-side render (headless Chromium Lambda with the same PagePanel CSS, or a PDF library), one page per sheet, A4 or Letter, embedding the active page images at print resolution and the comic fonts. Never includes reference images. Output to `exports/…`, returned as a presigned URL (1 h).

### 4.7 Sequel
`POST /stories/{id}/duplicate` copies setup (clearing paristhiti, stakes, katha, lesson), characters (new IDs) with their approved sheet versions (media copied or referenced), and no pages. New status `draft`; title "<title>: Part 2".

### 4.8 Deletion
- Delete story: the story, characters, pages, versions, share links and jobs; all media and exports under the story prefix; uploads attached to it.
- `DELETE /me/images`: every upload object and record for the user (status `deleted`); sheets and page images stay.
- Delete one upload: removes the object and detaches it from its story or character.
- Deletes are idempotent (`204` even if already gone).

### 4.9 Quotas and rate limits *(defaults; confirm)*
Per user per day: 10 story writes, 40 sheet draws, 150 page images (grid = 6), 20 exports. Over quota → `429 QUOTA_EXCEEDED` with `resetAt`. API burst rate limit via API Gateway usage throttling → `429 RATE_LIMITED` with `Retry-After`.

## 5. Operating constraints
| Constraint | Rule |
|---|---|
| Latency | API Lambdas respond in < 3 s p95; never > 29 s |
| Worker timeouts | story 120 s, sheet 90 s, page image 90 s per call, export 300 s; SQS visibility timeout ≥ worker timeout + 30 s |
| Idempotency | Mutating POSTs accept `Idempotency-Key`; the same key + same body within 24 h returns the original response. Workers are idempotent by `jobId` |
| Cancellation | `DELETE /jobs/{id}` marks it `cancelled`; workers check before each model call and before writing results |
| Poison messages | SQS DLQ after 3 receives; the job is marked `failed` with `INTERNAL` |
| Secrets | Anthropic and Gemini keys in Secrets Manager, cached per Lambda container; never logged |
| Logging | Structured JSON; log `jobId`, `storyId`, `ownerId` hash, model latency, ladder step; **never** log prompts containing names, image bytes or presigned URLs at INFO level |
| Metrics and alarms | job failures by code, ladder step distribution, queue age, DLQ depth > 0, 5xx rate, model spend per day |
| CORS | Allow only the app origin(s); credentials not required (bearer token) |
| Environments | `dev` and `prod` stacks; separate buckets, tables and Cognito pools |
| Region | `[CONFIRM]` (suggested `ap-south-1`) |
| Backups | DynamoDB point-in-time recovery on; S3 versioning on the media bucket *(default)* |
| Privacy | Reference uploads lifecycle-deleted after `[YOUR RETENTION POLICY]`; exports after 7 days |
| Cost guard | AWS Budget alarm; per-user quotas; max image retries per job = 3 transient + 3 ladder steps |

## 6. Open questions
1. When an outline is regenerated, keep old page versions (history) or discard them?
2. Should share links expire by default (for example after 90 days)?
3. Are composite page images needed at all, or only panels?
4. Language support beyond English (fonts in the PDF, prompts)?

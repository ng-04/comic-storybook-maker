# API contract spec: Comic Storybook Maker v2

> What exact messages connect the front end and the back end, including failures?
> Rules behind these messages: `backend-spec.md`. Screens that use them: `frontend-spec.md`.

## 1. Conventions
- **Base URL:** `${VITE_API_BASE}` (for example `https://api.[YOUR_DOMAIN]`), JSON over HTTPS, UTF-8.
- **Auth:** `Authorization: Bearer <Cognito ID token>` on every endpoint except `GET /share/{token}`.
- **IDs:** opaque strings with a prefix (`st_`, `c_`, `pg_`, `pn_`, `v_`, `u_`, `job_`). Timestamps are ISO 8601 UTC.
- **Optimistic concurrency:** story responses include `revision`. `PATCH` requests send `If-Match: "<revision>"`; on a mismatch the API returns `409 STALE_REVISION`.
- **Idempotency:** `POST` requests that start work or create records accept `Idempotency-Key: <uuid>`.
- **Async work:** endpoints that call a model return **`202 { "jobId": "…" }`**; poll `GET /jobs/{jobId}`.
- **Media URLs** in responses are presigned and short-lived (≤ 1 h). Don't store them; refetch the resource.
- **Pagination:** `?limit=` (default 20, max 50) and `?cursor=`; responses include `nextCursor` (null at the end).
- **Lengths** follow the limits in `backend-spec.md` §2; going over them → `400 VALIDATION_FAILED`.

## 2. Error envelope
Every non-2xx response:
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Plain-language message safe to show users.", "details": { "field": "setup.katha", "reason": "required" }, "requestId": "…" } }
```

| HTTP | `code` | When | Client behaviour |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | bad or missing field, too long, bad enum | Show inline under the field in `details.field` |
| 401 | `UNAUTHENTICATED` | missing or expired token | Refresh once, then go to sign-in |
| 404 | `NOT_FOUND` | resource doesn't exist **or isn't yours** | "This storybook isn't available" + back to Library |
| 409 | `STALE_REVISION` | `If-Match` doesn't match | Offer Reload / Keep mine; `details.current` holds the latest story |
| 409 | `JOB_IN_PROGRESS` | e.g. a second outline job for the same story | Reattach to `details.jobId` |
| 413 | `PAYLOAD_TOO_LARGE` | upload > 10 MB | Toast with the file name |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | upload not JPEG/PNG/WebP/HEIC | Toast |
| 422 | `SHEETS_NOT_APPROVED` | page image requested while a sheet isn't approved | Show the names in `details.characters` + link to Paatra |
| 422 | `STORY_INCOMPLETE` | outline requested without desh, a nayak or katha | Show `details.missing[]` |
| 429 | `RATE_LIMITED` | burst limit | Retry after the `Retry-After` header |
| 429 | `QUOTA_EXCEEDED` | daily quota | Show `details.resetAt` |
| 500 | `INTERNAL` | unexpected | "Something went wrong. Try again." |
| 503 | `UNAVAILABLE` | dependency down | Same; keep edits locally |
| — | `OFFLINE` | client only: network unreachable | Offline banner; queue writes |

## 3. Shared types (TypeScript)
```ts
type Gender = 'male' | 'female';
type Form = 'Human' | 'Animal' | 'Bird' | 'Divine being';
type Role = 'nayak' | 'sahayak' | 'mitra' | 'guru' | 'parivaar' | 'pratinayak';
type Purushartha = 'Dharma' | 'Artha' | 'Kaam' | 'Moksh';
type StoryStatus = 'draft' | 'writing' | 'outline' | 'illustrating' | 'done';
type PageKind = 'cover' | 'middle' | 'end';
type Layout = 'caption' | 'full' | 'grid';
type PageStatus = 'none' | 'queued' | 'drawing' | 'done' | 'failed';
type SheetStatus = 'none' | 'drawing' | 'review' | 'approved' | 'failed';

interface Setup {
  desh: { main: string; subs: string[] };          // subs: 0–6
  kaal: { era: string; custom: string; ritu: string };
  paristhiti: string; stakes: string;
  inspiration: string[]; katha: string; lesson: string; darshan: string;
  tone: string; age: '3–5' | '5–7' | '7–10'; pageCount: 6 | 8 | 12;
  style: 'Comic' | 'Watercolour' | 'Crayon' | 'Madhubani-inspired';
  format: 'auto' | 'single' | 'grid';
  placeRefs: UploadRef[];                           // response only; send placeRefIds in requests
}
interface UploadRef { uploadId: string; filename: string; bytes: number; url?: string }  // url only for the owner
interface SheetVersion { versionId: string; imageUrl: string; fallbackNote: string; createdAt: string }
interface Character {
  characterId: string; name: string; gender: Gender; form: Form; role: Role; isKey: boolean;
  age: string; appearance: string; color: string;
  purushartha: Record<Purushartha, { on: boolean; note: string }>;
  refs: UploadRef[];
  sheet: { status: SheetStatus; versions: SheetVersion[]; activeVersionId: string | null; approvedVersionId: string | null; error: ApiErrorBody | null };
}
interface Panel { panelId: string; prompt: string; bubble: string; speakerId: string | null }
interface PageVersion { versionId: string; imageUrl: string; panelImageUrls?: string[]; fallbackNote: string; fallbackStep: 1 | 2 | 3; createdAt: string }
interface Page {
  pageId: string; kind: PageKind; layout: Layout; caption: string; imagePrompt: string; bubble: string;
  location: string; panels: Panel[];               // 6 when layout = grid, else []
  status: PageStatus; versions: PageVersion[]; activeVersionId: string | null; error: ApiErrorBody | null;
}
interface Story {
  storyId: string; title: string; status: StoryStatus; revision: number;
  setup: Setup; characters: Character[]; pages: Page[];
  format: { chosen: 'caption' | 'grid'; reason: string } | null;
  sequelOf: string | null; createdAt: string; updatedAt: string;
}
interface StorySummary { storyId: string; title: string; status: StoryStatus; coverUrl: string | null; inspiration: string[]; deshMain: string; pagesDrawn: number; pageCount: number; updatedAt: string }
interface ApiErrorBody { code: string; message: string; details?: Record<string, unknown> }
type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
interface Job<R> { jobId: string; kind: 'story' | 'rewrite' | 'sheet' | 'page-image'; status: JobStatus; result?: R; error?: ApiErrorBody & { attempts?: string[] }; createdAt: string; updatedAt: string }
```

## 4. Endpoints

Legend: **[orig]** = in the original v2 contract · **[changed]** = original endpoint with a changed shape · **[new]** = added to support the journeys.

### 4.1 Library and stories
**`GET /stories`** [orig] → `200 { items: StorySummary[], nextCursor: string | null }`

**`POST /stories`** [changed] creates a draft (synchronous).
Request: `{ title?: string, setup?: Partial<Setup>, characters?: CharacterInput[] }` → `201 Story` (status `draft`, one empty nayak if `characters` is omitted).
> Changed from the original `POST /stories → { jobId }`: characters need IDs (for sheets) before a story is written, and drafts must survive across devices. Story writing moves to `POST /stories/{id}/outline`.

**`GET /stories/{storyId}`** [orig] → `200 Story` · `404 NOT_FOUND`

**`PATCH /stories/{storyId}`** [orig] (header `If-Match`)
Request (any subset):
```json
{ "title": "…", "setup": { "...": "partial Setup; placeRefIds: string[]" },
  "pages": [ { "pageId": "pg_1", "caption": "…", "imagePrompt": "…", "bubble": "…", "layout": "grid",
               "panels": [ { "panelId": "pn_1", "prompt": "…", "bubble": "…", "speakerId": "c_1" } ],
               "activeVersionId": "v_9" } ],
  "characters": [ { "characterId": "c_1", "name": "Chiku", "gender": "male", "form": "Animal", "role": "nayak", "isKey": true,
                    "age": "", "appearance": "…", "purushartha": { "...": "…" }, "refIds": ["u_1"],
                    "approveVersionId": "v_3", "activeVersionId": "v_3" } ],
  "pageOrder": ["pg_cover", "pg_3", "pg_2", "pg_end"],
  "addPages": [ { "afterPageId": "pg_3", "layout": "caption" } ],
  "deletePageIds": ["pg_5"] }
```
→ `200 Story` · `400` · `404` · `409 STALE_REVISION` · `422 VALIDATION_FAILED`. Rules: cover stays first and end stays last; 1 ≤ middle pages; total ≤ 14; grid pages have exactly 6 panels (the server fills blanks when switching to grid). `characters`, when sent, is the **complete** list (see §4.2).

**`DELETE /stories/{storyId}`** [orig] → `204` (cascade: backend-spec §4.8)

**`POST /stories/{storyId}/duplicate`** [new] (sequel) → `201 Story` (status `draft`, pages empty)

### 4.2 Characters
Characters are part of the story and are saved with `PATCH /stories/{storyId}` (no separate character endpoints).
- `characters` is the complete list: a character missing from it is deleted (its sheet media goes with it); a new `characterId` adds one. The client creates IDs (`c_` + 12 random characters); the server rejects duplicates and wrong prefixes with `400`.
- `refIds` attaches uploads (purpose `character-reference`, same story).
- `approveVersionId` sets `sheet.status = approved` and `approvedVersionId`; `activeVersionId` picks the version shown.
- `422 VALIDATION_FAILED` if no character is a nayak, or a nayak loses `isKey`.

**`POST /characters/{characterId}/sheet`** [orig] (`Idempotency-Key` recommended)
Request: `{}` (the server reads the character, style and refs) → `202 { jobId }`
Job result: `{ versionId, imageUrl, fallbackNote }` ([changed]: adds `versionId`, `fallbackNote`). The character's `sheet.status` becomes `review`.
Job errors: `IMAGE_SAFETY`, `IMAGE_OTHER` (with `attempts`), `QUOTA_EXCEEDED`, `INTERNAL`.

### 4.3 Story generation and pages
**`POST /stories/{storyId}/outline`** [new; replaces the original `POST /stories` job]
Request: `{}` (uses the stored setup and characters) → `202 { jobId }` · `422 STORY_INCOMPLETE { missing: ["desh","nayak","katha"] }` · `409 JOB_IN_PROGRESS`
Job result (story job):
```json
{ "storyId": "st_1", "title": "Chiku and the Bandar Raja", "format": { "chosen": "grid", "reason": "…" },
  "pages": [ { "pageId": "pg_1", "kind": "cover", "caption": "Chiku and the Bandar Raja", "imagePrompt": "…", "layout": "caption", "location": "A forest on the banks of the Narmada", "panels": [] },
             { "pageId": "pg_2", "kind": "middle", "caption": "…", "imagePrompt": "…", "layout": "grid", "location": "The old jamun tree",
               "panels": [ { "panelId": "pn_1", "prompt": "… No text or speech bubbles.", "bubble": "", "speakerId": null } ] } ] }
```
Job errors: `GENERATION_TIMEOUT`, `GENERATION_INVALID`, `CONTENT_BLOCKED`, `CANCELLED`, `INTERNAL`.

**`POST /stories/{storyId}/pages/{pageId}/rewrite`** [new] `{}` → `202 { jobId }`; result `{ caption, imagePrompt, panels }` (also saved to the page).

**`POST /stories/{storyId}/pages/{pageId}/image`** [changed: `pageId` instead of index `n`, so reordering is safe]
Request: `{ "prompt"?: string }` (optional override; otherwise the stored prompt or panels) → `202 { jobId }` · `422 SHEETS_NOT_APPROVED { characters: ["Nani"] }` · `429 QUOTA_EXCEEDED`
Job result:
```json
{ "versionId": "v_12", "imageUrl": "https://…", "panelImageUrls": ["https://…", "… ×6, grid only"], "fallbackNote": "The first try was declined, so this was redrawn without the reference images.", "fallbackStep": 2 }
```
Job errors: `IMAGE_SAFETY` · `IMAGE_OTHER` (both with `attempts: ["with references","without references","text only"]`), `CANCELLED`, `INTERNAL`.

### 4.4 Jobs
**`GET /jobs/{jobId}`** [orig] → `200 Job` · `404`
```json
{ "jobId": "job_7", "kind": "page-image", "status": "running", "createdAt": "…", "updatedAt": "…" }
{ "jobId": "job_7", "kind": "page-image", "status": "done", "result": { "...": "kind-specific result above" } }
{ "jobId": "job_7", "kind": "page-image", "status": "failed", "error": { "code": "IMAGE_SAFETY", "message": "…", "attempts": ["with references", "without references", "text only"] } }
```
Polling: every 1 s (0.8–1.5 s); on network error back off to 2 s and keep polling; stop on `done`, `failed` or `cancelled`.

**`DELETE /jobs/{jobId}`** [new] → `202` (sets `cancelled`; any partial result is discarded).

### 4.5 Uploads and privacy
**`POST /uploads`** [orig, body extended]
Request: `{ filename, contentType: "image/jpeg|image/png|image/webp|image/heic", bytes, purpose: "character-reference" | "place-reference", storyId, characterId? }`
→ `201 { uploadId, uploadUrl, fileUrl, expiresAt }` · `413` · `415` · `404` (story or character not yours)
Then the client does `PUT uploadUrl` with header `Content-Type: <contentType>` and the raw bytes (S3 answers `200`). Finally it attaches the upload with `PATCH` (character `refIds` or story `setup.placeRefIds`).

**`DELETE /uploads/{uploadId}`** [new] → `204`

**`DELETE /me/images`** [new] → `204` (all reference uploads of the caller)

### 4.6 Export and share
PDF export has no endpoint: the browser builds the PDF from the same page data and images the reader shows (as in Phase 1), so reference images can't reach it.

**`POST /stories/{storyId}/share`** [orig] → `201 { shareUrl, token, createdAt }` (idempotent: returns the existing active link)

**`DELETE /stories/{storyId}/share`** [new] → `204` (revoke)

**`GET /share/{token}`** [new, public, no auth] → `200`
```json
{ "title": "…", "starring": ["Chiku", "Neela"], "pages": [ { "kind": "middle", "layout": "grid", "caption": "…", "bubble": "", "imageUrl": "https://…", "panelImageUrls": ["…"], "panelBubbles": ["…"] } ] }
```
`404 NOT_FOUND` if the token is unknown, revoked or expired. **Never** includes prompts, setup, reference images, IDs or emails.

## 5. Summary of changes from the original contract
| Original | Now | Why |
|---|---|---|
| `POST /stories → { jobId }` | `POST /stories → 201 Story` (draft) + `POST /stories/{id}/outline → 202 { jobId }` | Characters and sheets exist before writing; drafts sync across devices |
| `POST /stories/{id}/pages/{n}/image` | `…/pages/{pageId}/image` | Page indexes change when pages are reordered |
| Sheet result `{ imageUrl }` | `{ versionId, imageUrl, fallbackNote }` | Sheet versions and fallback notes |
| Page result `{ imageUrl, versionId, fallbackNote }` | + `fallbackStep`, `panelImageUrls` | 3×2 grid pages |
| `POST /uploads { … }` | + `bytes`, `purpose`, `storyId`, `characterId` | Scoped presigned URLs, ownership |
| — | rewrite, duplicate, job cancel, upload delete, `/me/images`, share revoke, public share read | Journeys J2–J7 |

**Simplified on 2026-10-18 (design review):**
| Removed | Replaced by | Why it's safe |
|---|---|---|
| `POST/PATCH/DELETE /stories/{id}/characters…` | `characters` in `PATCH /stories/{id}` with client-made IDs | Sheets only need a stable `characterId`, which the client creates; ownership is checked once, through the story |
| `POST /stories/{id}/export` and the `export` job | PDF built in the browser | Meets J5 and the Print acceptance; the browser only has page images, never reference uploads |
| Composite grid image (`imageKey` on grid pages) | Thumbnails render the six panel images | Nothing reads a composite |

## 6. Contract tests (must exist)
1. Every endpoint returns the error envelope on failure, with the documented codes.
2. Cross-user access to any story, character, page, upload or job returns `404`.
3. Model-calling endpoints return `202` in < 3 s.
4. `GET /share/{token}` contains no keys other than those documented (snapshot of the JSON keys).
5. `PATCH` with a stale `If-Match` returns `409 STALE_REVISION` with `details.current`.
6. The mock client (`src/api/mock.ts`) passes the same type checks as the HTTP client.

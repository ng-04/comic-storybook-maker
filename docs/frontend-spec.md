# Frontend spec: Comic Storybook Maker v2

> What screens, actions and visible states support the journeys in `goal-spec.md`?
> Exact request/response shapes live in `api-contract-spec.md`. Behaviour reference: `design/canvas/Main.dc.html` (newest) and `design/prototype.html` (standalone).

## 1. Platform and structure
- **Stack:** React 18 + Vite + TypeScript, built to static files for S3 + CloudFront. Client-side routing with SPA fallback.
- **No secrets, keys or model names** in the bundle. Config comes from `VITE_*` env vars that hold public values only.
- **One network layer:** every call goes through `src/api/`. `VITE_MOCK=true` swaps the HTTP client for the mock (see §7).
- **Auth:** Cognito Hosted UI with PKCE (or Amplify Auth). The ID token goes on every API request; on `401` refresh once, then send the user to sign-in.

### Suggested file layout
```
src/
  main.tsx  App.tsx  routes.tsx  config.ts
  api/        index.ts (picks mock|http)  http.ts  mock.ts  jobs.ts (pollJob)  uploads.ts  types.ts (from api-contract-spec)
  auth/       cognito.ts  RequireAuth.tsx
  state/      store.ts (stories, ui, toasts)  persist.ts (local cache + sync queue)  online.ts
  screens/    Landing  SignIn  Library  Writing  Outline  Illustrate  PageEditor  Reader  SharedView
    setup/    Desh  Kaal  Paatra  Paristhiti  Katha
  components/ PagePanel  PanelEditor  CharacterCard  GenderIcon  PurusharthaPicker  ReferenceTray
              SublocationList  FormatPicker  SheetPreview  Stepper  ProgressBar  StatusBadge
              Toasts  ConfirmDialog  ExportDialog  ShareDialog  OfflineBanner  SaveStatus  MockPanel
  hooks/      useJob  useIllustrationQueue  useSpeech  useOnline  useAutosave
  styles/     tokens.css  components.css  print.css
```

## 2. Routes and navigation

| Route | Screen | Auth | Reached from |
|---|---|---|---|
| `/` | Landing | public | — |
| `/signin` | Sign in | public | Landing, any 401 |
| `/library` | My storybooks | user | header, after sign-in |
| `/s/:storyId/desh` | 1 Desh | owner | New katha, stepper |
| `/s/:storyId/kaal` | 2 Kaal | owner | stepper |
| `/s/:storyId/paatra` | 3 Paatra | owner | stepper |
| `/s/:storyId/paristhiti` | 4 Paristhiti | owner | stepper, Sequel |
| `/s/:storyId/katha` | 5 Katha | owner | stepper |
| `/s/:storyId/writing` | Writing (job) | owner | Write my katha |
| `/s/:storyId/outline` | Outline review | owner | after writing |
| `/s/:storyId/pictures` | Illustrate | owner | Draw the pictures |
| `/s/:storyId/pages/:pageId` | Page editor | owner | click a page |
| `/s/:storyId/read` | Reader | owner | Read the book |
| `/share/:token` | Shared view | public | share link |

**Stepper** (shown on all `/s/...` screens): `1 Desh · 2 Kaal · 3 Paatra · 4 Paristhiti · 5 Katha · 6 Outline · 7 Pictures · 8 Read`. Steps 1–5 are always reachable; Outline needs pages; Pictures needs status `illustrating`/`done` or any drawn page; Read needs at least one drawn page. The current step has `aria-current="step"`.

**Opening a book from the Library** goes by status: `draft` → Desh, `outline` → Outline, `illustrating` → Pictures, `done` → Reader.

## 3. Screens: purpose, actions, states

### 3.1 Landing (signed out)
- **Shows:** hero ("Comic books with a lesson at heart"), sample cover, 4-step "How a katha comes together", privacy note about reference images.
- **Actions:** Start a katha → Sign in; How it works (scroll).

### 3.2 Sign in
- **Actions:** Continue with Google; email + password; toggle create account; Forgot password (Cognito flow).
- **States:** idle · busy (buttons disabled, spinner) · error (`role="alert"`: invalid email, wrong password, network).

### 3.3 Library
- **Shows:** a "New katha" tile + one card per book: cover (PagePanel), title, inspiration · desh, status badge (`Draft`, `Outline to review`, `Drawing n/N`, `Ready to read`), last edited.
- **Actions:** New katha; Open; Make a sequel; Delete (confirm dialog, then toast).
- **States:** loading (4 skeleton covers) · empty (blue panel, "Start your first katha") · error ("We couldn't load your storybooks" + Try again) · ready.

### 3.4 Step 1 · Desh
- **Fields:** main place (text, required to write; idea chips); sublocations list (0–6, each editable and removable; add button; idea chips); place reference images (ReferenceTray, optional, multiple).
- **States:** no sublocations hint; max 6 reached (add disabled); per-image uploading / uploaded / failed (toast).
- **Actions:** Next: Kaal.

### 3.5 Step 2 · Kaal
- **Fields:** era (single-select chips: Long, long ago · Satya / Treta / Dvapara Yuga · Vedic age · Mauryan era · Gupta era · Present day); custom text (optional, overrides era wording); ritu / season (optional chip, click again to clear).
- **Shows:** a "So far" line summarising desh and kaal.
- **Actions:** Back · Next: Paatra.

### 3.6 Step 3 · Paatra
- **Character card** (one per character):
  - Header: **gender thumbnail icon** (male / female bust in the character colour; animal or bird icon for those forms; halo for divine), name, "Role · Gender · Form · key".
  - **Male / Female toggle** with icons (`aria-pressed`).
  - Name, Form (Human / Animal / Bird / Divine being), Role (Nayak, Sahayak, Mitra, Guru, Parivaar, Pratinayak), Age (optional, digits), appearance (textarea).
  - **Key character** checkbox (forced on for Nayak; defaults on for Pratinayak).
  - **Purusharthas** (key characters only): four toggle tiles (Dharma blue, Artha yellow, Kaam red, Moksh purple, each with icon + name + hint). A selected tile reveals a one-line note ("What duty does Chiku hold to?").
  - **Reference images** (ReferenceTray, optional, multiple).
  - **Character sheet:** preview area + actions by state.
- **Sheet states:** `none` ("No sheet yet") → Draw · `drawing` (striped, spinner) · `review` (preview + Approve / Regenerate) · `approved` (badge + Regenerate) · `failed` (error note + Try again). Any state can show a **fallback note** from the job.
- **Page-level:** "Add a paatra" chips by role; "n of N sheets approved"; Draw all sheets; Remove (with Undo toast; the last nayak can't be removed).
- **Validation:** a named Nayak is required to continue ("Give your nayak a name to continue").
- **Side panel:** purushartha guide; "About your images" (privacy bullets, count, Delete my images).

### 3.7 Step 4 · Paristhiti
- **Fields:** situation (textarea; "Think about" prompt chips append a question); what's at stake (one line, optional).
- **Actions:** Back · Next: Katha.

### 3.8 Step 5 · Katha
- **Fields:** inspired by (multi-select: Panchatantra, Jataka tales, Hitopadesha, Ramayana, Mahabharata, Puranas, Original tale); main plot (required); life lesson / seekh (idea chips); Darshan lens (optional single-select); tone; reading age (3–5, 5–7, 7–10); pages (6 / 8 / 12, including cover and ending); art style (Comic, Watercolour, Crayon, Madhubani-inspired); **page format** (Auto / Single scene / 3×2 comic grid) with a live explanation of what Auto chose and why.
- **Shows:** "Your katha at a glance" (desh, kaal, key paatra with their purusharthas, paristhiti) with edit links.
- **Validation:** shows "Before writing: add …" listing missing desh, nayak or plot; the Write button is disabled until they are fixed.
- **Actions:** Write my katha (or "Write a new draft", with a confirm dialog, if pages exist).

### 3.9 Writing (story job)
- **Shows:** progress bar driven by elapsed time against expected time (not server progress); named stages ticking off; "0:21 elapsed · usually 30 to 60 seconds".
- **Actions:** Cancel (stops polling, calls cancel, returns to Katha; toast "Everything you set up is kept").
- **States:** running · failed (message + Try again / Change the katha) · offline (polling backs off and resumes).

### 3.10 Outline review
- **Shows:** editable book title; the seekh; one card per page with a coloured stripe (cover blue, middle yellow, end red), label, "At: sublocation" badge.
- **Per page actions:** move up / down (middle pages only), Rewrite this page (spinner; card dimmed while rewriting), Delete (Undo toast; at least one middle page must remain), "+ Add a page after this one" (max 14 pages), Format chips (Single scene / 3×2 comic grid).
- **Single page fields:** caption · picture prompt (monospace).
- **Grid page fields:** narration · expandable "6 panels with speech bubbles": per panel, bubble text, "Said by" chips (Narrator + named characters), panel prompt.
- **Footer:** "This will draw N pages, cover first (k as six-panel grids)" and **Draw the pictures** (disabled with a list of names until every sheet is approved, with a link to Paatra).

### 3.11 Illustrate
- **Shows:** heading ("Drawing your pictures" / "Every picture is drawn"); overall progress (count, %, bar); status counts (done, drawing, queued, failed); grid of PagePanel thumbnails, each with a label (+ "· grid"), status badge and a "Fallback used" badge (tooltip shows the note); failed pages show "Edit prompt & redraw".
- **Queue behaviour (client-driven):** the cover is drawn alone first; then up to 3 pages at once; failed pages don't block others; when all are done, a toast "Read it" appears and the book becomes `done`.
- **Actions:** open the editor for any page; Retry failed pages; Read the book.

### 3.12 Page editor
- **Shows:** large PagePanel; prev / next page; version strip (thumbnails, active ring, "· fallback" suffix).
- **Notes:** drawing ("Drawing a new version…"); fallback ("Heads up: …"); all-steps-failed error with error code and a link that focuses the prompt.
- **Fields:** caption / narration / cover title; format chips (Single, Grid, Full picture); speech bubble (single and full layouts); prompt (single) or six panel editors (grid).
- **Actions:** Redraw / Redraw all 6 panels / Draw this page (also **Ctrl/Cmd+Enter** inside any prompt); pick a version (sets the active version).

### 3.13 Reader
- **Shows:** a big PagePanel; prev / next; "Page n of N"; arrow keys turn pages while focus is inside the reader.
- **Actions:** Read aloud / Stop (speech synthesis, `en-IN`; grid pages read the narration, then "Name says: bubble"); Export PDF; Share link; Edit pages.
- **Export dialog:** paper A4 / US Letter → Create PDF → preparing → ready (file name, pages, size, **Download PDF**) / error (Try again). Changing paper discards the prepared PDF. Fallback link: "Or use the browser's print dialog".
- **Share dialog:** creating → link + Copy (→ "Copied") + Preview as a guest / error.

### 3.14 Shared view (public)
- A blue banner "A storybook shared with you · read-only", title, reader, Read aloud. No editing, no reference images, no account data.

## 4. Global components and states

| Component | Behaviour |
|---|---|
| **Header** | Wordmark → Library; My storybooks; save status badge; account menu (email, Delete my images, Sign out) |
| **SaveStatus** | `All changes saved` · `Saving…` (pulsing dot) · `Saved on this device` (yellow; offline or sync failed) |
| **OfflineBanner** | Black bar: "You're offline. Your edits are kept on this device and will sync when you're back. Drawing is paused." |
| **Toasts** | Bottom-right, max 4, `aria-live="polite"`; 4 s (7 s with an action such as Undo or Read it); `warn` variant has a red shadow |
| **ConfirmDialog** | `role="alertdialog"`, Esc closes, destructive button red: delete storybook, delete all images, replace outline |
| **ReferenceTray** | Chips with icon, name, size, remove; "Add images" (multiple, JPEG/PNG/WebP/HEIC, ≤ 10 MB each, ≤ 8 per pick); per-file upload state |
| **PagePanel** | See §5 |
| **MockPanel** | Mock mode only; see §7 |

## 5. PagePanel (one component everywhere)
- Aspect ratio 210:297; sizes with container-query units so thumbnails, editor, reader and print share markup.
- **Kinds:** cover (blue, halftone, stroked yellow title, "Starring …" strip), middle (page white, page-number badge), end (red, caption box, big stroked "The End").
- **Layouts (middle):** `caption` (art + yellow caption), `full` (caption overlaid at the bottom), `grid` (2 columns × 3 rows; per-panel bubble alternating left and right; narration below).
- **Status overlays:** none ("Picture not drawn yet"), queued (dotted "Waiting its turn"), drawing (yellow stripes "Drawing…"), failed (red hatch "Couldn't draw this page"), done (image).
- Real images render as `<img>` from presigned URLs; all text is HTML (never inside images).

## 6. Client state, persistence and sync
- **Store:** stories (normalised), UI (current screen, dialogs, toasts), dev flags.
- **Autosave:** every edit writes to local storage immediately, then a debounced (≈900 ms) `PATCH`. Send `If-Match: <revision>`; on `409 STALE_REVISION` show "This book changed on another device" with Reload / Keep mine.
- **Offline:** detect with `navigator.onLine` and failed requests; queue PATCHes; on `online`, flush and resume the illustration queue; job polling backs off (2 s) instead of failing.
- **Job polling (`pollJob`):** every 0.8–1.5 s; resolve on `done`, reject on `failed`; cancellable with an `AbortSignal`; survives offline blips.
- **Uploads:** `POST /uploads` per file → `PUT` to the presigned URL with the same `Content-Type` → mark uploaded.

## 7. Mock mode
`VITE_MOCK=true` swaps `api/http.ts` for `api/mock.ts` (port it from the prototype). The mock must:
- Implement every method in `api-contract-spec.md` with the same shapes, including jobs (`queued` → `running` → `done`/`failed`).
- Simulate latency (story 9 s, or 45 s with "real timings"), image refusals and fallback notes, offline, and an empty / slow / error library.
- Seed two sample books (one finished grid book, one outline-stage single-scene book).
- Show a floating **Mock mode** panel with switches: image results (Always works / Realistic refusals / Always refused), library (Normal / Slow / Empty / Error), Story job fails, Real timings, Offline, Jump to screen, Reset demo data.
- PDF export is built in the browser in every mode (html-to-image + jsPDF from PagePanel); there is no export endpoint.

## 8. Visual design tokens
- **Type:** Bangers (display, buttons, step numbers; never sentences), Comic Neue 400/700 (body, 17 px / 1.45), JetBrains Mono (prompts, 13–14 px).
- **Colour:** ink `#141414`, yellow `#FFD93B`, red `#FF4A3D`, blue `#1F4FB8`, purple `#8A4FD1` (Moksh), paper `#F3EEE4` + 14 px halftone, page white `#FFFDF8`, info `#E6EEFF`, warn `#FFF4C2`, error tint `#FFE7E3`, error text `#B3261E`, muted `#4A4A4A`.
- **Borders / shadows:** panels 5 px + 6 px hard shadow; buttons 4 px + 4 px; chips and inputs 3 px + 3 px; no blur. Radii: panels 6, inputs 8, buttons 10, chips pill.
- **Spacing:** 4 · 8 · 12 · 16 · 20 (page gutter) · 24 (card gap) · 32 · 56 (section gap).
- **Buttons:** primary yellow (one per screen), secondary white, blue (share, draw sheet), red (only inside confirm dialogs), quiet (underlined); sizes 60 / 48 / 44 px.

## 9. Accessibility, responsiveness, print
- Real `<button>`, `<a>`, `<label>` + inputs; icon-only buttons have `aria-label`; toggles use `aria-pressed`; dialogs use `role="dialog"`/`alertdialog`, `aria-modal`, Esc to close, and focus is trapped and restored.
- 4 px blue focus ring on everything interactive; minimum target 44 px; text contrast ≥ 4.5:1 (white text only on blue and purple, or on red at display sizes with a stroke).
- Status is never shown by colour alone (words + badges).
- `prefers-reduced-motion` disables animation.
- Mobile-first: no horizontal scroll at 390 px; the stepper and toolbars wrap; the side panel stacks below.
- `print.css`: hides all UI; one PagePanel per sheet; `@page` set to A4 (10 mm margins) or Letter (0.4 in).

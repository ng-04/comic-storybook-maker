# Comic Storybook Maker v2

A kids' comic-book generator inspired by Hindu philosophy (Darshan), in the tradition of the Panchatantra, Jataka tales and the epics. A parent builds a katha in five steps and gets a printable comic with a life lesson (seekh). Claude writes the story; Gemini draws the pages. It deploys standalone on AWS.

## Read these first: the four specs (they are the source of truth, in this order)
1. `docs/goal-spec.md`: who it's for, the journeys (J1–J7), scope, and the acceptance criteria that define "done".
2. `docs/frontend-spec.md`: routes, screens, actions, every visible state, client state, offline sync, mock mode, design tokens, accessibility.
3. `docs/backend-spec.md`: data model, ownership checks, business rules, the AI retry ladder, jobs, storage, quotas, operating constraints.
4. `docs/api-contract-spec.md`: exact requests, responses, job results and error codes, plus the list of changes from the original contract.

If the prototype and the specs disagree, **the specs win**. In particular the prototype's mock still uses the older shapes (`POST /stories → jobId`, `pages/{n}`); port its behaviour, but match `api-contract-spec.md`.

## Design references
- `design/prototype.html`: a working, self-contained mock of every screen and state (open it in a browser; add `#paatra`, `#katha`, `#outline`, `#reader` and so on to jump straight to a screen). Use it as the behaviour reference.
- `design/canvas/Main.dc.html`: the newest version of the same prototype from Claude Design. It adds **Export as PDF** (the `createPdf` / `buildPdf` methods and the `exportPdf` mock). The `.dc.html` format is a design tool's component format, not production code: port the behaviour, don't copy the format.
- `design/canvas/PagePanel.dc.html`: the single page component (cover / middle / end; single scene, full picture, 3×2 grid; status overlays). It uses container-query units (`cqw`) so one component renders thumbnails, the reader and print.
- `design/canvas/DesignSystem.dc.html`: colours, type, spacing, borders, components, purushartha colours, character icons.
- `docs/original-brief-v2.md`: the original v2 requirements.

## Product flow (must keep)
Library → **1 Desh** (main place + up to 6 sublocations + place reference images) → **2 Kaal** (era or free text + optional ritu) → **3 Paatra** (male/female thumbnail icons; form: Human, Animal, Bird or Divine being; role: nayak, sahayak, mitra, guru, parivaar or pratinayak; key flag; the purusharthas Dharma, Artha, Kaam and Moksh with notes; multiple reference images; character sheet: draw, approve, regenerate) → **4 Paristhiti** → **5 Katha** (inspiration, plot, seekh, darshan lens, tone, age, 6/8/12 pages, style, format auto/single/3×2 grid) → Writing (async job, cancellable) → Outline review (edit, reorder, rewrite a page, switch single/grid, edit the 6 panel bubbles and speakers) → Pictures (cover first, then 3 at a time; queued/drawing/done/failed) → Page editor (redraw with Ctrl+Enter, version history, fallback notes) → Reader (read aloud, Export PDF A4/Letter, share link) → read-only shared view.

## Hard rules
- **No API keys, secrets or model names in the front end**, ever. Models are chosen in the backend (env/config). Keys live in AWS Secrets Manager.
- The front end builds to **static files** (React + Vite + TypeScript) for S3 + CloudFront.
- **All network calls go through `src/api/`**. `src/config.ts` has one flag, `VITE_MOCK`; `true` swaps in `src/api/mock.ts` (port the mock from the prototype: jobs, delays, refusals, offline, empty/slow/error library).
- **Anything that calls a model is async**: `POST` returns `202 { jobId }`; the UI polls `GET /jobs/{id}` (API Gateway times out at 29 s).
- Images never contain text. Captions and speech bubbles are HTML laid over the picture.
- Image retry ladder in the backend: with reference images → without them → text only; return `fallbackNote` saying which step worked. If all fail, the job fails with `IMAGE_SAFETY` / `IMAGE_OTHER`.
- Grid pages: draw 6 separate panel images (`panelImages[0..5]`) so the layout and bubble positions stay exact.
- Kaam is always written in a child-friendly way (wishes, ambition, love for family and friends). The story prompt must say so, and the output should be checked for age-appropriateness.
- Reference photos (often of children) are private: presigned S3 PUT/GET, never in share links or exports, deletable one by one or all at once, with a lifecycle rule for retention.
- Keep the look: Bangers / Comic Neue / JetBrains Mono; ink #141414, yellow #FFD93B, red #FF4A3D, blue #1F4FB8, purple #8A4FD1 (Moksh), paper #F3EEE4 with a 14px halftone; 5px panel borders, hard offset shadows. Mobile-first, 44px minimum touch targets, visible focus rings, print styles hide controls.

## Suggested AWS architecture (confirm with me before building)
- Front end: S3 (private) + CloudFront (OAC), SPA fallback to `index.html`.
- Auth: Cognito user pool (email + Google), Hosted UI with PKCE; API Gateway JWT authorizer.
- API: API Gateway HTTP API → Lambda (Node 20, TypeScript).
- Jobs: one SQS queue (each job carries a `kind`) → one worker Lambda (story, rewrite, sheet, page image); job state in DynamoDB.
- Data: DynamoDB (stories, characters, jobs, share tokens); S3 buckets for uploads (private) and generated images.
- PDF export: in the browser, as in Phase 1 (no server rendering, no export endpoint).
- IaC: AWS CDK (TypeScript). Environments: `dev` and `prod`. Region: ask me (default suggestion `ap-south-1`).
- Secrets: Anthropic and Gemini API keys in Secrets Manager; per-user rate limits on the story and image endpoints.

## How to work with me
- Work in phases (see `HANDOFF-PROMPT.md`). At the end of each phase: run the build, lint and tests, summarise what changed, and **stop for my review**.
- **Never deploy, create AWS resources or spend money without asking me first.** Show me `cdk diff` before any `cdk deploy`.
- Ask before adding any new third-party service or paid dependency.
- Keep the four specs in sync with the code: a contract change updates `api-contract-spec.md` first, and a new rule goes into `backend-spec.md`. Write tests from the acceptance criteria in `goal-spec.md` §6 and the contract tests in `api-contract-spec.md` §6.
- Settle the open questions in `goal-spec.md` §7 and `backend-spec.md` §6 with me; values marked *(default)* are proposals.
- Placeholders to fill with me: `[YOUR_DOMAIN]`, `[YOUR_API_BASE_URL]`, `[YOUR RETENTION POLICY]`.

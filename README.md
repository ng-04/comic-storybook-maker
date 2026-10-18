# Comic Storybook Maker v2

A parent builds a *katha* in five steps (Desh, Kaal, Paatra, Paristhiti, Katha) and gets a printable children's comic with a life lesson. Claude writes the story; Gemini draws the pages.

**Live (Phase 1):** https://ng-04.github.io/comic-storybook-maker/

## Phases

| Phase | Where | How the AI is called | Where books are stored |
|---|---|---|---|
| **1 (this)** | GitHub Pages | From the browser, with each user's own Anthropic and Gemini keys (kept in that browser's localStorage) | IndexedDB in the browser |
| 2 | AWS (S3 + CloudFront, API Gateway + Lambda, Cognito) | From Lambda workers; keys in Secrets Manager | DynamoDB + S3 |

The specs in `docs/` describe the Phase 2 product. Phase 1 builds the same screens and flow, with these differences:

- No sign-in. Settings asks for the user's own API keys (with Show/Hide and Test key) and an optional Anthropic workspace ID.
- Books and images live in the browser that made them. "Delete my images" deletes every reference photo from IndexedDB.
- Model names live in the front end (`src/state/settings.ts`), because the browser calls the APIs directly. Phase 2 moves them to backend config.
- No share links (they need a server). The reader offers PDF export and print instead.
- PDF export runs in the browser (html-to-image + jsPDF) from the same `PagePanel` the reader shows.
- Demo mode (`Try the demo`) runs the whole app with simulated stories and pictures: no keys, no cost.
- Optional shared keys: the owner creates `keys.enc.json` in Settings (API keys encrypted with a passkey: PBKDF2-SHA256 600k rounds + AES-256-GCM) and publishes it in `public/`. On load, visitors without keys are asked for the passkey; the right one unlocks the keys into their browser. The file is public, so the passkey must be long (12+ characters, enforced). Replace or delete the file to rotate or revoke.

## Code map

```
src/
  api/          the only code that calls AI services
    types.ts      StoryApi interface + ApiError
    direct.ts     Phase 1 client: Claude + Gemini from the browser
    claude.ts     Anthropic SDK, structured JSON output, refusal fallbacks, error mapping
    gemini.ts     Gemini image REST call, retry ladder, concurrency limit (3)
    prompts.ts    story system prompt (content rules), schemas, image prompts
    mock.ts       demo mode / tests
  domain/       types, constants, pure rules (format auto-pick, missing fields, read-aloud text)
  state/        store (actions, illustration queue), IndexedDB, settings, image resize
  components/   PagePanel (one page component everywhere), dialogs, step bar, shell
  screens/      Landing, Settings, Library, setup/*, Writing, Outline, Illustrate, PageEditor, Reader
  pdf/          in-browser PDF export
docs/           specs from Claude Design (goal, frontend, backend, API contract) + handoff notes
design/         the Claude Design prototype (behaviour reference, not production code)
```

For Phase 2, add `src/api/http.ts` implementing `StoryApi` against `docs/api-contract-spec.md`: each method starts a job (`202 { jobId }`) and polls `GET /jobs/{id}`, so screens don't change. Persistence (`state/db.ts`) moves behind the same API.

## Develop

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # unit, flow (demo mode end to end) and screen tests
npm run build      # static files in dist/
```

Pushing to `main` runs tests, builds, checks the bundle for anything that looks like an API key, and deploys to GitHub Pages (`.github/workflows/pages.yml`).

## Costs and safety notes for users

- Each user pays for their own usage. A 12-page book with single-scene pages is about 13 pictures plus character sheets; grid pages need 6 pictures each.
- Keys are only as safe as the browser they're saved in. Don't save them on shared computers; set spend limits on both accounts.
- Photos of children are often declined by the image service. The app retries without the photos (using the approved cartoon sheets), then from text only, and says which step worked.

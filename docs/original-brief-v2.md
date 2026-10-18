Design and prototype "Comic Storybook Maker v2": a web app that turns a family into the heroes of a personalised, printable children's comic book. Claude writes the story and Gemini draws the pages.

## Context
v1 is live as a single-page static app (form → story → 6–12 comic pages → print to PDF). It works, but users paste their own API keys into the browser, every page is drawn at once with no chance to review the story first, and character consistency is weak. v2 will be deployed standalone on AWS, with all AI calls going through my own backend, so the front end must never hold API keys.

## Keep from v1 (the look)
- Comic style: Bangers for titles, Comic Neue for body, JetBrains Mono for prompts.
- Colours: ink #141414, yellow #FFD93B, red #FF4A3D, blue #1F4FB8, paper #F3EEE4 with a 14px halftone dot background.
- Thick 5px black borders, hard offset shadows, big titles with a text stroke plus a hard shadow.
- Cover page blue, middle pages yellow caption boxes, last page red with a big "The End".
- Refine it so it feels like a polished product rather than a prototype, but keep it playful.

## v2 flow (must have)
1. **Library**: my saved storybooks as cover thumbnails, plus "New storybook".
2. **Characters**: add character cards (name, age, role such as hero / sibling / parent / pet, a short appearance description, optional photo). The hero is required. Generate a cartoon "character sheet" image per character and let me approve or regenerate it before the story is drawn. Approved sheets are the reference images for every page, which keeps characters consistent.
3. **Story setup**: story idea, tone (Superhero action, Funny, Heartwarming, Adventurous, Gentle bedtime), reading age, page count (6 / 8 / 12), art style (comic, watercolour, crayon).
4. **Review outline**: Claude's draft as a list of pages, each with an editable caption and image prompt. I can reorder, delete, add a page, or "rewrite this page", all before any pictures are drawn, so no image credits are wasted on a story I don't like.
5. **Illustrate**: draw the cover first, then the remaining pages a few at a time, with an overall progress indicator and a clear state per page (queued, drawing, done, failed).
6. **Page editor**: for any page, edit the caption and prompt, Redraw (Ctrl+Enter too), and keep a version history so I can pick between versions. Show a small note when a page needed a fallback (see Errors).
7. **Read & export**: a reader view with page-turn navigation and an optional "Read aloud" button using the browser's speech synthesis. Export a print-ready PDF (one page per sheet, A4 and US Letter), and a share link for a read-only view.

## Nice to have (design for them, build if time allows)
- Speech bubbles or a narration box laid over the image as real HTML text. Images must never contain text.
- Page layouts: full image, image + caption, two panels.
- Duplicate a storybook to make a sequel with the same characters.

## Errors and edge cases to design properly
- Image refusals are common (Gemini returns `IMAGE_OTHER` or `IMAGE_SAFETY`, especially when a real photo of a child is attached). The backend retries in steps (with photo → without photo → text only) and reports which step worked. Show that as a friendly note, and show a clear message with "edit prompt and redraw" when every step fails.
- Story generation can take 30–60 seconds: show progress and keep it cancellable.
- Empty, loading and error states for every screen; works offline-safe (no lost edits).
- Photos of children are sensitive: show what is uploaded, a "delete my photos" control, and a short plain-language privacy note.
- Mobile-first, keyboard accessible, good contrast; print styles hide all controls.

## Technical constraints (important for the AWS deployment later)
- Front end must build to **static files** (React + Vite or plain HTML/CSS/JS) so it can be hosted on S3 + CloudFront.
- **No API keys in the front end.** All AI and storage calls go through one `api` module that talks to my backend. Include a **mock mode** (fake stories, placeholder images, simulated delays and failures) so the prototype runs with no backend, toggled by one config flag.
- Long-running work must be **asynchronous**: API Gateway times out at 29 seconds, and story and image generation can exceed that. Starting a job returns a `jobId`; the UI polls (or uses a WebSocket) until it is done.
- Assume Cognito sign-in (email or Google). Design the sign-in screen and a signed-out landing page.
- Images and photos are uploaded and served via S3 (presigned URLs), not stored in the browser.
- Use this API contract and document it in a README so I can implement it with Lambda:
  - `POST /stories` → `{ jobId }`; job result `{ storyId, title, characters, pages: [{ caption, imagePrompt }] }`
  - `GET /stories`, `GET /stories/{id}`, `PATCH /stories/{id}` (edit captions, prompts, order), `DELETE /stories/{id}`
  - `POST /characters/{id}/sheet` → `{ jobId }`; result `{ imageUrl }`
  - `POST /stories/{id}/pages/{n}/image` with `{ prompt }` → `{ jobId }`; result `{ imageUrl, versionId, fallbackNote }`
  - `GET /jobs/{jobId}` → `{ status: queued | running | done | failed, result?, error? }`
  - `POST /uploads` → `{ uploadUrl, fileUrl }` (presigned S3 PUT)
  - `POST /stories/{id}/share` → `{ shareUrl }`
- Keep models out of the front end; the backend decides which Claude and Gemini models to use.

## Deliverables
1. The clickable prototype covering every screen and state above, running in mock mode.
2. A short design-system page: colours, type, spacing, components (buttons, cards, page panel, toasts, progress).
3. A README with the screen map, the API contract, and the list of front-end files.

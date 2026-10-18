# Goal spec: Comic Storybook Maker v2

> Who is this for, what should they accomplish, what is in scope, and how will we recognise success?
> Companion specs: `frontend-spec.md` (screens and states), `backend-spec.md` (data, rules, operations), `api-contract-spec.md` (exact messages).

## 1. Product in one paragraph
A web app that turns a family's own story idea into a personalised, printable children's comic book in the storytelling tradition of the Panchatantra, Jataka tales and the Itihasa. The parent builds a *katha* the way traditional storytellers did: **Desh** (place), **Kaal** (time), **Paatra** (characters and what drives them, through the four purusharthas: Dharma, Artha, Kaam, Moksh), **Paristhiti** (circumstances) and **Katha** (plot and life lesson, *seekh*). Claude writes the story; Gemini draws the pages. The parent reviews everything before any picture is drawn, then reads the book on screen, prints it, or shares a read-only link.

## 2. Who it is for

| Persona | Who | What they need |
|---|---|---|
| **Creator** (primary) | A parent, grandparent or teacher, often in India or the diaspora, comfortable with a phone or laptop but not technical | To make a meaningful, culturally rooted story starring their child, family or class, with a clear moral, without writing or drawing skills |
| **Young reader** | A child aged 3–10 | Big, clear pages; short captions; speech bubbles; read-aloud; consistent characters they recognise |
| **Guest reader** | Family members who receive a share link | To read the book on any device without an account, and see nothing private |
| **Operator** | The app owner (you) | Predictable AI costs, no leaked keys, safe content for children, easy deployment on AWS |

## 3. What they should accomplish (core journeys)

| # | Journey | Done when |
|---|---|---|
| J1 | **Set up a katha**: choose desh + sublocations, kaal, paatra (with gender icon, form, role, purusharthas, optional reference images), paristhiti and katha (inspiration, plot, seekh, format) | The creator presses *Write my katha* with all required fields valid |
| J2 | **Approve characters**: draw a cartoon character sheet per character, approve or regenerate | Every character has an approved sheet; these become the reference for every page |
| J3 | **Review the story before drawing**: read the page-by-page outline; edit captions, bubbles and prompts; reorder, add, delete or rewrite pages; switch a page between single scene and 3×2 grid | The creator presses *Draw the pictures*. No image credits are spent before this point (except character sheets) |
| J4 | **Illustrate and recover from refusals**: watch pages draw (cover first, then 3 at a time); see fallback notes; fix failed pages by editing the prompt and redrawing; pick between versions | Every page is *done* |
| J5 | **Read, print, share**: page-turn reader with read-aloud; export a print-ready PDF (A4 or US Letter); create a read-only share link | A PDF is downloaded or a link is sent |
| J6 | **Continue the world**: make a sequel with the same desh, kaal, paatra and approved sheets | A new draft opens at Paristhiti |
| J7 | **Stay in control of private data**: see uploaded images, delete one or all | Deleted images are gone from storage and never reach share links or exports |

## 4. Scope

### In scope (v2)
- Sign-in with Amazon Cognito (email + password, Google); a signed-out landing page.
- Library of the user's storybooks: cover thumbnails, status, new, open, sequel, delete.
- The five-step setup (Desh, Kaal, Paatra, Paristhiti, Katha) with the fields listed in `frontend-spec.md`.
- Character sheets with approve / regenerate; reference images (multiple, optional) for characters and places.
- Outline review with full editing before any page image is drawn.
- Page formats: **single scene** (picture + caption), **full picture** (caption overlaid), **3×2 comic grid** (six panels, one speech bubble each); **Auto** picks per story complexity.
- Async generation for story, sheets, page images and rewrites, with progress, cancel and failure states. PDF export runs in the browser.
- Image refusal handling: the backend retries with references → without references → text only and reports which step worked; a clear recovery path when all fail.
- Page editor with version history and Ctrl+Enter redraw.
- Reader with page-turn and read-aloud (browser speech synthesis); PDF export; read-only share links.
- Offline-safe editing (no lost edits); mobile-first, keyboard accessible, good contrast.
- **Mock mode** (one config flag) so the front end runs with no backend.
- Deployment on AWS: S3 + CloudFront, API Gateway + Lambda, Cognito, S3 for media; no API keys in the front end.

### Out of scope (v2)
- Payments, credits or subscriptions (keep a hook for quotas, but no billing).
- Story text in languages other than English (see open questions).
- Collaborative editing by several users on one book.
- Ordering physical printed books.
- Native mobile apps.
- Training or fine-tuning models.
- Images that contain text (all text stays HTML).

### Nice to have (design for, build if time allows)
- Redrawing a single grid panel.
- Revoking share links.
- Audio narration recorded by the parent.

## 5. Principles that shape decisions
1. **Review before spend.** Nothing expensive happens until the creator has approved the outline and the characters.
2. **Child-safe by default.** Stories are age-appropriate for the selected reading age; Kaam is framed as wishes, ambition and love for family and friends. Prompts and outputs pass safety rules (see `backend-spec.md`).
3. **Culturally respectful.** Inspired by, not copying, traditional tales; the seekh is explicit; terms (desh, kaal, paatra…) are used and explained.
4. **Private by default.** Reference images are used only for drawing and never leave the owner's account.
5. **Honest about AI.** Fallbacks and failures are shown in plain language with one clear next action.

## 6. How we recognise success

### Launch acceptance criteria (must all pass)
| Area | Criterion | How to check |
|---|---|---|
| Journeys | J1–J7 can each be completed end to end in mock mode and against the dev backend | Playwright E2E suite, one test per journey |
| Spend control | Zero page-image jobs are created before *Draw the pictures* | Backend log/metric `page_image_jobs_before_approval == 0` |
| Async | No API request takes longer than 29 s; every model call returns `202 { jobId }` | API Gateway latency metric; contract tests |
| Refusals | When a page is refused at every step, the UI shows the failure note and the creator can edit and redraw successfully | E2E with mock "Always refused" then "Always works" |
| Consistency | Every page-image request carries the approved sheet references for the characters in it | Backend unit test on request builder |
| Privacy | Share view and PDF never include reference images or private fields; "Delete my images" removes all upload objects | Contract tests + S3 listing check |
| Security | No secrets or model names in the built front-end bundle; every resource read/write checks ownership | Bundle grep in CI; authorisation tests (cross-user access returns 404) |
| Offline | Edits made offline survive reload and sync when back online | E2E with network offline |
| Accessibility | Lighthouse accessibility ≥ 90 on every screen; all actions reachable by keyboard; text contrast ≥ 4.5:1 | Lighthouse CI + manual keyboard pass |
| Print | Exported PDF has one comic page per sheet in A4 and US Letter, no UI chrome | Open the file; page count = story pages |
| Mobile | No horizontal scroll at 390 px wide on any screen | Playwright viewport test |

### Outcome metrics (track after launch; set targets with real data)
| Metric | Definition | Target |
|---|---|---|
| Setup completion | % of new katha drafts that reach *Write my katha* | [TARGET] |
| Outline-to-drawing | % of written outlines that go on to *Draw the pictures* | [TARGET] |
| Clean draw rate | % of page images done on step 1 (no fallback) | [TARGET] |
| Recovery rate | % of failed pages that end *done* after an edit | [TARGET] |
| Time to first outline | Median seconds from *Write my katha* to outline shown | [TARGET] (story jobs typically take 30–60 s) |
| Books finished | % of books that reach *Ready to read* | [TARGET] |
| Cost per book | Median model spend per finished book | [TARGET] |

## 7. Open questions (decide before or during build)
1. Story language: English only, or also Hindi or other Indian languages (with scripts in captions and PDF fonts)?
2. Quotas: how many books, sheets and redraws per user per day before rate-limiting?
3. Retention: how long are reference images and generated media kept? (`[YOUR RETENTION POLICY]`)
4. Minimum age and consent wording for uploading photos of children.
5. AWS region (suggested `ap-south-1`, Mumbai) and production domain (`[YOUR_DOMAIN]`).
6. Should share links expire by default?

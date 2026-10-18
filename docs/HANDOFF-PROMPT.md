# Kickoff prompt for Claude Code

Paste this as your first message after opening this folder in Claude Code.

---

Read CLAUDE.md, then the four specs in order: docs/goal-spec.md, docs/frontend-spec.md, docs/backend-spec.md, docs/api-contract-spec.md. Then open design/prototype.html and design/canvas/Main.dc.html to see the intended behaviour. Don't write code yet.

First, give me:
1. A short plan for the phases below, mapping each phase to the journeys (J1–J7) and the acceptance criteria in goal-spec.md §6.
2. Anything ambiguous or contradictory across the four specs.
3. Your questions for me, including the open questions in goal-spec.md §7 and backend-spec.md §6, and the values marked *(default)*.

Then we'll go phase by phase. Stop after each phase for my review.

**Phase 1 · Front end in mock mode** (frontend-spec.md). Scaffold React + Vite + TypeScript. Generate `src/api/types.ts` from api-contract-spec.md §3. Build every route, screen and state, PagePanel, the stepper, autosave and offline sync, print CSS and accessibility. `src/api/mock.ts` must implement the **new** contract (ported behaviour from the prototype, including PDF export); `src/api/http.ts` implements the same interface. Tests: unit tests (pollJob, format auto-pick, autosave and sync) plus a Playwright journey test for each of J1–J7 in mock mode.

**Phase 2 · Backend core** (backend-spec.md §2–4, api-contract-spec.md §4). Lambda handlers with ownership checks, the DynamoDB data model, the job pattern with SQS workers using stub AI clients, presigned uploads, share tokens, quotas, idempotency and `If-Match`. Contract tests from api-contract-spec.md §6, run locally.

**Phase 3 · Real AI.** Claude story and rewrite workers (structured JSON validated against the schema, child-safety rules, output check). Gemini sheet and page workers (approved sheets as references, 6 panels for grids, the retry ladder with fallbackNote and fallbackStep). Server-side PDF export. Model names from config; keys from Secrets Manager.

**Phase 4 · Infrastructure** (backend-spec.md §1, §5). AWS CDK stacks for dev and prod: S3 + CloudFront, Cognito (email + Google), HTTP API + JWT authorizer, Lambdas, SQS + DLQs, DynamoDB (TTL, PITR), S3 buckets with lifecycle rules, Secrets Manager, alarms and a budget. Show me `cdk diff`; don't deploy until I say so.

**Phase 5 · Deploy and CI.** Deploy to dev with my approval and run the acceptance checklist from goal-spec.md §6 against it. Then add GitHub Actions (build, test, bundle secret-grep, `cdk deploy` dev/prod) and a short runbook.

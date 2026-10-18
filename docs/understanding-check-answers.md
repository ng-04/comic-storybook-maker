# Understanding check: answer key (for the reviewer)

Questions are in `understanding-check.md`. Each answer names the file and function where it can be checked.

1. `api/direct.ts` → `drawSimplePage`, with `drawWithLadder` in `api/gemini.ts`.
   - **Cover:** the page itself is the cover, so there is no cover reference. First a request with the photo (step 1), then text only. The note is the "drawn from the text only" message (`FALLBACK_NOTES.textOnly`), and the step jumps from 1 to 3 because there is no middle step.
   - **Page 3:** photo + cover → cover only, with the "without your reference photos, matching the cover" note → text only.
   - In both cases each step is tried once, because a refusal moves straight to the next step without the transient retries.

2. `gemini.ts` → `slot()`: at most 3 Gemini requests run at once (`MAX_CONCURRENT = 3`) across the whole app, and `requestOnce` has no time limit. The redraw waits forever for a free slot. Reloading the page is the only way out; `revive` then puts the pages back in the queue. This is the "slow provider" gap from the design review.

3. `state/store.ts` → `revive()`, called by `loadLibrary`. Pages that were `drawing` become `queued`. The sheet becomes `review` if it has an earlier version, otherwise `none`. The old requests lived only in the closed tab: their `AbortController`s and promises are in memory, and nothing on a server holds the result.

4. In `store.ts`:
   - **Mechanism 1:** `writeOutline` aborts the previous story request, and on success calls `stopIllustrating`, which aborts every drawing on the old pages.
   - **Mechanism 2:** the new outline creates new page IDs, so a late `updatePage` for an old page ID matches nothing and does nothing.
   - **Side effect:** if an old picture had already arrived and was being saved, its image file stays in IndexedDB with nothing using it. Storage is wasted, but the user doesn't see it.

5. `store.ts` → `drawPage` catch block: the status becomes `done` because the page has versions, and `error` is set.
   - The grid still shows the earlier picture as Done.
   - The page editor shows the red "We couldn't draw this page" box from `p.error`.
   - Why: a finished book shouldn't become unreadable, or "not done", because an optional redraw failed. The earlier picture is still valid.

6. The paths:
   - **`drawSheet`:** from "Draw character sheet", "Regenerate" or "Draw all sheets" (Advanced only).
   - **`drawPage` via `pump`:** from `startIllustrating` ("Draw the pictures" or "Looks good, draw it") and `retryFailed`.
   - **`drawPage` directly:** Redraw or Ctrl+Enter in the page editor.
   - **The `online` event listener at the bottom of `store.ts`:** it calls `pump` for books that are still drawing when the connection returns. This is the one that fires without a click.
   - `testGeminiKey` only looks up the model, which is free.

7. Anyone can download the encrypted file, so an attacker can guess passkeys offline as fast as their computer allows. A short or common passkey would be found quickly.
   - The real protection is AES-256-GCM, with the key derived from the passkey by PBKDF2-SHA256 over 600,000 rounds (`state/vault.ts`), which slows down each guess. The unlock screen and the gate on page load are just navigation; they protect nothing.
   - Once unlocked, the keys sit in that browser's localStorage as full-access keys. Anyone with access to that browser, or a malicious extension, can read them. Revoking them means replacing the keys at Anthropic and Google, not just publishing a new file.

8. `direct.ts` grid branch: the panels share a local `AbortController` (`group`). When panel 4's final refusal rejects, `.catch` calls `group.abort()`. Panels still waiting or retrying stop with "Cancelled", and `Promise.all` rejects with panel 4's error.
   - Panels that had already finished are discarded and not saved, because a version is only recorded once all six exist. The page shows Failed if it had no earlier version.
   - Why: a grid version must have exactly six panel images, and stopping the rest avoids paying for panels that will be thrown away.

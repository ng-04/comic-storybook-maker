# Understanding check: Comic Storybook Maker

A short set of questions that need the code to answer (not the README or the specs), used alongside the design-decision walkthrough. The answer key is in `understanding-check-answers.md`.

1. **The refusal ladder.** In Simple mode, a family photo is attached and Gemini refuses every request with `IMAGE_OTHER`. List, in order, the requests sent for the **cover** and for **page 3**, the image or images attached to each, and the note the user finally sees on each page if the last step succeeds.

2. **A stuck queue.** Three Gemini requests hang and never return. The user opens another page and presses Redraw. What happens, and which line of code explains it? What should the user do?

3. **Reopening the tab.** The user closes the tab while two pages show "Drawing…" and a character sheet is mid-draw, then reopens it. What state are those pages and that sheet in, which function decides that, and why can't it simply resume the old requests?

4. **A new draft during drawing.** In Advanced mode, pages are drawing when the user writes a new draft. Explain the two mechanisms that stop a picture from the old outline attaching to the new pages, and the one side effect that can still happen.

5. **A failed redraw.** A page already has a picture. The user redraws it and Gemini refuses at every step. What status does the page end with, what does the Pictures grid show, what does the page editor show, and why was it designed that way rather than marking the page failed?

6. **Every path to spending.** Name every code path that can send a billed request to Gemini, and the user action or event that triggers each. Which one fires without the user clicking anything?

7. **The passkey's real protection.** `passkeyProblem()` runs only in the browser of whoever creates `keys.enc.json`. Why does rejecting `admin` still matter? What exactly protects the keys, and what can't it protect against once someone has unlocked them?

8. **Grid pages.** In a 3×2 grid page, panel 4 is refused at every step. What happens to the requests for panels 1, 2, 3, 5 and 6, is any version saved for the page, and why?

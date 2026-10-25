# AI usage and credits

> **Before you submit:** every line marked **⚠️ CONFIRM** needs your own check or wording. The rest was written from what the repository, its history and the build sessions show. Don't leave a ⚠️ in the submitted version, and don't overstate or understate either side's role. The Congressional App Challenge allows AI only when it's disclosed, and you must be able to explain how your code works.

## 1. AI tools used to build KitGap

| Tool | Model | What it was used for | Evidence |
| --- | --- | --- | --- |
| Claude Code (Anthropic) | Claude Opus 5.5 in the October 25 sessions. ⚠️ CONFIRM the model shown in your earlier sessions (October 23–24). | Most of the code, the database migrations, the tests, the documentation, the research notes, design changes and code reviews | Commits by "KitGap Builder" and "Claude" on October 23 (16 commits). Later commits under your account were also made in Claude Code sessions. |
| Impeccable (design-review plugin, run inside Claude Code) | (runs on the Claude Code model) | Automatic design checks while pages were edited | `.impeccable/`, hook messages in the sessions |
| Gemini (Google) | ⚠️ CONFIRM the model | A product review: cold start, AI positioning, verification friction. You reported this; it wasn't used to write code, as far as the repository shows. ⚠️ CONFIRM | Your own statement |
| ChatGPT (OpenAI), browser agent | ⚠️ CONFIRM whether you used it, and for what | `docs/chatgpt-agent-prompt.md` is a prompt written for it | That file |
| Codex, Cursor | ⚠️ CONFIRM whether either was used. Their folders (`.codex/`, `.cursor/`) exist in the project but aren't in the git history. | | Folders only |

### What the AI assistant did

- **First build (October 23):** from your written brief, Claude Code:
  - chose the stack;
  - designed the data model and the quantity rules;
  - wrote the app, the migrations, the demo sandbox and the scripts;
  - wrote and ran the unit, integration, browser and accessibility tests;
  - wrote `docs/`.
- **October 24–25, at your direction:**
  - a redesign;
  - phone layout and installable app;
  - native iOS and Android projects;
  - the community-first rework;
  - Kit, the helper;
  - security fixes from the audit;
  - this document's first draft.

## 2. AI that KitGap uses while running

| Feature | Model or service | Where it runs | What is sent |
| --- | --- | --- | --- |
| **Kit's answers and drafts** (the bottom-right helper, and "Ask Kit" on a need) | `gemma-4-31b-it`, through the University of Florida's NaviGator AI service (an OpenAI-compatible API), set with `KIT_AI_MODEL` | UF NaviGator servers | The facts Kit uses: the names of the organization, the need and the helping groups, totals, page views, deadlines, the person's display name, and the question. Not emails, phone numbers, drop-off details or private notes. |
| **Kit listening** (voice questions) | `whisper-large-v3`, same service | UF NaviGator | The voice recording, only while the mic is on. KitGap doesn't store it. |
| **Kit speaking** | `kokoro` text-to-speech, same service; the browser's own voice if unavailable | UF NaviGator, or the device | Kit's short answer text |
| **Photo counter** (`/tools`, an experiment) | `onnx-community/grounding-dino-tiny-ONNX` via Transformers.js | In the visitor's browser; the photo never leaves the device | Nothing |
| **"Found online" drives** | Exa search API (`api.exa.ai`) | Exa | The search words (topic and place) |

**Safeguards in the code:**
- **Kit only states numbers that appear in the need's real data.** A draft with any other number is thrown away (`onlyKnownNumbers`, `src/domain/kit-helper.ts`).
- **Kit only links to pages from an allowed list** (`src/server/kit/assistant-ai.ts`).
- **Kit falls back to written rules** if the AI is slow, down or over its daily cap.
- **Only signed-in people and demo visitors can use the AI**, with daily caps per person and for the site (`src/server/kit/usage.ts`). Signed-out visitors get the written answers only.
- **Kit can't change anything.** It links to the page where the person acts.

## 3. What the student did

⚠️ **CONFIRM AND REWRITE IN YOUR OWN WORDS.** Only list what is true. The repository shows the following, but only you know the details:

- **The idea and the brief:** you wrote the original product brief (purpose, scope, quantity rules, design direction and acceptance tests) that the first build was made from. ⚠️ CONFIRM, and say what made you think of it.
- **Product decisions you made during the build** (taken from your instructions in the sessions; ⚠️ CONFIRM each):
  - making it community-first (pantries, shelters, schools, senior homes, pet rescues) with school clubs third;
  - cutting the tabs to four after your brother tested it and found it confusing;
  - moving "Find drives elsewhere" into Find;
  - the two confirmation labels;
  - the packing animation and a colorful logo;
  - wanting it to be a phone app;
  - the share-to-Instagram kit and reach numbers;
  - Kit as a helper with voice;
  - choosing the UF NaviGator models;
  - refusing fake testimonials;
  - asking for these audits.
- **Testing:** ⚠️ CONFIRM who tested it (your brother?) and what changed because of it. `docs/user-testing.md` has the task sheet.
- **Code you wrote or changed yourself:** ⚠️ FILL IN with file names. If the answer is "none so far", say so honestly, and make one change yourself before submitting (ideas in `docs/cac-demo.md`).
- **Deployment and accounts:** you set up the Supabase project, the Vercel deployment, the GitHub repository and the UF NaviGator key. ⚠️ CONFIRM.

## 4. What the student can explain

⚠️ FILL IN. Practice explaining at least these, without notes (see `docs/cac-demo.md`):

1. Why two groups can't take the same last kits: the `for update` lock in `loadRequestState` (`src/server/services/core.ts`), and the test in `tests/integration/drives.test.ts`.
2. How a retry doesn't create a duplicate: the idempotency key in `mutate()` (`core.ts`).
3. Why "only what the organization confirms counts": `requestTotals` (`src/domain/quantities.ts`).
4. How the demo stays separate from real data: `src/proxy.ts` and `src/server/demo/sandbox.ts`.
5. How Kit avoids making up numbers: `onlyKnownNumbers` (`src/domain/kit-helper.ts`).

## 5. Libraries, services and assets

- **Frameworks and libraries:**
  - Next.js, React, TypeScript, Tailwind CSS
  - postgres.js, Zod, qrcode
  - Lucide icons (ISC license)
  - Capacitor (iOS and Android)
  - Transformers.js (Hugging Face)
  - Vitest, Playwright, axe-core
- **Services:**
  - Supabase (sign-in and the Postgres database)
  - Vercel (hosting)
  - University of Florida NaviGator AI (Kit)
  - Exa (search for "Found online")
  - GitHub (code)
- **Fonts:** Petrona and Archivo Narrow, through Google Fonts (SIL Open Font License).
- **Photographs:** three Unsplash photos (Unsplash License), credited on the About page: backpack by Sun Lingyan, notebook by Marissa Grootes, pencils by Jess Bailey.
- **Guidance cited on the home page:** FEMA and National VOAD advice on donating what's needed.
- **Sample data:** every organization, group and person in the demo is fictional and labeled "(sample)". The demo's page-view numbers are made up too.

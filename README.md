# Hirizz

A browser-local job search tracker. Run `node server.mjs`, then open http://127.0.0.1:3000. No installation or API key required. Run `node --test --test-isolation=none tests/*.test.mjs` for matching logic checks. npm scripts are also available when npm is installed.

Features: one base resume (paste, DOCX or TXT import), automatic job-link retrieval and job description highlights, keyword match estimates, gap suggestions, evidence selection for tailored TXT or printable resumes, manual status updates and history, notes, follow-up dates, search, filtering, insights, and JSON backup/restore.

Data lives in localStorage for the current browser and origin. There is no cloud synchronization. Export backups before switching browsers or clearing site data. Resumes and application records remain in your browser. When you read a job link, the URL is sent to Hirizz’s server, which retrieves the public posting. Public DNS resolution uses Cloudflare DNS. Google Fonts is the only external browser page resource.

The keyword estimate counts unique job-description words present in the base resume after a small stop-word filter; it is not an employer ATS score. Draft generation copies selected base-resume lines exactly. It does not invent experience or rewrite text. Manual edits require user review. Job links are read automatically through a server endpoint. Greenhouse and Lever use public job board feeds; other pages use JobPosting JSON-LD or readable page text. Sign-in walls, bot blocking, expired links, and JavaScript-only pages may prevent import; use an employer direct link. Highlights are deterministic excerpts and known skill mentions, not AI interpretation. PDF import, semantic matching, AI suggestions, and grounded rewriting are future integrations.

Word uploads use the bundled Mammoth 1.11.0 library to extract plain text locally; formatting and images are not preserved. Files are limited to 5 MB. Legacy .doc files must first be saved as .docx. Failed imports leave existing editor text intact.

`dist/match.js` isolates matching/evidence functions for a future analysis adapter. `dist/app.js` owns UI and local persistence. A future API must run server-side, validate evidence for every generated claim, and keep credentials outside browser code.

Run `node scripts/build.mjs` to produce the self-contained Sites Worker in `dist/server/index.js`. Browser assets are embedded; the existing site identity and origin stay unchanged. `worker/jd.js` implements bounded public HTTPS fetching with DNS checks, redirect validation, timeouts, and a response size limit.

Opportunity rows and match percentages open a right-hand analysis drawer with match evidence, keyword filters, grounded improvement suggestions, job highlights, drafts, and activity. The estimated ATS score is a disclosed heuristic: 70% literal keyword coverage + 30% passed text checks (four section headings, email, dates, quantified outcomes). It does not validate file layout or predict employer ATS behavior.

The Tailor resume button creates and saves a grounded draft per opportunity, preserves a previous draft for restore, and compares current draft and base scores. Non-AI tailoring standardizes existing section headings, expands a fixed list of equivalent abbreviations only when the job uses that term, and creates a skills section only from skills already demonstrated by action statements in the base resume. It preserves record order, dates and metrics. No score improvement is promised; unsupported gaps remain gaps. TXT download and print/save PDF use the current draft editor.

Hirizz is available as the hosted web app and a standalone Windows desktop app. See desktop/README.md for build and distribution instructions. The web version includes a manifest and offline shell service worker for browser installation after an initial signed-in visit. The existing private web audience is preserved. The Windows installer runs independently of that site and stores each person’s data locally. Move data between web and desktop with Export backup / Import; there is no automatic synchronization. Run the web build before the platform tests.

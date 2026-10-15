# Hirizz

A browser-local job search tracker. Run `node server.mjs`, then open http://127.0.0.1:3000. No installation or API key required. Run `node --test --test-isolation=none tests/match.test.mjs` for matching logic checks. npm scripts are also available when npm is installed.

Features: one base resume (paste or TXT import), job links and pasted descriptions, keyword match estimates, gap suggestions, evidence selection for tailored TXT or printable resumes, manual status updates and history, notes, follow-up dates, search, filtering, insights, and JSON backup/restore.

Data lives in localStorage for the current browser and origin. There is no cloud synchronization. Export backups before switching browsers or clearing site data. No resume or job records are sent to a server. Google Fonts is the only external page resource.

The keyword estimate counts unique job-description words present in the base resume after a small stop-word filter; it is not an employer ATS score. Draft generation copies selected base-resume lines exactly. It does not invent experience or rewrite text. Manual edits require user review. Job links are reference links; descriptions must be pasted. PDF/DOCX import, automatic JD retrieval, semantic matching, AI suggestions, and grounded rewriting are future integrations.

`dist/match.js` isolates matching/evidence functions for a future analysis adapter. `dist/app.js` owns UI and local persistence. A future API must run server-side, validate evidence for every generated claim, and keep credentials outside browser code.

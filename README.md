# NEASH — Project Knowledge Continuity & Handover Platform

> **"Knowledge Should Never Leave With People."**

NEASH transforms scattered project artifacts — meeting notes, CSV task logs, Slack/Teams chat exports, architecture specs, and PDFs — into a structured, evidence-backed, multi-user verified project handover.

Built for independent evaluation with zero walkthrough required: open the workspace, stage or upload a document, inspect verified citations, reconcile cross-source contradictions, collaborate across roles via a shared workspace URL, and export the final signed-off Handover PDF.

---

## Key Features Implemented

### Core Continuity Workflow
- **2-Minute Judge Evaluation Banner & Continuity Overview:** Instant KPI summary (Uploaded Sources, Extracted Decisions, Pending Tasks, Active Blockers, Open Conflicts, Sign-Off Status), project continuity alert banner, and direct `Generate Handover` call-to-action.
- **Multi-Format Source Ingestion (`Sources`):** Preloaded `DEMO DATA` corpus for the E-commerce Platform handover plus client-side `PDF.js` (`.pdf`) and UTF-8 (`.txt`, `.md`, `.csv`, `.json`) parsing with 4 MB guardrails and one-click `Sprint_Handover_Addendum.txt` staging.
- **Structured Knowledge Hub (`Knowledge Hub`):** Categorized extraction cards for Decisions, Tasks, Blockers, Knowledge Gaps, and Risks, with confidence ratings, search/filter controls, inline human editing, and clear separation between original extracted claims and human edits.
- **Evidence Traceability Drawer (`EvidenceDrawer`):** Slide-over inspector linking every claim directly to its source document with highlighted verbatim evidence passages.
- **Human Verification Center (`Verification Center`):** Approve, Flag, Edit, or Reset claims with persisted reviewer attribution, timestamps, and live verification progress.
- **First-Day Brief & Handover Timeline:** Incoming-engineer onboarding brief (`First-Day Brief`) and chronological decision/milestone timeline (`Timeline`).
- **Dynamic PDF & Markdown Handover Reports (`Handover Reports`):** Live report assembled strictly from current verified workspace state, downloadable via `jsPDF` (11 structured sections) or copyable as Markdown.

### Round 3 Major Improvements Delivered
1. **Server-Side AI Extraction with Programmatic Citation Verification (`POST /api/extract`):**
   - Uses `@google/genai` (`gemini-4-hydrogen`) with strict JSON schema output on the Node/Express server (`server.ts`) so API keys never touch the browser.
   - Every returned quote passes through `verifyCitationAgainstSources()` (`src/utils/citationVerifier.ts`) using exact and whitespace/quote-normalized substring matching against actual uploaded source text before surfacing.
   - Quotes that cannot be located in the source text are explicitly flagged as `Unverified Quote` with `"No supporting evidence found."` rather than fabricating evidence.
2. **Cross-Source Contradiction & Staleness Detection (`POST /api/reconcile`):**
   - Cross-document reconciliation engine (`src/utils/reconciler.ts`) compares decisions, CSV task statuses, deadlines, architecture docs, and chat exports.
   - Automatically flags deprecated infrastructure/version drift (e.g., Q2 Terraform v1.3 vs Q4 v1.5), CSV vs. chat status mismatches, passed deadlines, stale specs, rate-limit policy drift, undocumented/generic owners (`TBD`), and programmatically rejected quotes.
   - Supports optional server-side Gemini semantic reconciliation with verified Source A & Source B quotes, plus `Mark Resolved`, `Dismiss`, `Reopen`, and resolution notes.
3. **Persistent Multi-User Handover & Sign-Off (`/api/workspaces*`):**
   - File-backed atomic workspace persistence (`.neash-data/workspaces.json` via write-temp + rename) with shareable `?workspace=<workspaceId>` links and visibility-aware background polling (`4s`) plus manual `Sync Now`.
   - Collaborator identity & role switcher (`Outgoing Owner`, `Reviewer`, `Incoming Engineer`) in the top bar.
   - Atomic server-side event mutations (`CLAIM_REVIEW`, `CLAIM_EDIT`, `CONFLICT_UPDATE`, `ROLE_SIGNOFF`, `REPORT_GENERATED`, `SOURCES_AND_CLAIMS_UPDATE`) preventing concurrent overwrite races.
   - 3-role formal Handover Sign-Off panel and full immutable Verification & Collaboration Audit Trail included in both the UI and exported PDF report (Section 11).

---

## Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons | Responsive dark SaaS workspace (`Overview`, `Projects`, `Sources`, `Knowledge Hub`, `Verification Center`, `First-Day Brief`, `Timeline`, `Handover Reports`, `Settings`) |
| Document Parsing | `pdfjs-dist`, Browser FileReader | Client-side text extraction from `.pdf`, `.txt`, `.md`, `.csv`, `.json` up to 4 MB |
| Report Export | `jsPDF` | Dynamic 11-section Handover PDF generation from live state |
| Backend API | Node.js (v22+), Express (`server.ts`) | Serves `/api/*` endpoints + Vite middleware in dev / built `dist/` in production on port `3000` |
| AI Pipeline | `@google/genai` (`gemini-4-hydrogen`) | Server-side structured JSON extraction & optional semantic cross-document reconciliation |
| Persistence | Atomic JSON store (`.neash-data/workspaces.json`) + `localStorage` | Shared multi-user workspaces, collaborator profile caching, and atomic concurrent event logs |

### API Endpoints
- `GET /api/health` — Returns service health and whether `GEMINI_API_KEY` is configured.
- `POST /api/extract` — Extracts structured claims via Gemini and verifies every quote programmatically against source content.
- `POST /api/reconcile` — Runs deterministic cross-document conflict/staleness rules + optional semantic Gemini check with verified Source A/B quotes.
- `POST /api/workspaces` — Creates or initializes a shared persistent workspace.
- `GET /api/workspaces/:workspaceId` — Fetches latest shared workspace state.
- `PUT /api/workspaces/:workspaceId` — Syncs workspace state safely.
- `POST /api/workspaces/:workspaceId/events` — Applies atomic concurrent events (`CLAIM_REVIEW`, `CLAIM_EDIT`, `CONFLICT_UPDATE`, `ROLE_SIGNOFF`, `REPORT_GENERATED`, `SOURCES_AND_CLAIMS_UPDATE`) and appends to `auditTrail`.

---

## Local Setup & Running

### Prerequisites
- **Node.js `22.x`** (or higher) and **npm**
- A **Google Gemini API Key** (`GEMINI_API_KEY`) for live server-side AI extraction (optional for exploring preloaded demo data, reconciliation, multi-user sign-off, and PDF export; required for `POST /api/extract`).

### Installation

```bash
git clone <repository-url>
cd <repository-folder>
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and add your Gemini API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY="your_actual_gemini_api_key"
APP_URL="http://localhost:3000"
```

### Development Mode

Starts the Express server with mounted Vite middleware on port `3000`:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Production Build & Start

Builds the client bundle into `dist/` and starts the Express production server:

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run lint
```

---

## End-to-End Judge & QA Testing Guide

1. **Server-Side AI Extraction & Citation Verification:**
   - Navigate to **Sources**, click **Stage Sample Addendum (`Sprint_Handover_Addendum.txt`)** or upload your own `.txt`/`.md`/`.csv`/`.pdf` file, and run extraction.
   - Open any extracted claim in **Evidence Drawer** to inspect the programmatic verification badge (`Exact Substring Match` / `Normalized Substring Match` vs `Unverified Quote`).
   - Verify bad-input resilience by attempting an empty upload or a file larger than `4 MB` — clean validation banners appear without hanging.
2. **Cross-Source Contradiction & Staleness Detection:**
   - Open **Knowledge Hub → Conflicts & Staleness**.
   - Inspect detected cross-source contradictions (e.g., CSV vs. Slack status drift, Terraform spec staleness, rate-limit policy conflict, `TBD` owner).
   - Click **Reconcile Cross-Source Conflicts** to re-scan live sources, then resolve or dismiss a conflict with a note and refresh the page to confirm persistence.
3. **Persistent Multi-User Handover, Share Link & Sign-Off:**
   - Click **Share Workspace** in the top navigation bar to copy the `?workspace=<id>` URL and open it in a second browser tab/window.
   - Switch collaborator identity/role in the top bar (e.g., Tab A as `Reviewer`, Tab B as `Incoming Engineer`).
   - Verify/flag claims in Tab A and sign off in **Handover Reports** in Tab B; confirm both tabs sync automatically and record actor + role entries in the **Verification & Collaboration Audit Trail**.
   - Click **Download Handover PDF** and confirm **Section 11: Cross-Source Reconciliation & Multi-User Sign-Off** reflects live workspace state.

---

## Product Roadmap & Future Development

- **Native OAuth Connectors:** Direct GitHub PR/commit ingestion, Jira/Linear ticket sync, Slack channel export, and Google Drive/Docs read pipelines.
- **Managed Cloud Database Migration:** Optional PostgreSQL / Firestore adapter behind the existing workspace repository interface for multi-region enterprise scale and SSO/RBAC.
- **Automated Handover Readiness Gates:** CI/PR merge checks and Slack notifications when departing team members leave unverified critical decisions or unresolved cross-source conflicts.
- **Diff-Aware Continuous Re-Verification:** Automatic background re-reconciliation whenever linked architecture docs or task CSVs change post-handover.

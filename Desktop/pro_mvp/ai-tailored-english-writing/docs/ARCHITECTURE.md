# Architecture & Layout

This project is a Vite + React (TS) single-page app. Functionality, UI, and layout remain as shipped; the structure below clarifies where things live and how to extend safely.

## Directory map
```
src/
  index.tsx             # App bootstrap (React root)
  index.css             # Empty placeholder to satisfy Vite import (styles come from CDN Tailwind in index.html)
  App.tsx               # Top-level app: state, workflow, tab switch, PDF/export orchestration
  types.ts              # Shared domain types (essay, grading, config, status enums)
  components/           # Pure UI + feature components (no global state)
    Sidebar.tsx         # Grading settings + start button
    UploadZone.tsx      # Image/text submission UI
    EssayCard.tsx       # Essay list rows (compact/expanded) and inline editing
    AnalyticsDashboard.tsx # Stats/graphs for graded essays
    PDFExportModal.tsx  # Modal to configure export options
    Icons.tsx           # Inline SVG icons
    SettingsPanel.tsx   # Legacy/unused settings component (kept for reference)
  services/
    handwritingOcr.ts   # Upload + poll handwritingocr.com for OCR transcripts (transcribe action)
    aiAgent.ts          # Client-side AI agent (OpenAI/Gemini/DeepSeek/OpenRouter) for OCR + grading
    modelRegistry.ts    # Preset model list + defaults per provider
    config.ts           # Central env getter (keys + optional OpenRouter metadata)
index.html              # HTML shell, Tailwind & html2pdf CDN, importmap for React/genai
tsconfig.json           # BaseUrl + @/* alias -> ./src
vite.config.ts          # Vite config with @ alias and env injection for API keys
package.json            # Scripts: dev/build/preview
```

## Runtime flow
- `index.html` loads Tailwind CDN + html2pdf bundle, then mounts `src/index.tsx`.
- `src/index.tsx` renders `App`.
- `App` holds global state: essays queue, config, processing/export flags, tab, and input expansion.
  - Upload: `UploadZone` pushes `EssayData` into state (image or text).
  - Process: clicking start calls `processEssayAgent` for each pending essay (in parallel). Status + progress text (`progressStep`/`progressMessage`) are kept in local state only and feed the list UI (queued → OCR → OCR done → grading → done/error/cancelled).
  - Display: list view renders `EssayCard` per essay; analytics tab renders `AnalyticsDashboard`.
  - Export/print: JSON download, print, or PDF export via `PDFExportModal` (manipulates DOM classes for html2pdf snapshot).
- `processEssayAgent` (client-side):
  - OCR: for image uploads, `transcribeHandwriting` posts to handwritingocr.com `POST /api/v3/documents` (action=transcribe), then polls `GET /api/v3/documents/{id}` until processed/failed/timeout. OCR text is saved in state even when grading fails so users can still view it.
  - Grading: builds a prompt that skips image payloads when OCR/text already exists; calls the chosen provider/model (OpenAI/Gemini/DeepSeek/OpenRouter) via `routeModel`.
  - State: increments `progressStep` (`ocr` → `ocr_complete` → `grading` → `done` or `error`/`cancelled`) and sets `status` (`PROCESSING`/`COMPLETED`/`ERROR`/`CANCELLED`). Errors and cancelled runs keep `ocrText` and bubble an error message shown on the card.
- `Sidebar` includes provider + model selector (default OpenAI) so grading can target different APIs without altering layout; retries always use the current selector.
- `EssayCard` interaction patterns:
  - Processing view shows progress + cancel button.
  - Error/cancelled/completed cards surface a `重改` action that retries grading with the currently selected provider/model and **always reuses existing OCR** (no extra OCR calls).
  - OCR text is always visible once available (even if grading fails) to avoid rework and cost.

## Environment & configuration
- Env file: use `.env.local` at repo root (not committed). Minimum examples:
  - OpenAI: `OPENAI_API_KEY=`, optional `OPENAI_BASE_URL=https://api.openai.com/v1`
  - Gemini: `GEMINI_API_KEY=`, optional `GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta`
  - DeepSeek: `DEEPSEEK_API_KEY=`, optional `DEEPSEEK_BASE_URL=https://api.deepseek.com/v1`
  - OpenRouter: `OPENROUTER_API_KEY=`, optional `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`, `APP_URL=http://localhost:3000`, `APP_NAME=EssayFlow AI`
  - Handwriting OCR: `HANDWRITING_OCR_API_KEY=` (token from handwritingocr.com), optional `HANDWRITING_OCR_BASE_URL=https://www.handwritingocr.com/api/v3`
  - Local OCR markdown save (optional): `OCR_SAVE_ENDPOINT=http://localhost:8788/api/save-ocr` (pairs with `npm run ocr-server`; override port via `OCR_SAVE_PORT` and directory via `OCR_SAVE_DIR`)
  Keys are read in `src/services/config.ts` and injected via `vite.config.ts` define.
- Styling: Tailwind via CDN config inside `index.html`; `src/index.css` is intentionally empty to satisfy import.
- Import aliases: use `@/` for `src/` root.

## Testing & local run
- Install: `npm install`
- Dev: set the key for the provider you plan to use (e.g., `OPENAI_API_KEY=...` or `OPENROUTER_API_KEY=...`) then `npm run dev` and open http://localhost:3000
- Build: `npm run build` (uses whatever key values are present in your env)
- Optional: run `npm run ocr-server` to persist OCR transcripts as markdown files under `./ocr_logs` (creates directory if missing). The front-end will still download the file locally even if the save server is offline.

## Extension notes (keep behavior/UI stable)
- Move server-side concerns: to avoid exposing API keys, shift `processEssayAgent` to a backend API while keeping `App` call signature the same.
- State/data: introduce a state manager (React Query/Zustand) behind the existing handlers; preserve prop contracts for components.
- Validation: add schema validation in `services/aiAgent.ts` before `JSON.parse` results are trusted; extend provider list via `modelRegistry.ts`.
- PDF/export: if replaced with backend rendering, keep the modal API identical and route export clicks to a new service.

# Repository Guidelines

## Project Structure & Module Organization
- Vite + React (TypeScript) SPA. Entry `src/index.tsx` mounts `App`, which owns queue state plus grading/export flow. Shared domain shapes live in `src/types.ts`.
- UI is modular in `src/components/` (UploadZone, Sidebar, EssayCard, AnalyticsDashboard, PDFExportModal; `SettingsPanel.tsx` is legacy/reference). Keep data flow via props/state.
- Service logic sits in `src/services/`: `aiAgent.ts` (prompt/build + provider routing), `handwritingOcr.ts` (upload/poll handwritingocr.com), `modelRegistry.ts` (model presets), `config.ts` (env access).
- Styling is provided by Tailwind CDN in `index.html`; `src/index.css` is only a placeholder import. Built assets land in `dist/`; high-level notes are in `docs/ARCHITECTURE.md`.

## Build, Test, and Development Commands
- Install deps: `npm install` (ensure Node is available).
- Run locally: set provider keys in `.env.local`, then `npm run dev` (opens Vite dev server).
- Production bundle: `npm run build`; static preview: `npm run preview`.
- Type safety: run `npx tsc --noEmit` before shipping to catch TS regressions (not wired to a script).

## Coding Style & Naming Conventions
- TypeScript-first: type props/service inputs; prefer `const` plus explicit return types for services.
- Components/files use `PascalCase`; functions/vars use `camelCase`; enums stay in `types.ts`.
- Functional components with hooks; keep side effects and network calls inside `src/services` so UI components remain presentational.
- Use the `@/` alias for `src/` roots when paths get long; favor single quotes and 2-space indentation to match existing files.

## Testing Guidelines
- No automated test runner is configured; add Vitest + React Testing Library for new critical logic (co-locate as `*.test.tsx`).
- Minimum pre-PR checks: `npm run build`, `npx tsc --noEmit`, and manual smoke of key flows (image upload → OCR → grading, typed submission, retry/cancel, PDF export/print).
- When adding tests, mirror real prompts/fixtures and cover retry/cancel branches and OCR error states.

## Commit & Pull Request Guidelines
- Commits: short, imperative, scope-first titles (e.g., `Add OCR poll timeout`, `Fix retry OCR reuse`). Keep changes focused.
- PRs: outline intent, risk, and manual verification steps; attach screenshots/GIFs for UI changes. Link issues if applicable and note env/config additions.

## Security & Configuration Tips
- Required secrets live in `.env.local` (not committed): `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `HANDWRITING_OCR_API_KEY`, and optional base URLs plus `APP_URL`/`APP_NAME` (read by `src/services/config.ts`).
- Never embed keys in client bundles; avoid logging secrets. If handling sensitive providers, consider moving `aiAgent` work behind a backend API while keeping the existing call signature.

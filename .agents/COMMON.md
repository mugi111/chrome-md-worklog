# Coding Agent Instructions

This repository is a Chrome extension built with Vite and TypeScript. It provides a Markdown-based work log editor that runs in a side panel or standalone tab and stores entries locally by date.

## Project Overview
- The main entry point is `src/main.ts`.
- The editor is created in `src/editor.ts` using Milkdown.
- IndexedDB in `src/db.ts` is the source of truth for persistence, while `src/storage.ts` handles reads, writes, and migration.
- Chrome extension configuration lives in `public/manifest.json`.
- Templates are handled through `src/template.ts` and the IndexedDB setting key `settings_template`.

## Implementation Principles
- Preserve the current product direction: a simple, local-first logging tool.
- Prefer small, clear changes over broad refactors or new abstractions.
- Respect the current module boundaries.
  - UI composition and event wiring: `src/main.ts`
  - Editor setup: `src/editor.ts`
  - Save, load, and migration flows: `src/storage.ts`
  - IndexedDB access: `src/db.ts`
  - Export behavior: `src/export.ts`
- Keep date keys in `YYYY-MM-DD` format and preserve local-time behavior.

## Important Rules For Changes
- Prioritize data compatibility. Do not casually change log key semantics, template key names, or IndexedDB store names.
- Do not remove the `chrome.storage.local` to IndexedDB migration path. If it must change, keep it idempotent.
- Autosave currently depends on `saveLogDebounced`; avoid changes that increase save frequency and hurt typing performance.
- Preserve the current behavior where the template is only applied when a log is empty.
- Keep Chrome extension permissions minimal and only add permissions with a clear product need.
- If you change `public/manifest.json`, verify the side panel flow and the download/export flow.
- When editing styles, check the Milkdown override CSS and keep the editor readable.

## Git And Release Rules
- Use Git Flow for branch management.
- Do not work directly on `main`; use the appropriate Git Flow branch type such as `feature/*`, `release/*`, or `hotfix/*`.
- Commit in meaningful units by implementation feature or logical change set, not only once at the end.
- This project uses Semantic Versioning. Choose version bumps according to the actual impact of the change.
- When bumping the version, update both `public/manifest.json` and `package.json` so the extension version and package version stay aligned.
- The release pipeline is triggered by creating a tag from the `main` branch. Do not create release tags from other branches.
- If a change is intended for release, verify that the target commit is on `main` before tagging.

## Expected Workflow
1. Read the relevant files first and confirm the current responsibility boundaries and data flow.
2. Keep the change set as small as possible.
3. If behavior is affected, prioritize checking save, date switching, template usage, and export flows.
4. Commit changes in logical increments as the implementation progresses.
5. After making changes, run at least `npm run build`.

## Validation Checklist
- The project builds successfully.
- The editor renders and saves typed content.
- Switching dates loads the correct entry for that date.
- Existing non-empty logs are not overwritten by the template.
- Template changes apply only to new or empty logs.
- Markdown export still produces `worklog_YYYY-MM-DD.md`.
- Migration behavior for existing users is still safe.

## Avoid
- Adding dependencies without a strong reason.
- Large refactors that also change data structure behavior.
- Unrelated visual redesigns.
- Renames or file moves that exist only for agent convenience.

## Response Style
- Explain changes briefly and concretely.
- Always call out compatibility or breaking-change risk when it exists.
- Separate confirmed facts from assumptions when something has not been verified.

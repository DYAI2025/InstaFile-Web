# FlashDoc Chrome Extension

FlashDoc is a Chrome extension that turns any selected text into instantly downloadable files. It ships with context menus, keyboard shortcuts, and a floating action button so you can save snippets without leaving the page.

## Features
- **Smart format detection** with strong HTML vs. JS/TS separation.
- Context menu entries for common formats plus configurable category shortcuts.
- Floating action button and contextual "Save" chip near selections.
- Usage stats and recommendations in the options page.

## Getting Started
1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository folder.
4. Ensure the extension is enabled. The floating button will appear when you select text on a page.

## Using Smart Detection
The detection engine lives in `detection-utils.js` and is shared by the background service worker and the content script. Key rules:
- HTML is identified by document-level markers (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`) or multiple paired tags such as `<div>…</div>` with optional `<script>`/`<style>` blocks.
- TypeScript requires at least two TS-only signals (interfaces, typed parameters, enums, `export type/interface/enum`, React generics like `React.FC<…>`), and will refuse to trigger if HTML structure is present.
- JavaScript detection is blocked whenever HTML structure is detected to avoid confusing markup with code snippets.
- JSON, YAML, XML/SVG, SQL, shell scripts, CSV, Markdown, and CSS each have dedicated heuristics.

The background worker delegates to the shared detector before saving files so the format shown in the UI and the downloaded extension match.

## Options & Shortcuts
- Open **Options** from the extension card to configure folder naming, context menu entries, and category shortcuts (e.g., `design_save.html`).
- Default keyboard shortcuts:
  - `Ctrl/Cmd+Shift+S` Smart Save
  - `Ctrl/Cmd+Shift+T` Save as `.txt`
  - `Ctrl/Cmd+Shift+M` Save as `.md`
  - `Ctrl/Cmd+Shift+P` Save as `.pdf`

## Testing
A lightweight detection sanity check is included to validate the new heuristics without the browser runtime:

```bash
node scripts/detection-check.js
```

The script prints the detected type for representative HTML, TypeScript, JavaScript, and Markdown samples.

## Repository Layout
- `content.js` – UI injected into pages (selection capture, floating UI, smart detection display).
- `service-worker.js` – Background logic for saving files and handling context menu commands.
- `options.html/js/css` – Settings page with stats and shortcut management.
- `popup.html/js/css` – Browser action popup showing recent saves.
- `detection-utils.js` – Shared format detection engine (also imported by tests).
- `scripts/detection-check.js` – Node script that exercises the detector.

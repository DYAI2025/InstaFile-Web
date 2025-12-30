# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashDoc is a Chrome/Edge browser extension (Manifest V3) that enables instant file creation from selected text on any webpage. Users can save text as 15+ file formats (TXT, MD, DOCX, PDF, JSON, JS, TS, PY, HTML, CSS, XML, SQL, SH, YAML, CSV, Label PDF) with automatic format detection.

## Development Commands

**No build process required** - This is a vanilla JavaScript extension with bundled libraries (jsPDF, docx) for reliable document generation.

### Loading the Extension

1. Open Chrome/Edge and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" and select this directory
4. After code changes, click the refresh icon on the extension card

### Testing Changes

- **Service Worker changes**: Reload extension via chrome://extensions
- **Content Script changes**: Reload extension + refresh the webpage
- **Popup/Options changes**: Close and reopen the popup/options page

### Debugging

- **Service Worker**: chrome://extensions → "Inspect views: service worker"
- **Content Script**: DevTools on any webpage → Console (filter by FlashDoc)
- **Popup**: Right-click extension icon → "Inspect popup"

## Architecture

### File Structure

```
├── manifest.json        # Extension configuration (Manifest V3)
├── service-worker.js    # Background script - core logic, file generation
├── content.js           # Page injection - UI, text selection
├── lib/                 # External libraries
│   ├── jspdf.umd.min.js # PDF generation library
│   └── docx.umd.min.js  # DOCX generation library
├── popup.html/js/css    # Extension popup interface
├── options.html/js/css  # Settings page
└── icon*.png            # Extension icons
```

### Component Responsibilities

**service-worker.js** (FlashDoc class)
- Context menu and keyboard shortcut handling
- File generation for all formats (DOCX via docx library, PDF via jsPDF)
- Format detection algorithms (Python, JavaScript, Markdown, JSON, etc.)
- Settings management via Chrome sync storage
- Statistics tracking via Chrome local storage

**content.js** (FlashDocContent class)
- Text selection monitoring
- Floating save button with quick-save menu
- Draggable corner ball UI (auto-snap, pinnable)
- Keyboard shortcut capture
- Message passing to service worker with retry logic

**popup.js** (procedural)
- Stats display, quick action buttons
- Recent files list

**options.js** (procedural)
- Settings form handling
- Category Shortcuts management (max 5)
- Context menu format picker

### Message Flow

```
Content Script → chrome.runtime.sendMessage() → Service Worker
Service Worker → chrome.downloads.download() → Browser Downloads
Options/Popup → chrome.storage.sync.* → Settings (cross-device sync)
```

### Storage Keys

**Chrome Sync Storage** (settings):
- `folderPath`, `namingPattern`, `customPattern`
- `showFloatingButton`, `showCornerBall`, `buttonPosition`
- `autoDetectType`, `enableSmartDetection`
- `contextMenuFormats` (array of enabled formats)
- `categoryShortcuts` (array: `{id, name, format}`)

**Chrome Local Storage** (stats):
- `stats` (totalFiles, todayFiles, lastFile, lastTimestamp)
- `formatUsage`, `detectionAccuracy`

## Key Implementation Details

### PDF Generation
Uses jsPDF library (`lib/jspdf.umd.min.js`) for reliable PDF output with proper text wrapping, pagination, and Unicode support. See `createPdfBlob()` and `createLabelPdf()` in service-worker.js.

### DOCX Generation
Uses docx library (`lib/docx.umd.min.js`) for Word document creation with proper paragraph structure and encoding. See `createDocxBlob()` in service-worker.js. Note: This method is async.

### Format Detection
Regex-based detection in service-worker.js: `isJSON()`, `isPython()`, `isJavaScript()`, `isTypeScript()`, `isMarkdown()`, `isSQL()`, `isShellScript()`, `isCSS()`. Uses configurable `detectionConfidence` threshold.

### Content Script Retry Logic
`sendMessage()` in content.js implements exponential backoff for messages to handle service worker wake-up delays.

## Keyboard Shortcuts

Defined in manifest.json `commands`:
- `Ctrl+Shift+S` - Smart save (auto-detect format)
- `Ctrl+Shift+T` - Save as .txt
- `Ctrl+Shift+M` - Save as .md
- `Ctrl+Shift+P` - Save as PDF

## Gotchas

- Service worker can go dormant; content.js must retry messages
- Context menus must be rebuilt on settings change via `setupContextMenus()`
- Corner ball position is stored in `chrome.storage.local` (not sync)
- `createBlob()` and `createDocxBlob()` are async - must be awaited
- Libraries are loaded via `importScripts()` at service worker startup

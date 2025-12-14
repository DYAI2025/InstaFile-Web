# Changelog

All notable changes to FlashDoc are documented in this file.

## [2.1.0] - 2025-12-14

### Added
- **DOCX Export**: Full Word document support with native ZIP/XML generation (no external libraries)
- **File Prefixes System**: Define up to 5 custom prefixes in settings for better file organization
  - Two-step save flow: Format → Prefix selection
  - Usage tracking with frequency-based sorting
  - CRUD management in options page
- **Corner Ball**: New draggable FlashDoc icon in screen corner
  - Drag anywhere on screen
  - Auto snap-back after 5 seconds when released
  - Pin function to keep position permanently
  - Quick access menu on click
- **Auto-Menu**: Selection menu automatically appears after 3 seconds of text selection (macOS-friendly)

### Changed
- **Floating Button positioning**: Increased offset (+40px) to avoid blocking selected text
- **Viewport clamping**: Floating button now stays within viewport bounds with smart flip logic
- **Settings UI**: Added Corner Ball toggle and File Prefixes management section

### Technical
- New content.js methods: `createCornerBall()`, `startBallDrag()`, `onBallDrag()`, `endBallDrag()`, `snapBallBack()`, `toggleBallPin()`, `showBallMenu()`
- New timer methods: `startAutoMenuTimer()`, `clearAutoMenuTimer()`, `showAutoMenu()`
- Service worker: `generateFilename()` extended with prefix parameter
- Service worker: `trackPrefixUsage()`, `getSortedPrefixes()` for usage analytics
- New storage keys: `showCornerBall`, `filePrefixes`, `prefixUsage`

## [2.0.0] - Previous Release

- Initial Manifest V3 release
- PDF, Markdown, TXT, JSON, YAML, Code file support
- Smart format detection
- Floating save button
- Context menu integration
- Keyboard shortcuts
- Options page with customization

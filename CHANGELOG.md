# Changelog

All notable changes to FlashDoc are documented in this file.

## [2.2.0] - 2025-12-15

### Changed
- **Category Shortcuts**: Replaced prefix system with simplified Category Shortcuts
  - Define up to 5 quick-save combos: Category + Format
  - Example: "Design" + ".md" = one-click save as `Design_save_YYYY-MM-DD.md`
  - Shortcuts appear prominently at top of floating menu
  - Cleaner UI in settings page

### Removed
- **Auto-Menu Timer**: Removed 3-second auto-menu feature (caused reliability issues)
- **Prefix Usage Tracking**: Simplified system no longer needs usage analytics

### Technical
- Replaced `filePrefixes`, `prefixUsage` with `categoryShortcuts` storage key
- New content.js methods: `buildShortcutsHtml()`, `saveWithShortcut()`
- Simplified `generateFilename()` for shortcut-based saves
- Removed: `trackPrefixUsage()`, `getSortedPrefixes()`, auto-menu timer methods

## [2.1.0] - 2025-12-14

### Added
- **DOCX Export**: Full Word document support with native ZIP/XML generation (no external libraries)
- **Corner Ball**: New draggable FlashDoc icon in screen corner
  - Drag anywhere on screen
  - Auto snap-back after 5 seconds when released
  - Pin function to keep position permanently
  - Quick access menu on click

### Changed
- **Floating Button positioning**: Increased offset (+40px) to avoid blocking selected text
- **Viewport clamping**: Floating button now stays within viewport bounds with smart flip logic
- **Settings UI**: Added Corner Ball toggle

### Technical
- New content.js methods: `createCornerBall()`, `startBallDrag()`, `onBallDrag()`, `endBallDrag()`, `snapBallBack()`, `toggleBallPin()`, `showBallMenu()`
- Service worker: `generateFilename()` extended with prefix parameter
- New storage key: `showCornerBall`

## [2.0.0] - Previous Release

- Initial Manifest V3 release
- PDF, Markdown, TXT, JSON, YAML, Code file support
- Smart format detection
- Floating save button
- Context menu integration
- Keyboard shortcuts
- Options page with customization

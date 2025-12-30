// FlashDoc Service Worker
// Core download and file management logic

// Import libraries for PDF and DOCX generation
importScripts('./lib/jspdf.umd.min.js');
importScripts('./lib/docx.umd.min.js');

// Shared detection helpers (also used in content script and tests)
try {
  importScripts('detection-utils.js');
} catch (error) {
  console.warn('Detection helpers unavailable in service worker:', error);
}

const CONTEXT_MENU_ITEMS = [
  { id: 'auto', title: '\u26A1 Auto-detect & Save' },
  { id: 'txt', title: '\uD83D\uDCC4 Save as .txt' },
  { id: 'md', title: '\uD83D\uDCDD Save as .md' },
  { id: 'docx', title: '\uD83D\uDCDC Save as .docx' },
  { id: 'json', title: '\uD83D\uDCCB Save as .json' },
  { id: 'js', title: '\uD83D\uDFE8 Save as .js' },
  { id: 'ts', title: '\uD83D\uDD35 Save as .ts' },
  { id: 'py', title: '\uD83D\uDC0D Save as .py' },
  { id: 'html', title: '\uD83C\uDF10 Save as .html' },
  { id: 'css', title: '\uD83C\uDFA8 Save as .css' },
  { id: 'xml', title: '\uD83D\uDCF0 Save as .xml' },
  { id: 'sql', title: '\uD83D\uDDC4 Save as .sql' },
  { id: 'sh', title: '\u2699\uFE0F Save as .sh' },
  { id: 'yaml', title: '\uD83D\uDCE6 Save as .yaml' },
  { id: 'csv', title: '\uD83D\uDCCA Save as .csv' },
  { id: 'pdf', title: '\uD83D\uDCD5 Save as PDF' },
  { id: 'label', title: '\uD83C\uDFF7\uFE0F Label 89\u00D728 mm (PDF)' },
  { id: 'saveas', title: '\uD83D\uDCC1 Save As\u2026', saveAs: true }
];

const DEFAULT_CONTEXT_MENU_FORMATS = CONTEXT_MENU_ITEMS.map(item => item.id);

class FlashDoc {
  constructor() {
    this.stats = {
      totalFiles: 0,
      todayFiles: 0,
      todaysDate: '',
      lastFile: '',
      lastTimestamp: null
    };
    this.contextMenuListenerRegistered = false;
    this.onContextMenuClicked = this.onContextMenuClicked.bind(this);
    this.init();
  }

  async init() {
    // Load settings
    this.settings = await this.loadSettings();
    
    // Setup listeners
    this.setupContextMenus();
    this.setupCommandListeners();
    this.setupMessageListeners();
    
    // Load stats
    await this.loadStats();
    
    console.log('\u26A1 FlashDoc initialized');
  }

  async loadSettings() {
    const defaults = {
      folderPath: 'FlashDocs/',
      namingPattern: 'timestamp',
      customPattern: 'file_{date}',
      organizeByType: true,
      showNotifications: true,
      playSound: false,
      autoDetectType: true,
      enableContextMenu: true,
      showFloatingButton: true,
      showCornerBall: true, // F3: Corner ball visibility
      buttonPosition: 'bottom-right',
      autoHideButton: true,
      selectionThreshold: 10,
      enableSmartDetection: true,
      trackFormatUsage: true,
      trackDetectionAccuracy: true,
      showFormatRecommendations: true,
      contextMenuFormats: DEFAULT_CONTEXT_MENU_FORMATS,
      // Category Shortcuts: prefix + format combo
      categoryShortcuts: [] // Array of {id, name, format} objects, max 5
    };

    const stored = await chrome.storage.sync.get(null);
    this.settings = { ...defaults, ...stored };
    return this.settings;
  }

  async loadStats() {
    const stored = await chrome.storage.local.get(['stats']);
    if (stored.stats) {
      this.stats = { ...this.stats, ...stored.stats };
    }
  }

  async saveStats() {
    await chrome.storage.local.set({ stats: this.stats });
  }

  setupContextMenus() {
    console.log('🔧 Setting up context menus...');
    console.log('📦 Current settings.categoryShortcuts:', this.settings.categoryShortcuts);

    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.warn('Context menu cleanup warning:', chrome.runtime.lastError.message);
      }

      if (!this.settings.enableContextMenu) {
        console.log('⏭️ Context menu disabled in settings');
        return;
      }

      const selectedFormats = Array.isArray(this.settings.contextMenuFormats) && this.settings.contextMenuFormats.length
        ? this.settings.contextMenuFormats
        : DEFAULT_CONTEXT_MENU_FORMATS;
      const itemsToRender = CONTEXT_MENU_ITEMS.filter(item => selectedFormats.includes(item.id));
      const menuItems = itemsToRender.length ? itemsToRender : [CONTEXT_MENU_ITEMS[0]];

      // Parent menu
      chrome.contextMenus.create({
        id: 'flashdoc-parent',
        title: '\u26A1 FlashDoc',
        contexts: ['selection']
      });

      // Child menus - Standard formats
      menuItems.forEach(type => {
        chrome.contextMenus.create({
          id: `flashdoc-${type.id}`,
          parentId: 'flashdoc-parent',
          title: type.title,
          contexts: ['selection']
        });
      });

      // Add category shortcuts (prefix combos) if any exist
      const shortcuts = this.settings.categoryShortcuts || [];
      console.log('📋 Category shortcuts:', shortcuts);
      if (shortcuts.length > 0) {
        // Add separator
        chrome.contextMenus.create({
          id: 'flashdoc-separator',
          parentId: 'flashdoc-parent',
          type: 'separator',
          contexts: ['selection']
        });

        // Add each shortcut
        const formatEmojis = {
          txt: '📄', md: '📝', docx: '📜', pdf: '📕', json: '🧩',
          js: '🟡', ts: '🔵', py: '🐍', html: '🌐', css: '🎨',
          yaml: '🧾', sql: '📑', sh: '⚙️'
        };

        shortcuts.forEach(shortcut => {
          const emoji = formatEmojis[shortcut.format] || '📄';
          chrome.contextMenus.create({
            id: `flashdoc-shortcut-${shortcut.id}`,
            parentId: 'flashdoc-parent',
            title: `${emoji} ${shortcut.name}_save.${shortcut.format}`,
            contexts: ['selection']
          });
        });
      }
    });

    if (!this.contextMenuListenerRegistered) {
      chrome.contextMenus.onClicked.addListener(this.onContextMenuClicked);
      this.contextMenuListenerRegistered = true;
    }
  }

  setupCommandListeners() {
    const commandMap = {
      'save-smart': 'auto',
      'save-txt': 'txt',
      'save-md': 'md',
      'save-pdf': 'pdf'
    };

    chrome.commands.onCommand.addListener((command) => {
      const type = commandMap[command];
      if (!type) return;
      this.getSelectionAndSave(type).catch((error) => {
        console.error('Command save failed:', error);
      });
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'saveContent') {
        const options = {
          prefix: message.prefix || null,
          html: message.html || '' // HTML content for formatting
        };
        this.handleSave(message.content, message.type, sender.tab, options)
          .then((result) => sendResponse({ success: true, result }))
          .catch((error) => {
            const messageText = error instanceof Error ? error.message : String(error);
            sendResponse({ success: false, error: messageText });
          });
        return true;
      } else if (message.action === 'getStats') {
        // Ensure stats are loaded from storage before responding
        this.loadStats()
          .then(() => {
            sendResponse({ stats: this.stats });
          })
          .catch((error) => {
            console.error('Stats load error:', error);
            sendResponse({ stats: this.stats });
          });
        return true;
      } else if (message.action === 'getSettings') {
        sendResponse({ settings: this.settings });
        return true;
      } else if (message.action === 'refreshSettings') {
        this.loadSettings()
          .then(() => {
            this.setupContextMenus();
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error('Settings refresh failed:', error);
            const messageText = error instanceof Error ? error.message : String(error);
            sendResponse({ success: false, error: messageText });
          });
        return true;
      }
      return true;
    });
  }

  onContextMenuClicked(info, tab) {
    if (!info.menuItemId || !info.menuItemId.startsWith('flashdoc-')) return;

    const menuId = info.menuItemId.replace('flashdoc-', '');

    // Check if it's a shortcut (prefix combo)
    if (menuId.startsWith('shortcut-')) {
      const shortcutId = menuId.replace('shortcut-', '');
      const shortcuts = this.settings.categoryShortcuts || [];
      const shortcut = shortcuts.find(s => s.id === shortcutId);

      if (shortcut) {
        this.handleSave(info.selectionText, shortcut.format, tab, { prefix: shortcut.name }).catch((error) => {
          console.error('Shortcut save failed:', error);
        });
      }
      return;
    }

    // Standard format save
    this.handleSave(info.selectionText, menuId, tab).catch((error) => {
      console.error('Context menu save failed:', error);
    });
  }

  async getSelectionAndSave(type) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        const error = new Error('No active tab');
        error.handled = true;
        this.showNotification('\u274C No active tab', 'error');
        throw error;
      }

      const [selection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      if (selection && selection.result && selection.result.trim()) {
        await this.handleSave(selection.result, type, tab);
      } else {
        const error = new Error('No text selected');
        error.handled = true;
        this.showNotification('\u274C No text selected', 'error');
        throw error;
      }
    } catch (error) {
      console.error('Error getting selection:', error);
      if (!error || !error.handled) {
        this.showNotification('\u274C No text selected', 'error');
      }
    }
  }

  async handleSave(content, type, tab, options = {}) {
    if (!content || content.trim().length === 0) {
      const error = new Error('No content to save');
      error.handled = true;
      this.showNotification('\u274C No content to save', 'error');
      throw error;
    }

    try {
      const saveAsRequested = options.saveAs || type === 'saveas';
      let requestedType = type === 'saveas' ? 'auto' : type;
      // Auto-detect if requested
      let targetType = requestedType;
      if (targetType === 'auto') {
        targetType = this.settings.autoDetectType
          ? this.detectContentType(content)
          : 'txt';
      }

      // Generate filename (with optional prefix from category shortcuts)
      const filename = this.generateFilename(content, targetType, tab, options.prefix || null);
      
      // Create file path with optional type organization
      let filepath = this.settings.folderPath;
      if (this.settings.organizeByType) {
        filepath += `${targetType}/`;
      }
      filepath += filename;

      const { blob, mimeType } = await this.createBlob(content, targetType, options.html || '');
      const { url, revoke } = await this.prepareDownloadUrl(blob, mimeType);

      const downloadId = await chrome.downloads.download({
        url,
        filename: filepath,
        saveAs: saveAsRequested,
        conflictAction: 'uniquify'
      });

      // Update stats
      this.stats.totalFiles++;
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      if (this.stats.todaysDate !== todayKey) {
        this.stats.todaysDate = todayKey;
        this.stats.todayFiles = 0;
      }
      this.stats.todayFiles++;
      this.stats.lastFile = filename;
      this.stats.lastTimestamp = now.getTime();
      await this.saveStats();

      // Track format usage if enabled
      if (this.settings.trackFormatUsage) {
        await this.trackFormatUsage(targetType);
      }

      // Track detection accuracy if enabled and auto-detection was used
      if (this.settings.trackDetectionAccuracy && requestedType === 'auto') {
        await this.trackDetectionAccuracy(targetType);
      }

      // Show success notification
      if (this.settings.showNotifications) {
        this.showNotification(`\u2728 ${filename} created!`);
      }

      // Cleanup
      setTimeout(() => revoke(), 1000);

      console.log(`\u2705 File saved: ${filepath}`);
      return { filename, downloadId, type: targetType };

    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      console.error('Error saving file:', failure);
      this.showNotification(`\u274C Error: ${failure.message}`, 'error');
      failure.handled = true;
      throw failure;
    }
  }

  generateFilename(content, extension, tab, prefix = null) {
    const fileExtension = extension === 'label' ? 'pdf' : extension;
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5);

    // If a category shortcut prefix is provided, use simplified naming
    if (prefix && prefix.trim()) {
      const sanitizedPrefix = prefix.trim().replace(/[^a-z0-9_-]/gi, '_');
      // Use format: Category_save_YYYY-MM-DD_HH-MM-SS.ext
      return `${sanitizedPrefix}_save_${timestamp}.${fileExtension}`;
    }

    // Standard naming patterns
    let baseName;
    switch (this.settings.namingPattern) {
      case 'firstline': {
        const firstLine = content.split('\n')[0]
          .substring(0, 50)
          .replace(/[^a-z0-9]/gi, '_')
          .replace(/_+/g, '_')
          .toLowerCase()
          .trim();

        baseName = firstLine && firstLine.length > 3
          ? firstLine
          : `flashdoc_${timestamp}`;
        break;
      }

      case 'custom': {
        baseName = this.settings.customPattern
          .replace('{date}', timestamp.split('_')[0])
          .replace('{time}', timestamp.split('_')[1])
          .replace('{type}', extension);
        break;
      }

      case 'timestamp':
      default:
        baseName = `flashdoc_${timestamp}`;
    }

    return `${baseName}.${fileExtension}`;
  }

  async createBlob(content, extension, html = '') {
    if (extension === 'pdf') {
      const pdfBlob = this.createPdfBlob(content, html);
      return { blob: pdfBlob, mimeType: 'application/pdf' };
    }

    if (extension === 'docx') {
      // Note: createDocxBlob is now async, caller must await
      const docxBlob = await this.createDocxBlob(content, html);
      return { blob: docxBlob, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    }

    const mimeTypes = {
      'txt': 'text/plain;charset=utf-8',
      'md': 'text/markdown;charset=utf-8',
      'yaml': 'text/yaml;charset=utf-8',
      'py': 'text/x-python;charset=utf-8',
      'js': 'text/javascript;charset=utf-8',
      'ts': 'text/typescript;charset=utf-8',
      'tsx': 'text/typescript;charset=utf-8',
      'json': 'application/json;charset=utf-8',
      'html': 'text/html;charset=utf-8',
      'css': 'text/css;charset=utf-8',
      'xml': 'application/xml;charset=utf-8',
      'svg': 'image/svg+xml;charset=utf-8',
      'sql': 'application/sql;charset=utf-8',
      'sh': 'application/x-sh;charset=utf-8',
      'bash': 'application/x-sh;charset=utf-8',
      'csv': 'text/csv;charset=utf-8',
      'url': 'text/plain;charset=utf-8'
    };

    if (extension === 'label') {
      const labelBlob = this.createLabelPdf(content);
      return { blob: labelBlob, mimeType: 'application/pdf' };
    }

    if (extension === 'md') {
      // Normalize line endings to Unix-style for Markdown
      const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const blob = new Blob([normalizedContent], { type: 'text/markdown;charset=utf-8' });
      return { blob, mimeType: 'text/markdown;charset=utf-8' };
    }

    const mimeType = mimeTypes[extension] || 'text/plain;charset=utf-8';
    return { blob: new Blob([content], { type: mimeType }), mimeType };
  }

  async prepareDownloadUrl(blob, mimeType) {
    const supportsObjectUrl = globalThis.URL && typeof globalThis.URL.createObjectURL === 'function';
    if (supportsObjectUrl) {
      const objectUrl = URL.createObjectURL(blob);
      return {
        url: objectUrl,
        revoke: () => URL.revokeObjectURL(objectUrl)
      };
    }

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    const binaryChunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binaryChunks.push(String.fromCharCode.apply(null, chunk));
    }

    const base64 = btoa(binaryChunks.join(''));
    return {
      url: `data:${mimeType};base64,${base64}`,
      revoke: () => {}
    };
  }

  // Parse HTML content to extract formatting structure
  // Returns array of content blocks: { type, text, level?, ordered?, runs? }
  parseHtmlContent(html, plainText) {
    if (!html || html.trim().length === 0) {
      // No HTML - fall back to plain text with paragraph detection
      return plainText.split(/\n\n+/).map(para => ({
        type: 'paragraph',
        runs: [{ text: para.trim(), bold: false, italic: false }]
      })).filter(p => p.runs[0].text.length > 0);
    }

    const blocks = [];

    // Create a DOM parser (works in service worker)
    // Service workers don't have DOMParser, so we use regex-based parsing
    const parseTextRuns = (htmlFragment) => {
      const runs = [];
      // Simple regex-based parsing for bold/italic
      let remaining = htmlFragment;

      // Replace common HTML entities
      remaining = remaining
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Extract bold and italic sections
      const boldItalicPattern = /<(strong|b|em|i)>(.*?)<\/\1>/gi;
      let lastIndex = 0;
      let match;

      // Simple approach: just strip tags and detect inline formatting
      const stripped = remaining
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();

      if (stripped.length > 0) {
        runs.push({ text: stripped, bold: false, italic: false });
      }

      return runs.length > 0 ? runs : [{ text: '', bold: false, italic: false }];
    };

    // Split HTML by block elements
    const blockPattern = /<(h[1-6]|p|li|div|tr)[^>]*>([\s\S]*?)<\/\1>/gi;
    const listPattern = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;

    let processedHtml = html;

    // Process headings
    const headingPattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let headingMatch;
    while ((headingMatch = headingPattern.exec(html)) !== null) {
      const level = parseInt(headingMatch[1], 10);
      const content = headingMatch[2];
      const text = content.replace(/<[^>]+>/g, '').trim();
      if (text.length > 0) {
        blocks.push({
          type: 'heading',
          level: level,
          runs: [{ text: text, bold: true, italic: false }]
        });
      }
    }

    // Process lists
    const ulPattern = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    const olPattern = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;

    let listMatch;
    while ((listMatch = ulPattern.exec(html)) !== null) {
      const listContent = listMatch[1];
      const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liPattern.exec(listContent)) !== null) {
        const text = liMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text.length > 0) {
          blocks.push({
            type: 'list-item',
            ordered: false,
            runs: [{ text: text, bold: false, italic: false }]
          });
        }
      }
    }

    while ((listMatch = olPattern.exec(html)) !== null) {
      const listContent = listMatch[1];
      const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      let itemNumber = 1;
      while ((liMatch = liPattern.exec(listContent)) !== null) {
        const text = liMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text.length > 0) {
          blocks.push({
            type: 'list-item',
            ordered: true,
            number: itemNumber++,
            runs: [{ text: text, bold: false, italic: false }]
          });
        }
      }
    }

    // Process paragraphs (if no blocks found, treat as paragraphs)
    if (blocks.length === 0) {
      const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pPattern.exec(html)) !== null) {
        const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text.length > 0) {
          blocks.push({
            type: 'paragraph',
            runs: [{ text: text, bold: false, italic: false }]
          });
        }
      }
    }

    // If still no blocks, fall back to plain text parsing
    if (blocks.length === 0) {
      const cleanedText = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      const paragraphs = cleanedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      for (const para of paragraphs) {
        blocks.push({
          type: 'paragraph',
          runs: [{ text: para.trim(), bold: false, italic: false }]
        });
      }
    }

    return blocks.length > 0 ? blocks : [{
      type: 'paragraph',
      runs: [{ text: plainText, bold: false, italic: false }]
    }];
  }

  createPdfBlob(content, html = '') {
    // Use jsPDF for reliable PDF generation
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);

    // Font sizes for different block types
    const fontSizes = {
      h1: 18, h2: 16, h3: 14, h4: 12, h5: 11, h6: 10,
      paragraph: 11, 'list-item': 11
    };

    let y = margin + 5; // Start position

    // Parse HTML to get formatted blocks
    const blocks = this.parseHtmlContent(html, content);

    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin + 5;
      }
    };

    for (const block of blocks) {
      let fontSize = fontSizes.paragraph;
      let lineHeight = 5;
      let prefix = '';
      let indent = 0;

      // Set formatting based on block type
      if (block.type === 'heading') {
        fontSize = fontSizes[`h${block.level}`] || 14;
        lineHeight = fontSize * 0.45;
        doc.setFont('helvetica', 'bold');
      } else if (block.type === 'list-item') {
        fontSize = fontSizes['list-item'];
        lineHeight = 5;
        prefix = block.ordered ? `${block.number || '•'}. ` : '• ';
        indent = 5;
        doc.setFont('helvetica', 'normal');
      } else {
        fontSize = fontSizes.paragraph;
        lineHeight = 5;
        doc.setFont('helvetica', 'normal');
      }

      doc.setFontSize(fontSize);

      // Get text from runs
      const text = block.runs.map(r => r.text).join('');
      if (!text.trim()) continue;

      // Word wrap the text
      const wrappedLines = doc.splitTextToSize(prefix + text, maxWidth - indent);

      for (let i = 0; i < wrappedLines.length; i++) {
        checkPageBreak(lineHeight);
        const lineText = i === 0 ? wrappedLines[i] : wrappedLines[i];
        const xPos = margin + (i === 0 ? 0 : indent);
        doc.text(lineText, xPos, y);
        y += lineHeight;
      }

      // Add spacing after blocks
      if (block.type === 'heading') {
        y += 3; // Extra space after headings
      } else if (block.type === 'paragraph') {
        y += 2; // Space between paragraphs
      }
    }

    // Return as blob
    return doc.output('blob');
  }

  createLabelPdf(content) {
    // Label dimensions: 89mm x 28mm
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [89, 28]
    });

    const width = 89;
    const height = 28;
    const marginX = 4;
    const marginY = 3;
    const maxLines = 4;

    // Normalize and clean content
    const cleanContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    // Split into lines and flatten
    const rawLines = cleanContent.split('\n').filter(line => line.trim());

    // Calculate available space
    const availableWidth = width - (marginX * 2);
    const availableHeight = height - (marginY * 2);

    // Start with max font size and reduce until text fits
    let fontSize = 14;
    const minFontSize = 6;
    let lines = [];
    let lineHeight = 0;

    while (fontSize >= minFontSize) {
      doc.setFontSize(fontSize);
      lineHeight = fontSize * 0.4; // Approximate line height in mm

      // Wrap all lines to fit width
      lines = [];
      for (const rawLine of rawLines) {
        const wrapped = doc.splitTextToSize(rawLine, availableWidth);
        lines.push(...wrapped);
        if (lines.length > maxLines) break;
      }

      // Limit to max lines
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
      }

      // Check if text fits in available height
      const totalHeight = lines.length * lineHeight;
      if (totalHeight <= availableHeight) {
        break;
      }

      fontSize -= 1;
    }

    // Center text vertically
    const totalTextHeight = lines.length * lineHeight;
    let y = marginY + (availableHeight - totalTextHeight) / 2 + lineHeight * 0.8;

    // Set font for final render
    doc.setFont('helvetica');
    doc.setFontSize(fontSize);

    // Draw each line centered horizontally
    for (const line of lines) {
      const textWidth = doc.getTextWidth(line);
      const x = marginX + (availableWidth - textWidth) / 2;
      doc.text(line, x, y);
      y += lineHeight;
    }

    return doc.output('blob');
  }

  async createDocxBlob(content, html = '') {
    // Use docx library for reliable DOCX generation
    const { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } = docx;

    // Parse HTML content into structured blocks
    const blocks = this.parseHtmlContent(html, content);

    // Heading level mapping
    const headingLevels = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6
    };

    // Font sizes in half-points (11pt = 22, 14pt = 28, etc.)
    const fontSizes = {
      h1: 36, // 18pt
      h2: 32, // 16pt
      h3: 28, // 14pt
      h4: 24, // 12pt
      h5: 22, // 11pt
      h6: 20, // 10pt
      paragraph: 22, // 11pt
      'list-item': 22 // 11pt
    };

    // Track list numbering
    let listCounter = 0;

    const paragraphs = blocks.map(block => {
      // Create text runs from block runs
      const textRuns = block.runs.map(run => {
        return new TextRun({
          text: run.text,
          font: 'Calibri',
          size: fontSizes[block.type] || 22,
          bold: run.bold || block.type === 'heading',
          italics: run.italic
        });
      });

      // Handle list items
      if (block.type === 'list-item') {
        if (block.ordered) {
          listCounter++;
        }
        const prefix = block.ordered ? `${listCounter}. ` : '• ';

        // Add prefix as first run
        textRuns.unshift(new TextRun({
          text: prefix,
          font: 'Calibri',
          size: fontSizes['list-item']
        }));

        return new Paragraph({
          children: textRuns,
          spacing: { after: 80 },
          indent: { left: 720 } // 0.5 inch indent for lists
        });
      }

      // Reset list counter for non-list items
      if (block.type !== 'list-item') {
        listCounter = 0;
      }

      // Handle headings
      if (block.type === 'heading') {
        return new Paragraph({
          children: textRuns,
          heading: headingLevels[block.level] || HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        });
      }

      // Regular paragraph
      return new Paragraph({
        children: textRuns,
        spacing: { after: 120 }
      });
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              width: 12240, // 8.5 inches in twentieths of a point
              height: 15840 // 11 inches
            },
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: paragraphs
      }]
    });

    // Generate blob
    return await Packer.toBlob(doc);
  }

  detectContentType(content) {
    if (typeof DetectionUtils?.detectContentType === 'function') {
      return DetectionUtils.detectContentType(content);
    }

    // Fallback to plain text if helpers fail to load
    return 'txt';
  }

  async trackFormatUsage(format) {
    try {
      const stored = await chrome.storage.local.get(['formatUsage']);
      const formatUsage = stored.formatUsage || {};
      formatUsage[format] = (formatUsage[format] || 0) + 1;
      await chrome.storage.local.set({ formatUsage });
    } catch (error) {
      console.error('Failed to track format usage:', error);
    }
  }

  async trackDetectionAccuracy(detectedFormat) {
    try {
      const stored = await chrome.storage.local.get(['detectionAccuracy']);
      const accuracy = stored.detectionAccuracy || { total: 0, correct: 0 };
      accuracy.total++;
      // For now, we assume detection is correct. In future, users could provide feedback
      accuracy.correct++;
      await chrome.storage.local.set({ detectionAccuracy: accuracy });
    } catch (error) {
      console.error('Failed to track detection accuracy:', error);
    }
  }

  showNotification(message, type = 'success') {
    if (!this.settings.showNotifications) return;

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'FlashDoc',
      message: message,
      priority: type === 'error' ? 2 : 1
    });
  }
}

// Initialize
new FlashDoc();

// Handle installation and extension reload
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`⚡ FlashDoc ${details.reason}: re-injecting content scripts...`);

  // Re-inject content scripts into all existing tabs to fix "Extension not available" error
  // This is necessary because old content scripts become orphaned after extension reload
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      // Skip chrome:// pages, extension pages, and tabs without URLs
      if (tab.id && tab.url &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith('about:')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content.js']
          });
          console.log(`✅ Injected into tab ${tab.id}: ${tab.url.substring(0, 50)}...`);
        } catch (e) {
          // Tab might not support scripting - this is normal
          console.log(`⏭️ Skipped tab ${tab.id}: ${e.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to re-inject content scripts:', error);
  }

  if (details.reason === 'install') {
    console.log('🎉 FlashDoc installed!');
    chrome.tabs.create({ url: 'options.html' });
  }
});

// FlashDoc Service Worker
// Core download and file management logic

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
    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.warn('Context menu cleanup warning:', chrome.runtime.lastError.message);
      }

      if (!this.settings.enableContextMenu) {
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

      // Child menus
      menuItems.forEach(type => {
        chrome.contextMenus.create({
          id: `flashdoc-${type.id}`,
          parentId: 'flashdoc-parent',
          title: type.title,
          contexts: ['selection']
        });
      });
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
        const options = message.prefix ? { prefix: message.prefix } : {};
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

    const type = info.menuItemId.replace('flashdoc-', '');
    this.handleSave(info.selectionText, type, tab).catch((error) => {
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

      const { blob, mimeType } = this.createBlob(content, targetType);
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

  createBlob(content, extension) {
    if (extension === 'pdf') {
      const pdfBlob = this.createPdfBlob(content);
      return { blob: pdfBlob, mimeType: 'application/pdf' };
    }

    if (extension === 'docx') {
      const docxBlob = this.createDocxBlob(content);
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

  createPdfBlob(content) {
    const encoder = new TextEncoder();
    const sanitized = content
      .replace(/\r\n/g, '\n')
      .split('\n')
      .slice(0, 120)
      .map(line => line.substring(0, 120).replace(/[()\\]/g, '\\$&'));

    let stream = 'BT\n/F1 12 Tf\n50 780 Td\n';
    sanitized.forEach((line, index) => {
      if (index > 0) {
        stream += '0 -14 Td\n';
      }
      stream += `(${line || ' '}) Tj\n`;
    });
    stream += 'ET';

    const chunks = [];
    let offset = 0;
    const offsets = [0];

    const push = (text) => {
      const bytes = encoder.encode(text);
      chunks.push(bytes);
      offset += bytes.length;
    };

    const pushObject = (id, body) => {
      offsets.push(offset);
      push(`${id} 0 obj\n${body}\nendobj\n`);
    };

    push('%PDF-1.4\n');
    pushObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    pushObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    pushObject(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');

    const streamBytes = encoder.encode(stream);
    pushObject(4, `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
    pushObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    const xrefOffset = offset;
    push('xref\n');
    push(`0 ${offsets.length}\n`);
    push('0000000000 65535 f \n');
    offsets.slice(1).forEach((value) => {
      push(`${value.toString().padStart(10, '0')} 00000 n \n`);
    });

    push('trailer\n');
    push(`<< /Size ${offsets.length} /Root 1 0 R >>\n`);
    push('startxref\n');
    push(`${xrefOffset}\n`);
    push('%%EOF\n');

    return new Blob(chunks, { type: 'application/pdf' });
  }

  createLabelPdf(content) {
    const MM_TO_PT = 72 / 25.4;
    const width = 89 * MM_TO_PT;
    const height = 28 * MM_TO_PT;
    const marginX = 12;
    const marginY = 8;
    const maxLines = 4;
    const lineHeightFactor = 1.25;
    const widthFactor = 0.55;

    const wrapLine = (text, limit) => {
      const words = text.trim().split(/\s+/).filter(Boolean);
      const wrapped = [];
      let current = '';
      words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= limit || current.length === 0) {
          current = candidate;
        } else {
          wrapped.push(current);
          current = word;
        }
      });
      if (current) {
        wrapped.push(current);
      }
      return wrapped;
    };

    const rawLines = content
      .replace(/\r/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const lines = rawLines.length ? rawLines.flatMap(line => wrapLine(line, 28)) : [''];

    if (lines.length > maxLines) {
      const head = lines.slice(0, maxLines - 1);
      const tail = lines.slice(maxLines - 1).join(' ');
      head.push(tail);
      lines.length = 0;
      lines.push(...head.slice(0, maxLines));
    }

    while (lines.length < 1) {
      lines.push('');
    }

    const availableWidth = width - (marginX * 2);
    const availableHeight = height - (marginY * 2);

    const totalHeightFactor = 1 + ((lines.length - 1) * lineHeightFactor);
    const maxFontFromHeight = Math.floor(availableHeight / totalHeightFactor);
    let fontSize = Math.min(36, maxFontFromHeight || 14);
    const minFont = 8;

    const fitsWidth = (size) => lines.every(line => line.length === 0 || (line.length * size * widthFactor) <= availableWidth);

    while (fontSize > minFont && !fitsWidth(fontSize)) {
      fontSize -= 1;
    }
    if (fontSize < minFont) {
      fontSize = minFont;
    }

    const encoder = new TextEncoder();
    const lineHeight = fontSize * lineHeightFactor;
    const centerY = height / 2;
    const baselineAdjust = fontSize * 0.3;

    const escape = (text) => text.replace(/[()\\]/g, '\\$&');
    const estimateWidth = (text) => text.length * fontSize * widthFactor;

    let stream = `BT\n/F1 ${fontSize.toFixed(2)} Tf\n`;
    lines.forEach((line, index) => {
      const textWidth = estimateWidth(line);
      const x = Math.max(marginX, (width - textWidth) / 2);
      const offset = ((lines.length - 1) / 2 - index) * lineHeight;
      const y = centerY + offset - baselineAdjust;
      stream += `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm\n(${escape(line) || ' '}) Tj\n`;
    });
    stream += 'ET';

    const chunks = [];
    let offset = 0;
    const offsets = [0];

    const push = (text) => {
      const bytes = encoder.encode(text);
      chunks.push(bytes);
      offset += bytes.length;
    };

    const pushObject = (id, body) => {
      offsets.push(offset);
      push(`${id} 0 obj\n${body}\nendobj\n`);
    };

    push('%PDF-1.4\n');
    pushObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    pushObject(2, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
    pushObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`);

    const streamBytes = encoder.encode(stream);
    pushObject(4, `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
    pushObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    const xrefOffset = offset;
    push('xref\n');
    push(`0 ${offsets.length}\n`);
    push('0000000000 65535 f \n');
    offsets.slice(1).forEach((value) => {
      push(`${value.toString().padStart(10, '0')} 00000 n \n`);
    });

    push('trailer\n');
    push(`<< /Size ${offsets.length} /Root 1 0 R >>\n`);
    push('startxref\n');
    push(`${xrefOffset}\n`);
    push('%%EOF\n');

    return new Blob(chunks, { type: 'application/pdf' });
  }

  createDocxBlob(content) {
    // DOCX is a ZIP archive containing XML files
    // This creates a minimal valid DOCX document

    const escapeXml = (text) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Convert content to paragraphs
    const paragraphs = content
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(line => `<w:p><w:r><w:t>${escapeXml(line) || ' '}</w:t></w:r></w:p>`)
      .join('');

    // XML files that make up a DOCX
    const files = {
      '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,

      '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,

      'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,

      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
    };

    // Build ZIP archive (STORE method - no compression)
    const encoder = new TextEncoder();
    const chunks = [];
    const centralDirectory = [];
    let offset = 0;

    const crc32 = (data) => {
      let crc = 0xFFFFFFFF;
      const table = [];
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
      }
      for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const writeUint16 = (value) => new Uint8Array([value & 0xFF, (value >> 8) & 0xFF]);
    const writeUint32 = (value) => new Uint8Array([value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]);

    for (const [filename, content] of Object.entries(files)) {
      const filenameBytes = encoder.encode(filename);
      const contentBytes = encoder.encode(content);
      const crc = crc32(contentBytes);

      // Local file header
      const localHeader = new Uint8Array([
        0x50, 0x4B, 0x03, 0x04, // Signature
        0x0A, 0x00,             // Version needed (1.0)
        0x00, 0x00,             // General purpose flags
        0x00, 0x00,             // Compression method (STORE)
        0x00, 0x00,             // Last mod time
        0x00, 0x00,             // Last mod date
        ...writeUint32(crc),
        ...writeUint32(contentBytes.length),  // Compressed size
        ...writeUint32(contentBytes.length),  // Uncompressed size
        ...writeUint16(filenameBytes.length),
        0x00, 0x00              // Extra field length
      ]);

      chunks.push(localHeader);
      chunks.push(filenameBytes);
      chunks.push(contentBytes);

      // Store info for central directory
      centralDirectory.push({
        filename: filenameBytes,
        crc,
        size: contentBytes.length,
        offset
      });

      offset += localHeader.length + filenameBytes.length + contentBytes.length;
    }

    // Central directory
    const centralStart = offset;
    for (const entry of centralDirectory) {
      const centralHeader = new Uint8Array([
        0x50, 0x4B, 0x01, 0x02, // Signature
        0x14, 0x00,             // Version made by
        0x0A, 0x00,             // Version needed
        0x00, 0x00,             // Flags
        0x00, 0x00,             // Compression
        0x00, 0x00,             // Mod time
        0x00, 0x00,             // Mod date
        ...writeUint32(entry.crc),
        ...writeUint32(entry.size),
        ...writeUint32(entry.size),
        ...writeUint16(entry.filename.length),
        0x00, 0x00,             // Extra field length
        0x00, 0x00,             // Comment length
        0x00, 0x00,             // Disk number
        0x00, 0x00,             // Internal attributes
        0x00, 0x00, 0x00, 0x00, // External attributes
        ...writeUint32(entry.offset)
      ]);

      chunks.push(centralHeader);
      chunks.push(entry.filename);
      offset += centralHeader.length + entry.filename.length;
    }

    // End of central directory
    const centralSize = offset - centralStart;
    const endRecord = new Uint8Array([
      0x50, 0x4B, 0x05, 0x06, // Signature
      0x00, 0x00,             // Disk number
      0x00, 0x00,             // Central directory disk
      ...writeUint16(centralDirectory.length),
      ...writeUint16(centralDirectory.length),
      ...writeUint32(centralSize),
      ...writeUint32(centralStart),
      0x00, 0x00              // Comment length
    ]);

    chunks.push(endRecord);

    return new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  detectContentType(content) {
    // YAML detection
    if (this.isYAML(content)) return 'yaml';

    // Python detection
    if (this.isPython(content)) return 'py';

    // TypeScript detection (must come before JavaScript)
    if (this.isTypeScript(content)) return 'ts';

    // JavaScript detection
    if (this.isJavaScript(content)) return 'js';

    // JSON detection
    if (this.isJSON(content)) return 'json';

    // XML/SVG detection
    if (this.isXML(content)) return 'xml';

    // SQL detection
    if (this.isSQL(content)) return 'sql';

    // Shell script detection
    if (this.isShellScript(content)) return 'sh';

    // CSV detection
    if (this.isCSV(content)) return 'csv';

    // Markdown detection
    if (this.isMarkdown(content)) return 'md';

    // HTML detection
    if (this.isHTML(content)) return 'html';

    // CSS detection
    if (this.isCSS(content)) return 'css';

    // Default
    return 'txt';
  }

  isYAML(content) {
    const yamlPatterns = [
      /^[\w-]+:\s+[\w\s]/m,
      /^  - /m,
      /^---\s*$/m,
      /^\w+:\s*$/m
    ];
    return yamlPatterns.some(p => p.test(content));
  }

  isPython(content) {
    const pythonPatterns = [
      /^def\s+\w+\s*\(/m,
      /^class\s+\w+/m,
      /^import\s+\w+/m,
      /^from\s+\w+\s+import/m,
      /if\s+__name__\s*==\s*['"]__main__['"]/
    ];
    const score = pythonPatterns.filter(p => p.test(content)).length;
    return score >= 2;
  }

  isJavaScript(content) {
    const jsPatterns = [
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /=>\s*{/,
      /require\(['"]/,
      /import\s+.*\s+from\s+['"]/
    ];
    const score = jsPatterns.filter(p => p.test(content)).length;
    return score >= 2;
  }

  isJSON(content) {
    try {
      JSON.parse(content.trim());
      return true;
    } catch {
      return false;
    }
  }

  isMarkdown(content) {
    const mdPatterns = [
      /^#{1,6}\s+/m,
      /\[.+\]\(.+\)/,
      /^\s*[-*+]\s+/m,
      /```[\w]*\n/,
      /^\d+\.\s+/m
    ];
    const score = mdPatterns.filter(p => p.test(content)).length;
    return score >= 2;
  }

  isHTML(content) {
    const htmlPatterns = [
      /<html/i,
      /<body/i,
      /<div/i,
      /<head/i,
      /<!DOCTYPE/i
    ];
    return htmlPatterns.some(p => p.test(content));
  }

  isCSV(content) {
    const trimmed = content.trim();
    if (!trimmed.includes('\n')) return false;

    const delimiters = [',', ';', '\t'];
    const lines = trimmed.split(/\r?\n/);
    const delimiter = delimiters.find(symbol => lines[0].includes(symbol));
    if (!delimiter) return false;

    const columnCount = lines[0].split(delimiter).length;
    if (columnCount < 2) return false;

    return lines.slice(1).every((line) => {
      if (!line.trim()) return true;
      const cells = line.split(delimiter);
      return cells.length === columnCount;
    });
  }

  isTypeScript(content) {
    const tsPatterns = [
      /:\s*(string|number|boolean|any|void|never|unknown)\s*[;,)=]/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /<\w+>/,
      /as\s+(const|string|number|boolean|any)/,
      /export\s+(type|interface)/,
      /React\.FC</,
      /useState<.*>/,
      /:\s*React\./
    ];
    const score = tsPatterns.filter(p => p.test(content)).length;
    return score >= 2;
  }

  isXML(content) {
    const xmlPatterns = [
      /<\?xml/i,
      /<svg/i,
      /<\w+[^>]*xmlns/,
      /<\w+>\s*<\w+>/,
      /<!ENTITY/i
    ];
    const trimmed = content.trim();
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<svg')) return true;
    return xmlPatterns.some(p => p.test(content));
  }

  isSQL(content) {
    const sqlPatterns = [
      /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\s+/i,
      /\bFROM\s+\w+/i,
      /\bWHERE\s+/i,
      /\bJOIN\s+/i,
      /\bGROUP\s+BY\b/i,
      /\bORDER\s+BY\b/i,
      /\bINTO\s+\w+/i
    ];
    const score = sqlPatterns.filter(p => p.test(content)).length;
    return score >= 2;
  }

  isShellScript(content) {
    const shellPatterns = [
      /^#!\/bin\/(ba)?sh/m,
      /^#!\/usr\/bin\/env\s+(ba)?sh/m,
      /\b(echo|export|source|alias)\s+/,
      /\$\{?\w+\}?/,
      /if\s+\[.*\]\s*;\s*then/,
      /for\s+\w+\s+in\s+/,
      /while\s+\[.*\]/
    ];
    const score = shellPatterns.filter(p => p.test(content)).length;
    if (content.trim().startsWith('#!/bin/bash') || content.trim().startsWith('#!/bin/sh')) return true;
    return score >= 2;
  }

  isCSS(content) {
    const cssPatterns = [
      /[\w-]+\s*\{[^}]*[\w-]+\s*:\s*[^}]+\}/,
      /@media\s*\([^)]+\)/,
      /@import\s+/,
      /[\w-]+:\s*[\w-]+(\([^)]*\))?;/,
      /\.([\w-]+)\s*\{/,
      /#([\w-]+)\s*\{/,
      /@keyframes\s+\w+/
    ];
    const score = cssPatterns.filter(p => p.test(content)).length;
    return score >= 2;
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

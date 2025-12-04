// InstantFile Service Worker
// Core download and file management logic

class InstantFile {
  constructor() {
    this.stats = {
      totalFiles: 0,
      lastFile: '',
      lastTimestamp: null
    };
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
    
    console.log('âš¡ InstantFile initialized');
  }

  async loadSettings() {
    const defaults = {
      folderPath: 'InstantFiles/',
      namingPattern: 'timestamp',
      customPattern: 'file_{date}',
      organizeByType: true,
      showNotifications: true,
      playSound: false,
      autoDetectType: true
    };

    const stored = await chrome.storage.sync.get(defaults);
    return { ...defaults, ...stored };
  }

  async loadStats() {
    const stored = await chrome.storage.local.get(['stats']);
    if (stored.stats) {
      this.stats = stored.stats;
    }
  }

  async saveStats() {
    await chrome.storage.local.set({ stats: this.stats });
  }

  setupContextMenus() {
    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
      const fileTypes = [
        { id: 'auto', title: 'âš¡ Auto-detect & Save', icon: 'âš¡' },
        { id: 'txt', title: 'ðŸ“„ Save as .txt', icon: 'ðŸ“„' },
        { id: 'md', title: 'ðŸ“ Save as .md', icon: 'ðŸ“' },
        { id: 'yaml', title: 'âš™ï¸ Save as .yaml', icon: 'âš™ï¸' },
        { id: 'py', title: 'ðŸ Save as .py', icon: 'ðŸ' }
      ];

      // Parent menu
      chrome.contextMenus.create({
        id: 'instant-file-parent',
        title: 'âš¡ InstantFile',
        contexts: ['selection']
      });

      // Child menus
      fileTypes.forEach(type => {
        chrome.contextMenus.create({
          id: `instant-${type.id}`,
          parentId: 'instant-file-parent',
          title: type.title,
          contexts: ['selection']
        });
      });
    });

    // Handle clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId.startsWith('instant-')) {
        const type = info.menuItemId.replace('instant-', '');
        this.handleSave(info.selectionText, type, tab);
      }
    });
  }

  setupCommandListeners() {
    chrome.commands.onCommand.addListener((command) => {
      if (command.startsWith('save-as-')) {
        const type = command.replace('save-as-', '');
        this.getSelectionAndSave(type);
      }
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'saveContent') {
        this.handleSave(message.content, message.type, sender.tab);
        sendResponse({ success: true });
      } else if (message.action === 'getStats') {
        sendResponse({ stats: this.stats });
      } else if (message.action === 'getSettings') {
        sendResponse({ settings: this.settings });
      }
      return true;
    });
  }

  async getSelectionAndSave(type) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      if (results && results[0] && results[0].result) {
        await this.handleSave(results[0].result, type, tab);
      }
    } catch (error) {
      console.error('Error getting selection:', error);
      this.showNotification('âŒ No text selected', 'error');
    }
  }

  async handleSave(content, type, tab) {
    if (!content || content.trim().length === 0) {
      this.showNotification('âŒ No content to save', 'error');
      return;
    }

    try {
      // Auto-detect if requested
      if (type === 'auto' && this.settings.autoDetectType) {
        type = this.detectContentType(content);
      }

      // Generate filename
      const filename = this.generateFilename(content, type, tab);
      
      // Create file path with optional type organization
      let filepath = this.settings.folderPath;
      if (this.settings.organizeByType) {
        filepath += `${type}/`;
      }
      filepath += filename;

      // Create blob and download
      const blob = this.createBlob(content, type);
      const url = URL.createObjectURL(blob);

      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filepath,
        saveAs: false,
        conflictAction: 'uniquify'
      });

      // Update stats
      this.stats.totalFiles++;
      this.stats.lastFile = filename;
      this.stats.lastTimestamp = Date.now();
      await this.saveStats();

      // Show success notification
      if (this.settings.showNotifications) {
        this.showNotification(`âœ¨ ${filename} created!`);
      }

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      console.log(`âœ… File saved: ${filepath}`);

    } catch (error) {
      console.error('Error saving file:', error);
      this.showNotification(`âŒ Error: ${error.message}`, 'error');
    }
  }

  generateFilename(content, extension, tab) {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5);

    switch (this.settings.namingPattern) {
      case 'firstline': {
        const firstLine = content.split('\n')[0]
          .substring(0, 50)
          .replace(/[^a-z0-9]/gi, '_')
          .replace(/_+/g, '_')
          .toLowerCase()
          .trim();
        
        return firstLine && firstLine.length > 3
          ? `${firstLine}.${extension}`
          : `instant_${timestamp}.${extension}`;
      }

      case 'custom': {
        const pattern = this.settings.customPattern
          .replace('{date}', timestamp.split('_')[0])
          .replace('{time}', timestamp.split('_')[1])
          .replace('{type}', extension);
        return `${pattern}.${extension}`;
      }

      case 'timestamp':
      default:
        return `instant_${timestamp}.${extension}`;
    }
  }

  createBlob(content, extension) {
    const mimeTypes = {
      'txt': 'text/plain;charset=utf-8',
      'md': 'text/markdown;charset=utf-8',
      'yaml': 'text/yaml;charset=utf-8',
      'py': 'text/x-python;charset=utf-8',
      'js': 'text/javascript;charset=utf-8',
      'json': 'application/json;charset=utf-8',
      'html': 'text/html;charset=utf-8',
      'css': 'text/css;charset=utf-8'
    };

    const mimeType = mimeTypes[extension] || 'text/plain;charset=utf-8';
    return new Blob([content], { type: mimeType });
  }

  detectContentType(content) {
    // YAML detection
    if (this.isYAML(content)) return 'yaml';
    
    // Python detection
    if (this.isPython(content)) return 'py';
    
    // JavaScript detection
    if (this.isJavaScript(content)) return 'js';
    
    // JSON detection
    if (this.isJSON(content)) return 'json';
    
    // Markdown detection
    if (this.isMarkdown(content)) return 'md';
    
    // HTML detection
    if (this.isHTML(content)) return 'html';
    
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

  showNotification(message, type = 'success') {
    if (!this.settings.showNotifications) return;

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon128.png',
      title: 'InstantFile',
      message: message,
      priority: type === 'error' ? 2 : 1
    });
  }
}

// Initialize
const instantFile = new InstantFile();

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ðŸŽ‰ InstantFile installed!');
    chrome.tabs.create({ url: 'options/options.html' });
  }
});

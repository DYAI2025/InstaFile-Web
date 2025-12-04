// InstaFile Content Script - Enhanced Selection Detection & Floating UI
// Zero-friction file creation with intelligent format detection

class InstaFileContent {
  constructor() {
    this.selectedText = '';
    this.floatingButton = null;
    this.settings = {
      showFloatingButton: true,
      buttonPosition: 'bottom-right',
      autoHideButton: true,
      selectionThreshold: 10,
      enableContextMenu: true,
      enableSmartDetection: true
    };
    this.stats = { totalSaves: 0 };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupSelectionListener();
    this.setupMessageListener();
    this.setupKeyboardShortcuts();
    this.injectStyles();
    
    if (this.settings.showFloatingButton) {
      this.createFloatingButton();
    }
    
    console.log('⚡ InstaFile content script initialized');
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(null);
      this.settings = { ...this.settings, ...stored };
    } catch (error) {
      console.error('Settings load error:', error);
    }
  }

  // Advanced Selection Detection
  setupSelectionListener() {
    let selectionTimer = null;
    
    // Monitor selection changes
    document.addEventListener('selectionchange', () => {
      clearTimeout(selectionTimer);
      
      selectionTimer = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > this.settings.selectionThreshold) {
          this.selectedText = text;
          this.onTextSelected(text, selection);
        } else {
          this.onSelectionCleared();
        }
      }, 200);
    });

    // Mouse up for immediate feedback
    document.addEventListener('mouseup', (e) => {
      // Skip if clicking on our UI elements
      if (e.target.closest('.instafile-floating') || 
          e.target.closest('.instafile-contextual')) {
        return;
      }
      
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > this.settings.selectionThreshold) {
          this.selectedText = text;
          this.showContextualButton(e.pageX, e.pageY, text);
        }
      }, 10);
    });

    // Touch support for mobile
    document.addEventListener('touchend', (e) => {
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > this.settings.selectionThreshold) {
          this.selectedText = text;
          const touch = e.changedTouches[0];
          this.showContextualButton(touch.pageX, touch.pageY, text);
        }
      }, 100);
    });
  }

  onTextSelected(text, selection) {
    // Visual feedback
    this.highlightSelection(selection);
    
    // Update floating button
    if (this.floatingButton) {
      this.updateFloatingButton(true, text);
    }
    
    // Smart type detection
    if (this.settings.enableSmartDetection) {
      const detectedType = this.detectContentType(text);
      console.log(`📝 Selected ${text.length} chars, detected: ${detectedType}`);
    }
  }

  onSelectionCleared() {
    this.selectedText = '';
    this.removeHighlight();
    this.hideContextualButton();
    
    if (this.floatingButton && this.settings.autoHideButton) {
      this.updateFloatingButton(false);
    }
  }

  // Visual Feedback System
  highlightSelection(selection) {
    if (!selection.rangeCount) return;
    
    // Remove existing highlights
    this.removeHighlight();
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Create elegant highlight overlay
    const highlight = document.createElement('div');
    highlight.className = 'instafile-highlight';
    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      z-index: 999998;
    `;
    
    document.body.appendChild(highlight);
    
    // Auto-remove after 3 seconds
    setTimeout(() => this.removeHighlight(), 3000);
  }

  removeHighlight() {
    document.querySelectorAll('.instafile-highlight').forEach(el => el.remove());
  }

  // Contextual Save Button
  showContextualButton(x, y, text) {
    this.hideContextualButton();
    
    if (!this.settings.enableContextMenu) return;
    
    const detectedType = this.detectContentType(text);
    
    const button = document.createElement('div');
    button.className = 'instafile-contextual';
    button.innerHTML = `
      <div class="instafile-ctx-main">
        <span class="instafile-ctx-icon">⚡</span>
        <span class="instafile-ctx-text">Save</span>
        <span class="instafile-ctx-type">${detectedType.toUpperCase()}</span>
      </div>
      <div class="instafile-ctx-options">
        <button data-format="txt" title="Text">📄</button>
        <button data-format="md" title="Markdown">📝</button>
        <button data-format="pdf" title="PDF">📕</button>
      </div>
    `;
    
    // Smart positioning to avoid viewport edges
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonWidth = 140;
    const buttonHeight = 40;
    
    let posX = x + 10;
    let posY = y - buttonHeight - 10;
    
    if (posX + buttonWidth > viewportWidth) {
      posX = viewportWidth - buttonWidth - 10;
    }
    if (posY < 10) {
      posY = y + 20;
    }
    
    button.style.left = `${posX}px`;
    button.style.top = `${posY}px`;
    
    // Event handlers
    button.querySelector('.instafile-ctx-main').addEventListener('click', (e) => {
      e.stopPropagation();
      this.quickSave();
      this.hideContextualButton();
    });
    
    button.querySelectorAll('.instafile-ctx-options button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.saveWithFormat(btn.dataset.format);
        this.hideContextualButton();
      });
    });
    
    document.body.appendChild(button);
    
    // Auto-hide after 5 seconds
    this.contextualTimeout = setTimeout(() => {
      this.hideContextualButton();
    }, 5000);
  }

  hideContextualButton() {
    clearTimeout(this.contextualTimeout);
    document.querySelectorAll('.instafile-contextual').forEach(el => {
      el.style.animation = 'instafile-fade-out 0.2s ease-out';
      setTimeout(() => el.remove(), 200);
    });
  }

  // Floating Action Button
  createFloatingButton() {
    if (this.floatingButton) return;
    
    const button = document.createElement('div');
    button.className = 'instafile-floating';
    button.innerHTML = `
      <div class="instafile-fab">
        <div class="instafile-fab-icon">
          <span class="instafile-fab-bolt">⚡</span>
          <span class="instafile-fab-save" style="display:none">💾</span>
        </div>
        <div class="instafile-fab-menu">
          <button data-format="smart" class="instafile-fab-option" title="Smart Save">
            <span>🎯</span>
            <label>Auto</label>
          </button>
          <button data-format="txt" class="instafile-fab-option" title="Text">
            <span>📄</span>
            <label>TXT</label>
          </button>
          <button data-format="md" class="instafile-fab-option" title="Markdown">
            <span>📝</span>
            <label>MD</label>
          </button>
          <button data-format="pdf" class="instafile-fab-option" title="PDF">
            <span>📕</span>
            <label>PDF</label>
          </button>
          <button data-format="code" class="instafile-fab-option" title="Code">
            <span>👨‍💻</span>
            <label>Code</label>
          </button>
        </div>
      </div>
      <div class="instafile-fab-counter" title="Total files saved">0</div>
    `;
    
    // Position based on settings
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };
    
    const pos = positions[this.settings.buttonPosition] || positions['bottom-right'];
    Object.assign(button.style, pos);
    
    // Setup interactions
    const fabIcon = button.querySelector('.instafile-fab-icon');
    const fabMenu = button.querySelector('.instafile-fab-menu');
    
    fabIcon.addEventListener('click', () => {
      if (this.selectedText) {
        // Direct save if text is selected
        this.quickSave();
      } else {
        // Show menu if no selection
        fabMenu.classList.toggle('show');
      }
    });
    
    // Menu options
    fabMenu.addEventListener('click', (e) => {
      const option = e.target.closest('.instafile-fab-option');
      if (option) {
        const format = option.dataset.format;
        if (format === 'code') {
          // Special handling for code - save page source
          this.savePageSource();
        } else {
          this.saveWithFormat(format);
        }
        fabMenu.classList.remove('show');
      }
    });
    
    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.instafile-floating')) {
        fabMenu.classList.remove('show');
      }
    });
    
    document.body.appendChild(button);
    this.floatingButton = button;
    
    // Load stats
    this.updateButtonStats();
  }

  updateFloatingButton(hasSelection, text = '') {
    if (!this.floatingButton) return;
    
    const boltIcon = this.floatingButton.querySelector('.instafile-fab-bolt');
    const saveIcon = this.floatingButton.querySelector('.instafile-fab-save');
    const fabIcon = this.floatingButton.querySelector('.instafile-fab-icon');
    
    if (hasSelection) {
      boltIcon.style.display = 'none';
      saveIcon.style.display = 'block';
      fabIcon.classList.add('active');
      fabIcon.title = `Save ${text.length} characters`;
    } else {
      boltIcon.style.display = 'block';
      saveIcon.style.display = 'none';
      fabIcon.classList.remove('active');
      fabIcon.title = 'InstaFile - Click for options';
    }
  }

  async updateButtonStats() {
    if (!this.floatingButton) return;
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStats' });
      const counter = this.floatingButton.querySelector('.instafile-fab-counter');
      
      if (response && response.stats) {
        const count = response.stats.totalFiles || 0;
        counter.textContent = count;
        counter.title = `${count} files saved${response.stats.lastFile ? '\nLast: ' + response.stats.lastFile : ''}`;
        this.stats.totalSaves = count;
      }
    } catch (error) {
      console.error('Stats error:', error);
    }
  }

  // Content Type Detection
  detectContentType(text) {
    if (!text) return 'txt';
    
    // URL detection
    if (/^https?:\/\/.+/i.test(text)) return 'url';
    
    // Code detection patterns
    const codePatterns = {
      'py': [/def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /print\s*\(/, /class\s+\w+.*:/],
      'js': [/function\s+\w+\s*\(/, /const\s+\w+\s*=/, /let\s+\w+\s*=/, /=>\s*{/, /console\.log/],
      'html': [/<html/i, /<body/i, /<div/, /<\/\w+>/, /<!DOCTYPE/i],
      'css': [/\{[\s\S]*[\w-]+\s*:/, /@media/, /\.[\w-]+\s*\{/, /#[\w-]+\s*\{/],
      'json': [/^\s*\{[\s\S]*\}\s*$/, /^\s*\[[\s\S]*\]\s*$/]
    };
    
    for (const [type, patterns] of Object.entries(codePatterns)) {
      const matches = patterns.filter(p => p.test(text)).length;
      if (matches >= 2 || (type === 'json' && matches === 1)) {
        return type;
      }
    }
    
    // Data format detection
    if (/^[\w-]+:\s*[\w\s]/m.test(text) || /^  - /m.test(text)) return 'yaml';
    if (text.split('\n').every(line => line.split(/[,;\t]/).length > 1)) return 'csv';
    
    // Document format detection
    if (/^#{1,6}\s+/m.test(text) || /\[.+\]\(.+\)/.test(text)) return 'md';
    
    return 'txt';
  }

  // Save Functions
  async quickSave() {
    if (!this.selectedText) {
      this.showToast('⚠️ No text selected', 'warning');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveContent',
        content: this.selectedText,
        type: 'auto'
      });
      
      if (response && response.success) {
        this.showToast(`✅ Saved: ${this.selectedText.substring(0, 30)}...`, 'success');
        this.updateButtonStats();
        this.addSaveAnimation();
        this.selectedText = '';
        this.updateFloatingButton(false);
      } else {
        this.showToast('❌ Save failed', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showToast('❌ Save failed', 'error');
    }
  }

  async saveWithFormat(format) {
    if (!this.selectedText && format !== 'smart') {
      this.showToast('⚠️ No text selected', 'warning');
      return;
    }
    
    const content = this.selectedText || document.title + '\n' + window.location.href;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveContent',
        content: content,
        type: format === 'smart' ? 'auto' : format
      });
      
      if (response && response.success) {
        this.showToast(`✅ Saved as ${format.toUpperCase()}`, 'success');
        this.updateButtonStats();
        this.addSaveAnimation();
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showToast('❌ Save failed', 'error');
    }
  }

  async savePageSource() {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      html: document.documentElement.outerHTML
    };
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveContent',
        content: pageInfo.html,
        type: 'html'
      });
      
      if (response && response.success) {
        this.showToast('✅ Page source saved', 'success');
        this.updateButtonStats();
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showToast('❌ Failed to save page', 'error');
    }
  }

  // Visual Feedback
  showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.instafile-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `instafile-toast instafile-toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-hide
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  addSaveAnimation() {
    if (!this.floatingButton) return;
    
    const icon = this.floatingButton.querySelector('.instafile-fab-icon');
    icon.classList.add('success');
    
    setTimeout(() => {
      icon.classList.remove('success');
    }, 600);
  }

  // Keyboard Shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + S - Smart save
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (this.selectedText) {
          this.quickSave();
        } else {
          this.showToast('⚠️ Select text first', 'warning');
        }
      }
    });
  }

  // Message Handler
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getSelection') {
        sendResponse({ text: window.getSelection().toString() });
      } else if (request.action === 'updateSettings') {
        this.loadSettings().then(() => {
          // Update UI based on new settings
          if (this.settings.showFloatingButton && !this.floatingButton) {
            this.createFloatingButton();
          } else if (!this.settings.showFloatingButton && this.floatingButton) {
            this.floatingButton.remove();
            this.floatingButton = null;
          }
        });
      }
      return true;
    });
  }

  // Style Injection
  injectStyles() {
    const style = document.createElement('style');
    style.id = 'instafile-styles';
    style.textContent = `
      /* Animations */
      @keyframes instafile-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes instafile-slide-in {
        from { 
          opacity: 0;
          transform: translateY(10px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes instafile-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes instafile-success-bounce {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.2) rotate(5deg); }
        75% { transform: scale(1.1) rotate(-5deg); }
      }
      
      /* Highlight */
      .instafile-highlight {
        background: linear-gradient(135deg, 
          rgba(102, 126, 234, 0.1), 
          rgba(118, 75, 162, 0.1));
        border: 2px solid rgba(102, 126, 234, 0.3);
        border-radius: 4px;
        animation: instafile-pulse 2s ease-in-out infinite;
      }
      
      /* Contextual Button */
      .instafile-contextual {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: instafile-slide-in 0.2s ease-out;
      }
      
      .instafile-ctx-main {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        transition: all 0.2s;
        font-size: 14px;
      }
      
      .instafile-ctx-main:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
      
      .instafile-ctx-icon {
        font-size: 18px;
      }
      
      .instafile-ctx-type {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 0.5px;
      }
      
      .instafile-ctx-options {
        display: flex;
        gap: 4px;
        margin-top: 4px;
        padding: 0 8px;
      }
      
      .instafile-ctx-options button {
        width: 32px;
        height: 32px;
        border: none;
        background: white;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        transition: all 0.2s;
      }
      
      .instafile-ctx-options button:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      }
      
      /* Floating Button */
      .instafile-floating {
        position: fixed;
        z-index: 999996;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .instafile-fab-icon {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        transition: all 0.3s;
        position: relative;
      }
      
      .instafile-fab-icon:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
      
      .instafile-fab-icon.active {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        animation: instafile-pulse 2s infinite;
      }
      
      .instafile-fab-icon.success {
        animation: instafile-success-bounce 0.6s ease-out;
      }
      
      .instafile-fab-menu {
        position: absolute;
        bottom: 70px;
        right: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        opacity: 0;
        pointer-events: none;
        transform: scale(0.8) translateY(10px);
        transition: all 0.3s;
      }
      
      .instafile-fab-menu.show {
        opacity: 1;
        pointer-events: auto;
        transform: scale(1) translateY(0);
      }
      
      .instafile-fab-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.2s;
        white-space: nowrap;
      }
      
      .instafile-fab-option:hover {
        transform: translateX(-4px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .instafile-fab-option span {
        font-size: 18px;
      }
      
      .instafile-fab-option label {
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      
      .instafile-fab-counter {
        position: absolute;
        top: -8px;
        right: -8px;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        font-size: 11px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 12px;
        min-width: 24px;
        text-align: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      
      /* Toast Notifications */
      .instafile-toast {
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 300px;
        transform: translateX(400px);
        transition: transform 0.3s ease-out;
        z-index: 999999;
      }
      
      .instafile-toast.show {
        transform: translateX(0);
      }
      
      .instafile-toast-success {
        background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
      }
      
      .instafile-toast-error {
        background: linear-gradient(135deg, #e53935 0%, #e35d5b 100%);
      }
      
      .instafile-toast-warning {
        background: linear-gradient(135deg, #f57c00 0%, #ffb74d 100%);
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Initialize InstaFile
const instaFile = new InstaFileContent();

// Page visibility listener for stats refresh
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    instaFile.updateButtonStats();
  }
});

// Log initialization
console.log('⚡ InstaFile content script loaded - Zero-friction file creation ready');
// FlashDoc Content Script - Enhanced Selection Detection & Floating UI
// Zero-friction file creation with intelligent format detection

class FlashDocContent {
  constructor() {
    this.selectedText = '';
    this.selectedHtml = ''; // HTML content of selection for formatting
    this.floatingButton = null;
    this.cornerBall = null; // F3: Separate corner ball element
    this.settings = {
      showFloatingButton: true,
      showCornerBall: true, // F3: Corner ball visibility setting
      buttonPosition: 'bottom-right',
      autoHideButton: true,
      selectionThreshold: 10,
      enableContextMenu: true,
      enableSmartDetection: true,
      categoryShortcuts: [] // Category shortcuts: {id, name, format}
    };
    this.stats = { totalSaves: 0 };
    this.runtimeUnavailable = false;
    this.ballDragState = null; // F3: Ball drag state
    this.ballSnapBackTimer = null; // F3: Timer for snap-back
    this.ballPinned = false; // F3: Pin state
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

    // F3: Create corner ball (separate from floating button)
    if (this.settings.showCornerBall) {
      this.createCornerBall();
    }

    console.log('⚡ FlashDoc content script initialized');
  }

  // F3: Corner Ball - Draggable corner icon
  createCornerBall() {
    // Prevent duplicates from re-injection
    const existing = document.querySelector('.flashdoc-corner-ball');
    if (existing) {
      existing.remove();
    }
    if (this.cornerBall) return;

    const ball = document.createElement('div');
    ball.className = 'flashdoc-corner-ball';
    ball.innerHTML = `
      <div class="flashdoc-ball-icon">⚡</div>
      <div class="flashdoc-ball-pin" title="Pin position">📌</div>
    `;

    // Default position (bottom-right corner)
    this.ballDefaultPosition = { bottom: '80px', right: '20px' };
    Object.assign(ball.style, this.ballDefaultPosition);

    // Drag functionality
    ball.addEventListener('mousedown', (e) => this.startBallDrag(e));
    document.addEventListener('mousemove', (e) => this.onBallDrag(e));
    document.addEventListener('mouseup', (e) => this.endBallDrag(e));

    // Touch support
    ball.addEventListener('touchstart', (e) => this.startBallDrag(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.onBallDrag(e), { passive: false });
    document.addEventListener('touchend', (e) => this.endBallDrag(e));

    // Pin button click
    ball.querySelector('.flashdoc-ball-pin').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleBallPin();
    });

    // Ball click opens menu
    ball.querySelector('.flashdoc-ball-icon').addEventListener('click', (e) => {
      if (!this.ballDragState?.moved) {
        this.showBallMenu(e);
      }
    });

    document.body.appendChild(ball);
    this.cornerBall = ball;
  }

  startBallDrag(e) {
    if (!this.cornerBall) return;
    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const rect = this.cornerBall.getBoundingClientRect();

    this.ballDragState = {
      active: true,
      moved: false,
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top
    };

    this.cornerBall.classList.add('dragging');

    // Clear snap-back timer on new drag
    if (this.ballSnapBackTimer) {
      clearTimeout(this.ballSnapBackTimer);
      this.ballSnapBackTimer = null;
    }
  }

  onBallDrag(e) {
    if (!this.ballDragState?.active) return;
    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const dx = Math.abs(touch.clientX - this.ballDragState.startX);
    const dy = Math.abs(touch.clientY - this.ballDragState.startY);

    // Only count as drag if moved more than 5px
    if (dx > 5 || dy > 5) {
      this.ballDragState.moved = true;
    }

    // Calculate new position (clamped to viewport)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const ballSize = 48;

    let newX = touch.clientX - this.ballDragState.offsetX;
    let newY = touch.clientY - this.ballDragState.offsetY;

    // Clamp to viewport
    newX = Math.max(10, Math.min(newX, viewportWidth - ballSize - 10));
    newY = Math.max(10, Math.min(newY, viewportHeight - ballSize - 10));

    // Use left/top for dragging (override right/bottom)
    this.cornerBall.style.right = 'auto';
    this.cornerBall.style.bottom = 'auto';
    this.cornerBall.style.left = `${newX}px`;
    this.cornerBall.style.top = `${newY}px`;
  }

  endBallDrag(e) {
    if (!this.ballDragState?.active) return;

    this.cornerBall.classList.remove('dragging');

    if (this.ballDragState.moved && !this.ballPinned) {
      // F3: Snap back after 5 seconds if not pinned
      this.ballSnapBackTimer = setTimeout(() => {
        this.snapBallBack();
      }, 5000);
    }

    this.ballDragState.active = false;
  }

  snapBallBack() {
    if (!this.cornerBall || this.ballPinned) return;

    this.cornerBall.classList.add('snapping');
    this.cornerBall.style.left = 'auto';
    this.cornerBall.style.top = 'auto';
    Object.assign(this.cornerBall.style, this.ballDefaultPosition);

    setTimeout(() => {
      this.cornerBall.classList.remove('snapping');
    }, 300);
  }

  toggleBallPin() {
    this.ballPinned = !this.ballPinned;
    this.cornerBall.classList.toggle('pinned', this.ballPinned);

    if (this.ballPinned && this.ballSnapBackTimer) {
      clearTimeout(this.ballSnapBackTimer);
      this.ballSnapBackTimer = null;
    }
  }

  showBallMenu(e) {
    // Show format menu near the ball
    const rect = this.cornerBall.getBoundingClientRect();
    this.showContextualButton(rect.left, rect.top, this.selectedText || '');
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
          this.selectedHtml = this.captureSelectionHtml(selection);
          this.onTextSelected(text, selection);
        } else {
          this.onSelectionCleared();
        }
      }, 200);
    });

    // Mouse up for immediate feedback
    document.addEventListener('mouseup', (e) => {
      // Skip if clicking on our UI elements
      if (e.target.closest('.flashdoc-floating') || 
          e.target.closest('.flashdoc-contextual')) {
        return;
      }
      
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length > this.settings.selectionThreshold) {
          this.selectedText = text;
          this.selectedHtml = this.captureSelectionHtml(selection);
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
          this.selectedHtml = this.captureSelectionHtml(selection);
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

  // Capture HTML content from selection for formatting preservation
  captureSelectionHtml(selection) {
    try {
      if (!selection || selection.rangeCount === 0) {
        return '';
      }
      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    } catch (error) {
      console.warn('Could not capture HTML selection:', error);
      return '';
    }
  }

  onSelectionCleared() {
    this.selectedText = '';
    this.selectedHtml = '';
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
    highlight.className = 'flashdoc-highlight';
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
    document.querySelectorAll('.flashdoc-highlight').forEach(el => el.remove());
  }

  // Contextual Save Button
  showContextualButton(x, y, text) {
    this.hideContextualButton();

    // Check if floating button is disabled
    if (!this.settings.showFloatingButton) return;
    if (!this.settings.enableContextMenu) return;

    const detectedType = this.detectContentType(text);

    const button = document.createElement('div');
    button.className = 'flashdoc-contextual';
    button.innerHTML = `
      <div class="flashdoc-ctx-main">
        <span class="flashdoc-ctx-icon">⚡</span>
        <span class="flashdoc-ctx-text">Save</span>
        <span class="flashdoc-ctx-type">${detectedType.toUpperCase()}</span>
      </div>
      <div class="flashdoc-ctx-options">
        <button data-format="txt" title="Text">📄</button>
        <button data-format="md" title="Markdown">📝</button>
        <button data-format="docx" title="Word">📜</button>
        <button data-format="pdf" title="PDF">📕</button>
        <button data-format="saveas" title="Save As">📁</button>
      </div>
    `;

    // Smart positioning with 40px offset (F1: repositioned further right-up)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonWidth = 140;
    const buttonHeight = 40;
    const offsetX = 40; // F1: New offset - further right
    const offsetY = 40; // F1: New offset - further up

    let posX = x + offsetX;
    let posY = y - buttonHeight - offsetY;

    // Viewport clamping with flip logic
    if (posX + buttonWidth > viewportWidth - 10) {
      // Flip to left side of cursor
      posX = Math.max(10, x - buttonWidth - 10);
    }
    if (posY < 10) {
      // Flip to below cursor
      posY = y + 20;
    }
    // Final clamp to viewport
    posX = Math.max(10, Math.min(posX, viewportWidth - buttonWidth - 10));
    posY = Math.max(10, Math.min(posY, viewportHeight - buttonHeight - 10));
    
    button.style.left = `${posX}px`;
    button.style.top = `${posY}px`;
    
    // Event handlers
    button.querySelector('.flashdoc-ctx-main').addEventListener('click', (e) => {
      e.stopPropagation();
      this.quickSave();
      this.hideContextualButton();
    });
    
    button.querySelectorAll('.flashdoc-ctx-options button').forEach(btn => {
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
    document.querySelectorAll('.flashdoc-contextual').forEach(el => {
      el.style.animation = 'flashdoc-fade-out 0.2s ease-out';
      setTimeout(() => el.remove(), 200);
    });
  }

  // Build HTML for category shortcuts
  buildShortcutsHtml() {
    const shortcuts = this.settings.categoryShortcuts || [];
    if (shortcuts.length === 0) return '';

    const formatEmojis = {
      txt: '📄', md: '📝', docx: '📜', pdf: '📕', json: '🧩',
      js: '🟡', ts: '🔵', py: '🐍', html: '🌐', css: '🎨',
      yaml: '🧾', sql: '📑', sh: '⚙️'
    };

    return shortcuts.map(s => {
      const emoji = formatEmojis[s.format] || '📄';
      const label = `${s.name}_save.${s.format}`;
      return `
        <button data-shortcut="${s.id}" data-shortcut-name="${s.name}" data-shortcut-format="${s.format}"
                class="flashdoc-fab-option flashdoc-shortcut" title="${label}">
          <span>${emoji}</span>
          <label>${s.name}</label>
        </button>
      `;
    }).join('');
  }

  // Floating Action Button
  createFloatingButton() {
    // Prevent duplicates from re-injection
    const existing = document.querySelector('.flashdoc-floating');
    if (existing) {
      existing.remove();
    }
    if (this.floatingButton) return;

    // Build shortcuts HTML
    const shortcutsHtml = this.buildShortcutsHtml();

    // Only show divider if there are shortcuts
    const dividerHtml = shortcutsHtml ? '<div class="flashdoc-fab-divider"></div>' : '';

    const button = document.createElement('div');
    button.className = 'flashdoc-floating';
    button.innerHTML = `
      <div class="flashdoc-fab">
        <div class="flashdoc-fab-icon">
          <span class="flashdoc-fab-bolt">⚡</span>
          <span class="flashdoc-fab-save" style="display:none">💾</span>
        </div>
        <div class="flashdoc-fab-menu">
          ${shortcutsHtml}
          ${dividerHtml}
          <button data-format="smart" class="flashdoc-fab-option" title="Smart Save">
            <span>🎯</span>
            <label>Auto</label>
          </button>
          <button data-format="txt" class="flashdoc-fab-option" title="Text">
            <span>📄</span>
            <label>TXT</label>
          </button>
          <button data-format="md" class="flashdoc-fab-option" title="Markdown">
            <span>📝</span>
            <label>MD</label>
          </button>
          <button data-format="docx" class="flashdoc-fab-option" title="Word Document">
            <span>📜</span>
            <label>DOCX</label>
          </button>
          <button data-format="pdf" class="flashdoc-fab-option" title="PDF">
            <span>📕</span>
            <label>PDF</label>
          </button>
          <button data-format="saveas" class="flashdoc-fab-option" title="Save As">
            <span>📁</span>
            <label>Save As</label>
          </button>
        </div>
      </div>
      <div class="flashdoc-fab-counter" title="Total files saved">0</div>
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
    const fabIcon = button.querySelector('.flashdoc-fab-icon');
    const fabMenu = button.querySelector('.flashdoc-fab-menu');
    
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
      const option = e.target.closest('.flashdoc-fab-option');
      if (option) {
        // Check if it's a shortcut
        if (option.dataset.shortcut) {
          const shortcutName = option.dataset.shortcutName;
          const shortcutFormat = option.dataset.shortcutFormat;
          this.saveWithShortcut(shortcutName, shortcutFormat);
        } else {
          const format = option.dataset.format;
          this.saveWithFormat(format);
        }
        fabMenu.classList.remove('show');
      }
    });
    
    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.flashdoc-floating')) {
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

    const boltIcon = this.floatingButton.querySelector('.flashdoc-fab-bolt');
    const saveIcon = this.floatingButton.querySelector('.flashdoc-fab-save');
    const fabIcon = this.floatingButton.querySelector('.flashdoc-fab-icon');

    if (hasSelection) {
      boltIcon.style.display = 'none';
      saveIcon.style.display = 'block';
      fabIcon.classList.add('active');
      fabIcon.title = `Save ${text.length} characters`;
    } else {
      boltIcon.style.display = 'block';
      saveIcon.style.display = 'none';
      fabIcon.classList.remove('active');
      fabIcon.title = 'FlashDoc - Click for options';
    }
  }

  // Rebuild floating button when settings change (e.g., shortcuts updated)
  rebuildFloatingButton() {
    // Remove existing button
    if (this.floatingButton) {
      this.floatingButton.remove();
      this.floatingButton = null;
    }
    // Create fresh button with updated shortcuts
    if (this.settings.showFloatingButton) {
      this.createFloatingButton();
    }
  }

  async updateButtonStats() {
    if (!this.floatingButton || !this.isRuntimeAvailable()) return;

    const counter = this.floatingButton.querySelector('.flashdoc-fab-counter');
    if (!counter) return;

    try {
      const response = await this.safeSendMessage({ action: 'getStats' }, { retries: 1, delay: 150 });

      if (response && response.stats) {
        const count = response.stats.totalFiles || 0;
        counter.textContent = count;
        counter.title = `${count} files saved${response.stats.lastFile ? '\nLast: ' + response.stats.lastFile : ''}`;
        this.stats.totalSaves = count;
      }
    } catch (error) {
      if (!this.isIgnorableRuntimeError(error)) {
        console.warn('Stats refresh failed:', error.message || String(error));
      }
    }
  }

  isRuntimeAvailable() {
    if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      if (!this.runtimeUnavailable) {
        console.warn('FlashDoc runtime unavailable: background messaging disabled');
        this.runtimeUnavailable = true;
      }
      return false;
    }

    this.runtimeUnavailable = false;
    return !!chrome.runtime.id;
  }

  safeSendMessage(payload, options = {}) {
    const { retries = 3, delay = 300 } = options; // More retries and longer delay for service worker wake-up

    const attemptSend = (remaining) => {
      return new Promise((resolve, reject) => {
        if (!this.isRuntimeAvailable()) {
          reject(new Error('Extension runtime unavailable'));
          return;
        }

        const retryOrReject = (rawError) => {
          const message = rawError && rawError.message ? rawError.message : String(rawError || 'Unknown error');
          if (remaining > 0 && this.isTransientRuntimeErrorMessage(message)) {
            setTimeout(() => {
              attemptSend(remaining - 1).then(resolve).catch(reject);
            }, delay);
            return;
          }
          reject(new Error(message));
        };

        try {
          chrome.runtime.sendMessage(payload, (response) => {
            const lastError = chrome.runtime?.lastError;
            if (lastError) {
              retryOrReject(lastError);
              return;
            }
            resolve(response);
          });
        } catch (error) {
          retryOrReject(error);
        }
      });
    };

    return attemptSend(retries);
  }

  isIgnorableRuntimeError(error) {
    if (!error) return false;
    const message = error.message || String(error);
    return this.isTransientRuntimeErrorMessage(message) ||
      message.includes('Extension runtime unavailable');
  }

  isTransientRuntimeErrorMessage(message) {
    if (!message) return false;
    return message.includes('Could not establish connection') ||
      message.includes('Receiving end does not exist') ||
      message.includes('The message port closed before a response was received') ||
      message.includes('Extension context invalidated');
  }

  // Content Type Detection
  detectContentType(text) {
    // Avoid ReferenceError when DetectionUtils isn't injected (e.g., CSP-blocked iframes)
    const detectionUtils =
      (typeof DetectionUtils !== 'undefined' ? DetectionUtils : null) ||
      globalThis.DetectionUtils ||
      null;

    if (detectionUtils && typeof detectionUtils.detectContentType === 'function') {
      return detectionUtils.detectContentType(text);
    }

    if (!text) return 'txt';

    // Fallback: prefer simple markdown vs text handling
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
      const response = await this.safeSendMessage({
        action: 'saveContent',
        content: this.selectedText,
        html: this.selectedHtml, // Include HTML for formatting
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
      const ignorable = this.isIgnorableRuntimeError(error);
      const message = ignorable ? '⚠️ Extension unavailable' : '❌ Save failed';
      this.showToast(message, ignorable ? 'warning' : 'error');
    }
  }

  async saveWithFormat(format) {
    const requiresSelection = format !== 'smart' && format !== 'saveas';
    if (!this.selectedText && requiresSelection) {
      this.showToast('⚠️ No text selected', 'warning');
      return;
    }

    const content = this.selectedText || document.title + '\n' + window.location.href;
    const html = this.selectedHtml || '';

    try {
      const response = await this.safeSendMessage({
        action: 'saveContent',
        content: content,
        html: html, // Include HTML for formatting
        type: format === 'smart' ? 'auto' : format
      });

      if (response && response.success) {
        const formatLabel = format === 'smart'
          ? 'Auto'
          : format === 'saveas'
            ? 'Save As'
            : format.toUpperCase();
        const toastMessage = format === 'saveas'
          ? '📁 Choose where to save your file'
          : `✅ Saved as ${formatLabel}`;
        this.showToast(toastMessage, 'success');
        this.updateButtonStats();
        this.addSaveAnimation();
      }
    } catch (error) {
      console.error('Save error:', error);
      const ignorable = this.isIgnorableRuntimeError(error);
      const message = ignorable ? '⚠️ Extension unavailable' : '❌ Save failed';
      this.showToast(message, ignorable ? 'warning' : 'error');
    }
  }

  // Save with category shortcut (prefix + format)
  async saveWithShortcut(categoryName, format) {
    if (!this.selectedText) {
      this.showToast('⚠️ No text selected', 'warning');
      return;
    }

    try {
      const response = await this.safeSendMessage({
        action: 'saveContent',
        content: this.selectedText,
        html: this.selectedHtml, // Include HTML for formatting
        type: format,
        prefix: categoryName // Pass the category name as prefix
      });

      if (response && response.success) {
        this.showToast(`✅ Saved as ${categoryName}_save.${format}`, 'success');
        this.updateButtonStats();
        this.addSaveAnimation();
        this.selectedText = '';
        this.updateFloatingButton(false);
      }
    } catch (error) {
      console.error('Save error:', error);
      const ignorable = this.isIgnorableRuntimeError(error);
      const message = ignorable ? '⚠️ Extension unavailable' : '❌ Save failed';
      this.showToast(message, ignorable ? 'warning' : 'error');
    }
  }

  async savePageSource() {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      html: document.documentElement.outerHTML
    };
    
    try {
      const response = await this.safeSendMessage({
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
      const ignorable = this.isIgnorableRuntimeError(error);
      const message = ignorable ? '⚠️ Extension unavailable' : '❌ Failed to save page';
      this.showToast(message, ignorable ? 'warning' : 'error');
    }
  }

  // Visual Feedback
  showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.flashdoc-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `flashdoc-toast flashdoc-toast-${type}`;
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
    
    const icon = this.floatingButton.querySelector('.flashdoc-fab-icon');
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
    if (!chrome.runtime?.onMessage) {
      console.warn('Messaging listener unavailable: runtime missing');
      return;
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getSelection') {
        sendResponse({ text: window.getSelection().toString() });
      } else if (request.action === 'updateSettings') {
        this.loadSettings().then(() => {
          // Rebuild floating button to include new shortcuts
          this.rebuildFloatingButton();
          // Update corner ball
          if (this.settings.showCornerBall && !this.cornerBall) {
            this.createCornerBall();
          } else if (!this.settings.showCornerBall && this.cornerBall) {
            this.cornerBall.remove();
            this.cornerBall = null;
          }
        });
      }
      return true;
    });
  }

  // Style Injection
  injectStyles() {
    // Prevent duplicate styles from re-injection
    const existing = document.getElementById('flashdoc-styles');
    if (existing) {
      existing.remove();
    }
    const style = document.createElement('style');
    style.id = 'flashdoc-styles';
    style.textContent = `
      /* Animations */
      @keyframes flashdoc-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes flashdoc-slide-in {
        from { 
          opacity: 0;
          transform: translateY(10px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes flashdoc-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes flashdoc-success-bounce {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.2) rotate(5deg); }
        75% { transform: scale(1.1) rotate(-5deg); }
      }
      
      /* Highlight */
      .flashdoc-highlight {
        background: linear-gradient(135deg, 
          rgba(102, 126, 234, 0.1), 
          rgba(118, 75, 162, 0.1));
        border: 2px solid rgba(102, 126, 234, 0.3);
        border-radius: 4px;
        animation: flashdoc-pulse 2s ease-in-out infinite;
      }
      
      /* Contextual Button */
      .flashdoc-contextual {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: flashdoc-slide-in 0.2s ease-out;
      }
      
      .flashdoc-ctx-main {
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
      
      .flashdoc-ctx-main:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
      
      .flashdoc-ctx-icon {
        font-size: 18px;
      }
      
      .flashdoc-ctx-type {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 0.5px;
      }
      
      .flashdoc-ctx-options {
        display: flex;
        gap: 4px;
        margin-top: 4px;
        padding: 0 8px;
      }
      
      .flashdoc-ctx-options button {
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
      
      .flashdoc-ctx-options button:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      }
      
      /* Floating Button */
      .flashdoc-floating {
        position: fixed;
        z-index: 999996;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .flashdoc-fab-icon {
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
      
      .flashdoc-fab-icon:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
      
      .flashdoc-fab-icon.active {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        animation: flashdoc-pulse 2s infinite;
      }
      
      .flashdoc-fab-icon.success {
        animation: flashdoc-success-bounce 0.6s ease-out;
      }
      
      .flashdoc-fab-menu {
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
      
      .flashdoc-fab-menu.show {
        opacity: 1;
        pointer-events: auto;
        transform: scale(1) translateY(0);
      }
      
      .flashdoc-fab-option {
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
      
      .flashdoc-fab-option:hover {
        transform: translateX(-4px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .flashdoc-fab-option span {
        font-size: 18px;
      }
      
      .flashdoc-fab-option label {
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .flashdoc-fab-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent);
        margin: 8px 0;
      }

      .flashdoc-shortcut {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
        border: 1px solid rgba(102, 126, 234, 0.3);
      }

      .flashdoc-shortcut:hover {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: transparent;
      }
      
      .flashdoc-fab-counter {
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
      .flashdoc-toast {
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
      
      .flashdoc-toast.show {
        transform: translateX(0);
      }
      
      .flashdoc-toast-success {
        background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
      }
      
      .flashdoc-toast-error {
        background: linear-gradient(135deg, #e53935 0%, #e35d5b 100%);
      }
      
      .flashdoc-toast-warning {
        background: linear-gradient(135deg, #f57c00 0%, #ffb74d 100%);
      }

      /* F3: Corner Ball Styles */
      .flashdoc-corner-ball {
        position: fixed;
        z-index: 999995;
        width: 48px;
        height: 48px;
        cursor: grab;
        user-select: none;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .flashdoc-corner-ball.dragging {
        cursor: grabbing;
        transform: scale(1.1);
        z-index: 999999;
      }

      .flashdoc-corner-ball.snapping {
        transition: all 0.3s ease-out;
      }

      .flashdoc-ball-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        transition: all 0.2s;
      }

      .flashdoc-corner-ball:hover .flashdoc-ball-icon {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
      }

      .flashdoc-ball-pin {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 24px;
        height: 24px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.2s;
      }

      .flashdoc-corner-ball:hover .flashdoc-ball-pin {
        opacity: 1;
        transform: scale(1);
      }

      .flashdoc-corner-ball.pinned .flashdoc-ball-pin {
        opacity: 1;
        transform: scale(1);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      .flashdoc-corner-ball.pinned .flashdoc-ball-icon {
        box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.4), 0 4px 12px rgba(102, 126, 234, 0.4);
      }
    `;

    document.head.appendChild(style);
  }
}

// Expose constructor for automated tests
if (typeof globalThis !== 'undefined') {
  globalThis.FlashDocContent = FlashDocContent;
}

// Initialize FlashDoc when DOM APIs are available
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  const flashDocContent = new FlashDocContent();

  // Page visibility listener for stats refresh
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      flashDocContent.updateButtonStats();
    }
  });

  // Log initialization
  console.log('⚡ FlashDoc content script loaded - Zero-friction file creation ready');
}

const CONTEXT_MENU_OPTIONS = [
  { id: 'auto', label: 'Smart auto-detect', description: 'Let FlashDoc choose the best format', emoji: '🎯' },
  { id: 'txt', label: 'Plain text (.txt)', description: 'Simple notes and prose', emoji: '📄' },
  { id: 'md', label: 'Markdown (.md)', description: 'Lightweight formatted docs', emoji: '📝' },
  { id: 'docx', label: 'Word (.docx)', description: 'Microsoft Word documents', emoji: '📜' },
  { id: 'json', label: 'JSON (.json)', description: 'APIs and structured data', emoji: '🧩' },
  { id: 'js', label: 'JavaScript (.js)', description: 'Browser and Node snippets', emoji: '🟡' },
  { id: 'ts', label: 'TypeScript (.ts)', description: 'Typed code blocks', emoji: '🔵' },
  { id: 'py', label: 'Python (.py)', description: 'Scripts & notebooks', emoji: '🐍' },
  { id: 'html', label: 'HTML (.html)', description: 'Templates and snippets', emoji: '🌐' },
  { id: 'css', label: 'CSS (.css)', description: 'Stylesheets', emoji: '🎨' },
  { id: 'xml', label: 'XML (.xml)', description: 'Configs and feeds', emoji: '📰' },
  { id: 'sql', label: 'SQL (.sql)', description: 'Database queries', emoji: '📑' },
  { id: 'sh', label: 'Shell (.sh)', description: 'Bash & shell scripts', emoji: '⚙️' },
  { id: 'yaml', label: 'YAML (.yaml)', description: 'Configs & workflows', emoji: '🧾' },
  { id: 'csv', label: 'CSV (.csv)', description: 'Spreadsheets and tables', emoji: '📊' },
  { id: 'pdf', label: 'PDF (.pdf)', description: 'Portable documents', emoji: '📕' },
  { id: 'label', label: 'Label (89×28mm PDF)', description: 'Ready-to-print labels', emoji: '🏷️' },
  { id: 'saveas', label: 'Save As…', description: 'Pick folder & filename each time', emoji: '📁' }
];


const DEFAULT_SETTINGS = {
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
  contextMenuFormats: CONTEXT_MENU_OPTIONS.map(option => option.id),
  // Category Shortcuts: prefix + format combo
  categoryShortcuts: [] // Array of {id, name, format} objects, max 5
};

const MAX_SHORTCUTS = 5;

const manifest = chrome.runtime.getManifest();

document.addEventListener('DOMContentLoaded', () => {
  renderVersion();
  setupForm();
  loadSettings();
  loadRecommendations();
  // Category Shortcuts management
  setupShortcutUI();
  loadShortcuts();
});

function renderVersion() {
  const versionEl = document.getElementById('extension-version');
  if (versionEl) {
    versionEl.textContent = `v${manifest.version}`;
  }
}

function setupForm() {
  const form = document.getElementById('options-form');
  const namingPattern = document.getElementById('namingPattern');
  const customPatternRow = document.getElementById('custom-pattern-row');
  const selectionSlider = document.getElementById('selectionThreshold');
  const selectionValue = document.getElementById('selectionThresholdValue');
  const showFloatingButton = document.getElementById('showFloatingButton');
  const buttonPositionRow = document.getElementById('button-position-row');
  const resetButton = document.getElementById('reset-defaults');

  renderContextMenuFormatOptions(DEFAULT_SETTINGS.contextMenuFormats);

  if (namingPattern && customPatternRow) {
    namingPattern.addEventListener('change', () => {
      const isCustom = namingPattern.value === 'custom';
      customPatternRow.classList.toggle('hidden', !isCustom);
    });
  }

  if (selectionSlider && selectionValue) {
    const updateSliderValue = () => {
      selectionValue.textContent = selectionSlider.value;
    };
    selectionSlider.addEventListener('input', updateSliderValue);
    selectionSlider.addEventListener('change', updateSliderValue);
  }

  if (showFloatingButton && buttonPositionRow) {
    const togglePositionVisibility = () => {
      buttonPositionRow.classList.toggle('hidden', !showFloatingButton.checked);
    };
    showFloatingButton.addEventListener('change', togglePositionVisibility);
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      applySettings(DEFAULT_SETTINGS);
      saveSettings(DEFAULT_SETTINGS, { showStatus: true });
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const settings = await readFormSettings(form);
      saveSettings(settings, { showStatus: true });
    });
  }
}

async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(null);
    const settings = { ...DEFAULT_SETTINGS, ...stored };
    applySettings(settings);
  } catch (error) {
    console.error('Failed to load settings', error);
    showStatusMessage('Unable to load saved settings.', 'error');
  }
}

async function readFormSettings(form) {
  const data = new FormData(form);
  // Preserve existing shortcuts - they're managed separately
  const stored = await chrome.storage.sync.get(['categoryShortcuts']);
  const settings = { ...DEFAULT_SETTINGS, categoryShortcuts: stored.categoryShortcuts || [] };

  settings.folderPath = (data.get('folderPath') || DEFAULT_SETTINGS.folderPath).trim() || DEFAULT_SETTINGS.folderPath;
  settings.namingPattern = data.get('namingPattern') || DEFAULT_SETTINGS.namingPattern;
  settings.customPattern = (data.get('customPattern') || DEFAULT_SETTINGS.customPattern).trim() || DEFAULT_SETTINGS.customPattern;
  settings.organizeByType = form.organizeByType.checked;
  settings.showNotifications = form.showNotifications.checked;
  settings.playSound = form.playSound.checked;
  settings.autoDetectType = form.autoDetectType.checked;
  settings.enableContextMenu = form.enableContextMenu.checked;
  settings.showFloatingButton = form.showFloatingButton.checked;
  settings.showCornerBall = form.showCornerBall?.checked ?? DEFAULT_SETTINGS.showCornerBall;
  settings.buttonPosition = form.buttonPosition.value || DEFAULT_SETTINGS.buttonPosition;
  settings.autoHideButton = form.autoHideButton.checked;
  settings.selectionThreshold = Number(form.selectionThreshold.value || DEFAULT_SETTINGS.selectionThreshold);
  settings.enableSmartDetection = form.enableSmartDetection.checked;
  settings.trackFormatUsage = form.trackFormatUsage?.checked ?? DEFAULT_SETTINGS.trackFormatUsage;
  settings.trackDetectionAccuracy = form.trackDetectionAccuracy?.checked ?? DEFAULT_SETTINGS.trackDetectionAccuracy;
  settings.showFormatRecommendations = form.showFormatRecommendations?.checked ?? DEFAULT_SETTINGS.showFormatRecommendations;
  const selectedFormats = getSelectedContextMenuFormats(form);
  settings.contextMenuFormats = selectedFormats.length ? selectedFormats : DEFAULT_SETTINGS.contextMenuFormats;

  return settings;
}

function applySettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  const form = document.getElementById('options-form');
  if (!form) {
    return;
  }

  form.folderPath.value = merged.folderPath;
  form.namingPattern.value = merged.namingPattern;
  form.customPattern.value = merged.customPattern;
  form.organizeByType.checked = merged.organizeByType;
  form.showNotifications.checked = merged.showNotifications;
  form.playSound.checked = merged.playSound;
  form.autoDetectType.checked = merged.autoDetectType;
  form.enableContextMenu.checked = merged.enableContextMenu;
  form.showFloatingButton.checked = merged.showFloatingButton;
  if (form.showCornerBall) form.showCornerBall.checked = merged.showCornerBall;
  form.buttonPosition.value = merged.buttonPosition;
  form.autoHideButton.checked = merged.autoHideButton;
  form.selectionThreshold.value = merged.selectionThreshold;
  form.enableSmartDetection.checked = merged.enableSmartDetection;
  if (form.trackFormatUsage) form.trackFormatUsage.checked = merged.trackFormatUsage;
  if (form.trackDetectionAccuracy) form.trackDetectionAccuracy.checked = merged.trackDetectionAccuracy;
  if (form.showFormatRecommendations) form.showFormatRecommendations.checked = merged.showFormatRecommendations;
  setContextMenuFormatSelections(merged.contextMenuFormats);

  const customPatternRow = document.getElementById('custom-pattern-row');
  if (customPatternRow) {
    customPatternRow.classList.toggle('hidden', merged.namingPattern !== 'custom');
  }

  const selectionValue = document.getElementById('selectionThresholdValue');
  if (selectionValue) {
    selectionValue.textContent = String(merged.selectionThreshold);
  }

  const buttonPositionRow = document.getElementById('button-position-row');
  if (buttonPositionRow) {
    buttonPositionRow.classList.toggle('hidden', !merged.showFloatingButton);
  }
}

async function saveSettings(settings, { showStatus } = {}) {
  try {
    await chrome.storage.sync.set(settings);
    await refreshBackgroundSettings();
    if (showStatus) {
      showStatusMessage('Preferences saved.', 'success');
    }
  } catch (error) {
    console.error('Failed to save settings', error);
    showStatusMessage('Could not save preferences. Try again.', 'error');
  }
}

async function refreshBackgroundSettings() {
  try {
    await chrome.runtime.sendMessage({ action: 'refreshSettings' });
  } catch (error) {
    // Service worker might be sleeping; ignore the error as settings are persisted.
    if (error && error.message) {
      console.warn('Refresh message failed:', error.message);
    }
  }
}

function showStatusMessage(message, intent = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.classList.remove('success', 'error');

  if (intent === 'success') {
    statusEl.classList.add('success');
  } else if (intent === 'error') {
    statusEl.classList.add('error');
  }

  if (intent === 'success') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.classList.remove('success', 'error');
    }, 2500);
  }
}

async function loadRecommendations() {
  try {
    const stats = await chrome.storage.local.get(['stats', 'formatUsage', 'detectionAccuracy']);
    const recommendations = generateRecommendations(stats);
    displayRecommendations(recommendations);
  } catch (error) {
    console.error('Failed to load recommendations:', error);
  }
}

function generateRecommendations(stats) {
  const recommendations = [];

  // Get format usage data
  const formatUsage = stats.formatUsage || {};
  const totalFiles = stats.stats?.totalFiles || 0;

  // Recommendation 1: Most used format
  const formats = Object.entries(formatUsage);
  if (formats.length > 0) {
    const mostUsed = formats.sort((a, b) => b[1] - a[1])[0];
    recommendations.push({
      icon: '📊',
      title: `Most Used Format: ${mostUsed[0].toUpperCase()}`,
      description: `You've saved ${mostUsed[1]} files in this format (${Math.round((mostUsed[1] / totalFiles) * 100)}% of total)`
    });
  } else {
    recommendations.push({
      icon: '🎯',
      title: 'Smart Auto-Detection Enabled',
      description: 'FlashDoc will automatically detect the best format for your content'
    });
  }

  // Recommendation 2: Detection accuracy
  const accuracy = stats.detectionAccuracy || {};
  const totalDetections = accuracy.total || 0;
  const correctDetections = accuracy.correct || 0;
  const accuracyRate = totalDetections > 0 ? Math.round((correctDetections / totalDetections) * 100) : 0;

  if (totalDetections > 5) {
    recommendations.push({
      icon: accuracyRate > 80 ? '✅' : '⚠️',
      title: `Detection Accuracy: ${accuracyRate}%`,
      description: `${correctDetections} out of ${totalDetections} auto-detections were accurate`
    });
  } else {
    recommendations.push({
      icon: '💡',
      title: 'New Format Detection Features',
      description: 'Now supports TypeScript, XML, SQL, Shell scripts, and more!'
    });
  }

  // Recommendation 3: Suggested formats based on usage
  const supportedFormats = ['ts', 'tsx', 'xml', 'sql', 'sh', 'bash', 'css'];
  const unusedFormats = supportedFormats.filter(fmt => !formatUsage[fmt]);

  if (unusedFormats.length > 0 && totalFiles > 10) {
    const formatList = unusedFormats.slice(0, 3).map(f => f.toUpperCase()).join(', ');
    recommendations.push({
      icon: '🆕',
      title: 'Try New Formats',
      description: `Explore these newly available formats: ${formatList}`
    });
  } else {
    recommendations.push({
      icon: '⚡',
      title: `${totalFiles} Files Saved`,
      description: 'Keep saving with FlashDoc for better recommendations!'
    });
  }

  return recommendations;
}

function displayRecommendations(recommendations) {
  const listEl = document.getElementById('recommendations-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  recommendations.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'recommendation-item';
    item.innerHTML = `
      <span class="rec-icon">${rec.icon}</span>
      <div class="rec-content">
        <strong>${rec.title}</strong>
        <p>${rec.description}</p>
      </div>
    `;
    listEl.appendChild(item);
  });
}

function renderContextMenuFormatOptions(selectedFormats = []) {
  const container = document.getElementById('context-menu-formats');
  if (!container) return;

  container.innerHTML = '';
  CONTEXT_MENU_OPTIONS.forEach(option => {
    const label = document.createElement('label');
    label.className = 'format-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'contextMenuFormats';
    input.value = option.id;
    input.checked = selectedFormats.includes(option.id);

    const icon = document.createElement('div');
    icon.className = 'format-icon';
    icon.textContent = option.emoji;

    const copy = document.createElement('div');
    copy.className = 'format-copy';
    const title = document.createElement('strong');
    title.textContent = option.label;
    const description = document.createElement('span');
    description.textContent = option.description;
    copy.appendChild(title);
    copy.appendChild(description);

    label.appendChild(input);
    label.appendChild(icon);
    label.appendChild(copy);
    container.appendChild(label);
  });
}

function setContextMenuFormatSelections(selectedFormats = []) {
  const checkboxes = document.querySelectorAll('input[name="contextMenuFormats"]');
  checkboxes.forEach(box => {
    box.checked = selectedFormats.includes(box.value);
  });
}

function getSelectedContextMenuFormats(form) {
  return Array.from(form.querySelectorAll('input[name="contextMenuFormats"]'))
    .filter(input => input.checked)
    .map(input => input.value);
}

// Prefix Shortcuts Management Functions

function renderShortcutList(shortcuts = []) {
  const container = document.getElementById('shortcut-list');
  if (!container) return;

  container.innerHTML = '';

  if (shortcuts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚡</span>
        <p>Noch keine Shortcuts erstellt</p>
      </div>
    `;
    updateShortcutCount(0);
    return;
  }

  const formatEmojis = {
    txt: '📄', md: '📝', docx: '📜', pdf: '📕', json: '🧩',
    js: '🟡', ts: '🔵', py: '🐍', html: '🌐', css: '🎨',
    yaml: '🧾', sql: '📑', sh: '⚙️'
  };

  shortcuts.forEach((shortcut) => {
    const item = document.createElement('div');
    item.className = 'shortcut-item';
    const emoji = formatEmojis[shortcut.format] || '📄';

    item.innerHTML = `
      <span class="shortcut-emoji">${emoji}</span>
      <span class="shortcut-label">${shortcut.name}_save.${shortcut.format}</span>
      <button type="button" class="shortcut-delete" title="Löschen">✕</button>
    `;

    item.querySelector('.shortcut-delete').addEventListener('click', () => {
      deleteShortcut(shortcut.id);
    });

    container.appendChild(item);
  });

  updateShortcutCount(shortcuts.length);
}

function updateShortcutCount(count) {
  const countEl = document.getElementById('shortcut-count');
  if (countEl) {
    countEl.textContent = `${count}/${MAX_SHORTCUTS} Shortcuts`;
    countEl.classList.toggle('at-limit', count >= MAX_SHORTCUTS);
  }

  const addBtn = document.getElementById('add-shortcut');
  const nameInput = document.getElementById('new-shortcut-name');
  const formatSelect = document.getElementById('new-shortcut-format');

  if (addBtn) addBtn.disabled = count >= MAX_SHORTCUTS;
  if (nameInput) nameInput.disabled = count >= MAX_SHORTCUTS;
  if (formatSelect) formatSelect.disabled = count >= MAX_SHORTCUTS;
}

async function addShortcut() {
  const nameInput = document.getElementById('new-shortcut-name');
  const formatSelect = document.getElementById('new-shortcut-format');

  if (!nameInput || !formatSelect) return;

  const name = nameInput.value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const format = formatSelect.value;

  if (!name) {
    showStatusMessage('Bitte einen Prefix-Namen eingeben.', 'error');
    nameInput.focus();
    return;
  }

  const settings = await chrome.storage.sync.get(['categoryShortcuts']);
  const shortcuts = settings.categoryShortcuts || [];

  if (shortcuts.length >= MAX_SHORTCUTS) {
    showStatusMessage(`Maximum ${MAX_SHORTCUTS} Shortcuts erlaubt.`, 'error');
    return;
  }

  // Check for duplicates
  const isDuplicate = shortcuts.some(s =>
    s.name.toLowerCase() === name.toLowerCase() && s.format === format
  );

  if (isDuplicate) {
    showStatusMessage('Dieser Shortcut existiert bereits.', 'error');
    return;
  }

  const newShortcut = {
    id: `shortcut_${Date.now()}`,
    name: name,
    format: format
  };

  shortcuts.push(newShortcut);
  await chrome.storage.sync.set({ categoryShortcuts: shortcuts });

  // Clear input field
  nameInput.value = '';

  renderShortcutList(shortcuts);
  await refreshBackgroundSettings();
  notifyContentScripts();
  showStatusMessage(`✓ "${name}_save.${format}" hinzugefügt`, 'success');
}

async function deleteShortcut(shortcutId) {
  const settings = await chrome.storage.sync.get(['categoryShortcuts']);
  const shortcuts = (settings.categoryShortcuts || []).filter(s => s.id !== shortcutId);
  await chrome.storage.sync.set({ categoryShortcuts: shortcuts });
  renderShortcutList(shortcuts);
  await refreshBackgroundSettings();
  notifyContentScripts();
  showStatusMessage('Shortcut gelöscht.', 'success');
}

function setupShortcutUI() {
  const addBtn = document.getElementById('add-shortcut');
  const nameInput = document.getElementById('new-shortcut-name');

  if (addBtn) {
    addBtn.addEventListener('click', addShortcut);
  }

  // Allow Enter key to add shortcut
  if (nameInput) {
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addShortcut();
      }
    });
  }
}

async function loadShortcuts() {
  const settings = await chrome.storage.sync.get(['categoryShortcuts']);
  renderShortcutList(settings.categoryShortcuts || []);
}

// Notify all content scripts to update their floating button with new shortcuts
async function notifyContentScripts() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'updateSettings' });
        } catch (e) {
          // Tab might not have content script loaded (e.g., chrome:// pages)
        }
      }
    }
  } catch (error) {
    console.warn('Could not notify content scripts:', error);
  }
}

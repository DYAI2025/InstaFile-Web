// Make Doc - Background Service Worker (V3 COMPATIBLE + KEYBOARD SHORTCUT)
// Funktioniert mit Manifest V3 Service Workers

let settings = {
  saveFolder: '',
  nameFormat: '{first3}',
  useCounter: true,
  prefix: '',
  counter: 1
};

// Lade Settings beim Start
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ðŸš€ Make Doc Extension installed/updated');
  await loadSettings();
  createContextMenus();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('ðŸš€ Make Doc Extension started');
  await loadSettings();
});

// Settings laden
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['saveFolder', 'nameFormat', 'useCounter', 'prefix', 'counter']);
    settings = {
      saveFolder: result.saveFolder || '',
      nameFormat: result.nameFormat || '{first3}',
      useCounter: result.useCounter !== undefined ? result.useCounter : true,
      prefix: result.prefix || '',
      counter: result.counter || 1
    };
    console.log('âœ“ Settings loaded:', settings);
  } catch (error) {
    console.error('âŒ Error loading settings:', error);
  }
}

// Counter hochzÃ¤hlen und speichern
async function incrementCounter() {
  try {
    settings.counter++;
    await chrome.storage.sync.set({ counter: settings.counter });
    console.log('âœ“ Counter incremented to:', settings.counter);
  } catch (error) {
    console.error('âŒ Error incrementing counter:', error);
  }
}

// KontextmenÃ¼ erstellen
function createContextMenus() {
  console.log('Creating context menus...');
  
  // LÃ¶sche alte MenÃ¼s
  chrome.contextMenus.removeAll(() => {
    // Haupt-MenÃ¼
    chrome.contextMenus.create({
      id: 'make-doc-parent',
      title: 'Make Doc',
      contexts: ['selection']
    });

    // Unter-MenÃ¼s fÃ¼r Formate
    const formats = [
      { id: 'make-doc-txt', title: 'ðŸ“„ .txt', ext: 'txt' },
      { id: 'make-doc-md', title: 'ðŸ“ .md', ext: 'md' },
      { id: 'make-doc-py', title: 'ðŸ .py', ext: 'py' },
      { id: 'make-doc-yaml', title: 'âš™ï¸ .yaml', ext: 'yaml' },
      { id: 'make-doc-pdf', title: 'ðŸ“• .pdf', ext: 'pdf' }
    ];

    formats.forEach(format => {
      chrome.contextMenus.create({
        id: format.id,
        parentId: 'make-doc-parent',
        title: format.title,
        contexts: ['selection']
      });
    });
    
    console.log('âœ“ Context menus created');
  });
}

// Filename generieren
function generateFilename(text, extension) {
  let filename = '';

  // Prefix hinzufÃ¼gen
  if (settings.prefix) {
    filename += settings.prefix + '-';
  }

  // Counter hinzufÃ¼gen
  if (settings.useCounter) {
    filename += String(settings.counter).padStart(4, '0') + '-';
  }

  // Name Format anwenden
  if (settings.nameFormat === '{first3}') {
    // Erste 3 WÃ¶rter
    const words = text.trim().split(/\s+/).slice(0, 3);
    filename += words.join('-');
  } else if (settings.nameFormat === '{timestamp}') {
    // Timestamp
    const now = new Date();
    filename += now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  } else {
    // Fallback: erste 3 WÃ¶rter
    const words = text.trim().split(/\s+/).slice(0, 3);
    filename += words.join('-');
  }

  // Sonderzeichen entfernen
  filename = filename.replace(/[^a-zA-Z0-9-_Ã¤Ã¶Ã¼Ã„Ã–ÃœÃŸ]/g, '-');
  filename = filename.replace(/-+/g, '-');
  filename = filename.replace(/^-|-$/g, '');

  // Max 100 Zeichen
  if (filename.length > 100) {
    filename = filename.substring(0, 100);
  }

  // Fallback wenn leer
  if (!filename || filename === '') {
    filename = 'document';
  }

  return filename + '.' + extension;
}

// Text zu Base64 konvertieren (UTF-8 safe)
function textToBase64(text) {
  // UTF-8 encoding fÃ¼r Umlaute etc.
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Binary string erstellen
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  
  // Base64 encode
  return btoa(binary);
}

// Text als PDF erstellen (einfache Textversion)
function createSimplePDF(text) {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length ${text.length + 20}
>>
stream
BT
50 750 Td
(${text.replace(/[()\\]/g, '\\$&').substring(0, 1000)}) Tj
ET
endstream
endobj
xref
0 5
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${300 + text.length}
%%EOF`;
  
  return pdfContent;
}

// Datei erstellen (zentrale Funktion)
async function createFile(content, extension, mimeType) {
  await loadSettings();
  
  const filename = generateFilename(content, extension);
  console.log('ðŸ“„ Generated filename:', filename);

  try {
    // Service Worker kompatible LÃ¶sung mit Data URL
    const base64Content = textToBase64(content);
    const dataUrl = `data:${mimeType};base64,${base64Content}`;

    console.log('ðŸ“¦ Created data URL');

    // Download starten
    const downloadPath = settings.saveFolder ? `${settings.saveFolder}/${filename}` : filename;
    
    const downloadOptions = {
      url: dataUrl,
      filename: downloadPath,
      saveAs: false,
      conflictAction: 'uniquify'
    };

    console.log('â¬‡ï¸ Download options:', downloadOptions);

    const downloadId = await chrome.downloads.download(downloadOptions);
    
    console.log('âœ“ Download started, ID:', downloadId);
    
    // Counter erhÃ¶hen wenn verwendet
    if (settings.useCounter) {
      await incrementCounter();
    }

    // Success notification
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Make Doc',
        message: `âœ“ ${filename} erstellt!`
      });
    } catch (notifError) {
      console.log('Notification error (non-critical):', notifError);
    }
    
    return true;
  } catch (error) {
    console.error('âŒ Download Fehler:', error);
    
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Make Doc - Fehler',
        message: `Fehler: ${error.message}`
      });
    } catch (notifError) {
      console.log('Notification error:', notifError);
    }
    
    return false;
  }
}

// Keyboard Command Handler
chrome.commands.onCommand.addListener(async (command) => {
  console.log('âŒ¨ï¸ Keyboard command:', command);
  
  if (command === 'quick-save-txt') {
    try {
      // Aktuellen Tab holen
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.error('âŒ No active tab');
        return;
      }

      console.log('ðŸ“ Getting selection from tab:', tab.id);

      // Script injizieren um markierten Text zu holen
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      const selectedText = results[0].result;

      if (!selectedText || selectedText.trim() === '') {
        console.log('âš ï¸ No text selected');
        
        // Notification bei leerem Text
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Make Doc',
          message: 'âš ï¸ Kein Text markiert!'
        });
        
        return;
      }

      console.log('âœ“ Selected text:', selectedText.substring(0, 50) + '...');

      // .txt Datei erstellen
      await createFile(selectedText, 'txt', 'text/plain');
      
    } catch (error) {
      console.error('âŒ Keyboard shortcut error:', error);
      
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Make Doc - Fehler',
        message: `Fehler: ${error.message}`
      });
    }
  }
});

// KontextmenÃ¼ Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('ðŸ“ Context menu clicked:', info.menuItemId);
  console.log('Selected text:', info.selectionText);
  
  if (!info.selectionText) {
    console.error('âŒ No text selected');
    return;
  }

  // Format bestimmen
  let extension = '';
  let content = info.selectionText;
  let mimeType = 'text/plain';

  switch (info.menuItemId) {
    case 'make-doc-txt':
      extension = 'txt';
      mimeType = 'text/plain';
      break;
    case 'make-doc-md':
      extension = 'md';
      mimeType = 'text/markdown';
      break;
    case 'make-doc-py':
      extension = 'py';
      mimeType = 'text/x-python';
      content = '# -*- coding: utf-8 -*-\n\n' + content;
      break;
    case 'make-doc-yaml':
      extension = 'yaml';
      mimeType = 'text/yaml';
      break;
    case 'make-doc-pdf':
      extension = 'pdf';
      mimeType = 'application/pdf';
      content = createSimplePDF(content);
      break;
    default:
      console.error('âŒ Unknown menu item:', info.menuItemId);
      return;
  }

  // Datei erstellen
  await createFile(content, extension, mimeType);
});

// Settings Ã¤nderungen lauschen
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('âš™ï¸ Settings changed:', changes);
    loadSettings();
  }
});

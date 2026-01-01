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

// ============================================================================
// FORMATTING ENGINE v2 - Foundation Layer
// Fixes: Bug #1 (Bold/Italic), #3 (Order), #5 (Entities), #6 (Nested Lists)
// ============================================================================

/**
 * EntityDecoder - Decodes HTML entities to Unicode characters
 * FIX for Bug #5: Vollständiger Entity-Decoder
 * @example EntityDecoder.decode('&amp;&mdash;&#8364;') → '&—€'
 */
const EntityDecoder = (function() {
  // Named entity map - using Unicode escape sequences to avoid parsing issues
  const NAMED_ENTITIES = {
    // Core entities (XML)
    'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
    // Whitespace
    'nbsp': '\u00A0', 'ensp': '\u2002', 'emsp': '\u2003', 'thinsp': '\u2009',
    // Dashes and punctuation
    'mdash': '\u2014', 'ndash': '\u2013', 'minus': '\u2212',
    'hellip': '\u2026', 'bull': '\u2022', 'middot': '\u00B7',
    'lsquo': '\u2018', 'rsquo': '\u2019', 'ldquo': '\u201C', 'rdquo': '\u201D',
    'laquo': '\u00AB', 'raquo': '\u00BB', 'prime': '\u2032', 'Prime': '\u2033',
    // Currency
    'euro': '\u20AC', 'pound': '\u00A3', 'yen': '\u00A5', 'cent': '\u00A2', 'curren': '\u00A4',
    // Legal/IP
    'copy': '\u00A9', 'reg': '\u00AE', 'trade': '\u2122',
    // Math symbols
    'times': '\u00D7', 'divide': '\u00F7', 'plusmn': '\u00B1',
    'frac12': '\u00BD', 'frac14': '\u00BC', 'frac34': '\u00BE',
    'deg': '\u00B0', 'sup2': '\u00B2', 'sup3': '\u00B3',
    // Arrows
    'larr': '\u2190', 'rarr': '\u2192', 'uarr': '\u2191', 'darr': '\u2193',
    // Greek letters (common)
    'alpha': '\u03B1', 'beta': '\u03B2', 'gamma': '\u03B3', 'delta': '\u03B4',
    'pi': '\u03C0', 'sigma': '\u03C3', 'omega': '\u03C9',
    // Accented characters (common)
    'agrave': '\u00E0', 'aacute': '\u00E1', 'acirc': '\u00E2', 'atilde': '\u00E3', 'auml': '\u00E4',
    'egrave': '\u00E8', 'eacute': '\u00E9', 'ecirc': '\u00EA', 'euml': '\u00EB',
    'igrave': '\u00EC', 'iacute': '\u00ED', 'icirc': '\u00EE', 'iuml': '\u00EF',
    'ograve': '\u00F2', 'oacute': '\u00F3', 'ocirc': '\u00F4', 'otilde': '\u00F5', 'ouml': '\u00F6',
    'ugrave': '\u00F9', 'uacute': '\u00FA', 'ucirc': '\u00FB', 'uuml': '\u00FC',
    'Agrave': '\u00C0', 'Aacute': '\u00C1', 'Acirc': '\u00C2', 'Atilde': '\u00C3', 'Auml': '\u00C4',
    'Egrave': '\u00C8', 'Eacute': '\u00C9', 'Ecirc': '\u00CA', 'Euml': '\u00CB',
    'Igrave': '\u00CC', 'Iacute': '\u00CD', 'Icirc': '\u00CE', 'Iuml': '\u00CF',
    'Ograve': '\u00D2', 'Oacute': '\u00D3', 'Ocirc': '\u00D4', 'Otilde': '\u00D5', 'Ouml': '\u00D6',
    'Ugrave': '\u00D9', 'Uacute': '\u00DA', 'Ucirc': '\u00DB', 'Uuml': '\u00DC',
    'ntilde': '\u00F1', 'Ntilde': '\u00D1', 'ccedil': '\u00E7', 'Ccedil': '\u00C7',
    'szlig': '\u00DF'
  };

  /**
   * Decode all HTML entities in a string
   * @param {string} str - Input string with entities
   * @returns {string} - Decoded string
   */
  function decode(str) {
    if (!str || typeof str !== 'string') return str || '';
    
    return str
      // Named entities: &name;
      .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => {
        return NAMED_ENTITIES[name] || match;
      })
      // Decimal numeric: &#1234;
      .replace(/&#(\d+);/g, (match, code) => {
        const num = parseInt(code, 10);
        return num > 0 && num < 0x110000 ? String.fromCodePoint(num) : match;
      })
      // Hexadecimal numeric: &#x1A2B;
      .replace(/&#[xX]([0-9a-fA-F]+);/g, (match, hex) => {
        const num = parseInt(hex, 16);
        return num > 0 && num < 0x110000 ? String.fromCodePoint(num) : match;
      });
  }

  return { decode, NAMED_ENTITIES };
})();

/**
 * HtmlTokenizer - Converts HTML string into ordered token stream
 * FIX for Bug #3: Dokumentreihenfolge erhalten durch Single-Pass Tokenization
 * @example HtmlTokenizer.tokenize('<p><strong>bold</strong></p>')
 *          → [open:p, open:strong, text:"bold", close:strong, close:p]
 */
const HtmlTokenizer = (function() {
  // Self-closing tags that don't require close token
  const SELF_CLOSING = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);

  /**
   * Parse attribute string into object
   * @param {string} attrString - e.g. 'href="url" class="cls"'
   * @returns {Object} - {href: 'url', class: 'cls'}
   */
  function parseAttributes(attrString) {
    const attrs = {};
    if (!attrString) return attrs;
    
    // Match: name="value" or name='value' or name=value
    const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    
    while ((match = attrPattern.exec(attrString)) !== null) {
      const name = match[1].toLowerCase();
      const value = match[2] ?? match[3] ?? match[4] ?? '';
      attrs[name] = EntityDecoder.decode(value);
    }
    
    return attrs;
  }

  /**
   * Tokenize HTML string into ordered array of tokens
   * Preserves exact document order (critical for Bug #3 fix)
   * @param {string} html - HTML string to tokenize
   * @returns {Array<{type:string, tag?:string, content?:string, attrs?:Object}>}
   */
  function tokenize(html) {
    if (!html || typeof html !== 'string') return [];
    
    const tokens = [];
    // Pattern matches: <tag attrs>, </tag>, <tag/>, or <tag ... />
    const tagPattern = /<(\/?)(\w+)([^>]*?)(\/?)>/g;
    let lastIndex = 0;
    let match;

    while ((match = tagPattern.exec(html)) !== null) {
      // 1. Capture text BEFORE this tag (preserves order)
      if (match.index > lastIndex) {
        const textContent = html.slice(lastIndex, match.index);
        // Keep whitespace-only text if it contains actual content
        if (textContent.length > 0 && (textContent.trim() || /[\u00A0]/.test(textContent))) {
          tokens.push({
            type: 'text',
            content: EntityDecoder.decode(textContent)
          });
        }
      }

      const isClosing = match[1] === '/';
      const tagName = match[2].toLowerCase();
      const attrString = match[3].trim();
      const isSelfClosingSlash = match[4] === '/';

      if (isClosing) {
        // Close tag: </tag>
        tokens.push({ type: 'close', tag: tagName });
      } else {
        // Open tag: <tag attrs>
        const token = {
          type: 'open',
          tag: tagName,
          attrs: parseAttributes(attrString)
        };
        tokens.push(token);

        // Self-closing: <br/> or <br /> or naturally self-closing tags
        if (isSelfClosingSlash || SELF_CLOSING.has(tagName)) {
          // Don't push close for self-closing, they're handled implicitly
        }
      }

      lastIndex = match.index + match[0].length;
    }

    // 2. Capture remaining text after last tag
    if (lastIndex < html.length) {
      const remaining = html.slice(lastIndex);
      if (remaining.length > 0 && (remaining.trim() || /[\u00A0]/.test(remaining))) {
        tokens.push({
          type: 'text',
          content: EntityDecoder.decode(remaining)
        });
      }
    }

    return tokens;
  }

  return { tokenize, parseAttributes };
})();

/**
 * BlockBuilder - Converts token stream into structured document blocks
 * FIX for Bug #1: Bold/Italic via Format-Stack
 * FIX for Bug #6: Nested Lists via Level-Tracking
 * FIX for Bug #7: Context-basierte List-Counter
 */
const BlockBuilder = (function() {
  // Block-level tags that create new blocks
  const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'div', 'blockquote', 'pre', 'tr']);
  
  // Inline formatting tags → property name
  const INLINE_FORMAT_MAP = {
    'strong': 'bold', 'b': 'bold',
    'em': 'italic', 'i': 'italic',
    'u': 'underline',
    's': 'strikethrough', 'strike': 'strikethrough', 'del': 'strikethrough',
    'code': 'code', 'kbd': 'code', 'samp': 'code',
    'sub': 'subscript', 'sup': 'superscript'
  };

  // List container tags
  const LIST_CONTAINERS = new Set(['ul', 'ol']);

  /**
   * Parse CSS style attribute for formatting
   * @param {string} styleAttr - e.g. "font-weight: bold; font-style: italic"
   * @returns {Array<string>} - Array of format properties: ['bold', 'italic']
   */
  function parseStyleAttribute(styleAttr) {
    const formats = [];
    if (!styleAttr) return formats;
    
    const style = styleAttr.toLowerCase();
    
    // Bold detection: font-weight: bold/700/800/900
    if (/font-weight\s*:\s*(bold|[7-9]00)/.test(style)) {
      formats.push('bold');
    }
    
    // Italic detection: font-style: italic/oblique
    if (/font-style\s*:\s*(italic|oblique)/.test(style)) {
      formats.push('italic');
    }
    
    // Underline detection: text-decoration contains underline
    if (/text-decoration[^:]*:\s*[^;]*underline/.test(style)) {
      formats.push('underline');
    }
    
    // Strikethrough detection: text-decoration contains line-through
    if (/text-decoration[^:]*:\s*[^;]*line-through/.test(style)) {
      formats.push('strikethrough');
    }
    
    // Monospace/code detection: font-family contains mono/courier/consolas
    if (/font-family\s*:\s*[^;]*(mono|courier|consolas|menlo)/i.test(style)) {
      formats.push('code');
    }
    
    return formats;
  }

  /**
   * Build structured blocks from token stream
   * @param {Array} tokens - From HtmlTokenizer.tokenize()
   * @returns {Array<{type:string, runs:Array, level?:number, listType?:string, listLevel?:number, listIndex?:number}>}
   */
  function build(tokens) {
    if (!tokens || !Array.isArray(tokens)) return [];

    const blocks = [];
    const formatStack = [];  // Active inline formats: [{tag:'strong', prop:'bold'}, ...]
    const listStack = [];    // List nesting: [{type:'bullet'|'ordered', index:-1}, ...]
    
    let currentBlock = null;

    /**
     * Get current format state from stack
     */
    function getFormatState() {
      const state = { bold: false, italic: false, underline: false, strikethrough: false, code: false };
      for (const format of formatStack) {
        if (format.prop) state[format.prop] = true;
        // Handle CSS-derived formats (array of props)
        if (format.cssFormats) {
          for (const prop of format.cssFormats) {
            state[prop] = true;
          }
        }
      }
      return state;
    }

    /**
     * Ensure we have a current block to add runs to
     */
    function ensureBlock() {
      if (!currentBlock) {
        currentBlock = { type: 'paragraph', runs: [] };
        blocks.push(currentBlock);
      }
      return currentBlock;
    }

    /**
     * Finalize current block and start fresh
     */
    function finalizeBlock() {
      if (currentBlock && currentBlock.runs.length > 0) {
        // Trim leading/trailing empty runs
        while (currentBlock.runs.length > 0 && !currentBlock.runs[0].text.trim()) {
          currentBlock.runs.shift();
        }
        while (currentBlock.runs.length > 0 && !currentBlock.runs[currentBlock.runs.length - 1].text.trim()) {
          currentBlock.runs.pop();
        }
      }
      currentBlock = null;
    }

    // Process each token in order (preserving document order!)
    for (const token of tokens) {
      if (token.type === 'open') {
        const tag = token.tag;
        const attrs = token.attrs || {};

        // Check for CSS style formatting on ANY tag
        const cssFormats = parseStyleAttribute(attrs.style);

        // List containers - push to stack
        if (tag === 'ul') {
          listStack.push({ type: 'bullet', index: -1 });
        } else if (tag === 'ol') {
          listStack.push({ type: 'ordered', index: -1 });
        }
        // List items - create new block
        else if (tag === 'li') {
          finalizeBlock();
          const listCtx = listStack[listStack.length - 1] || { type: 'bullet', index: -1 };
          listCtx.index++;
          
          currentBlock = {
            type: 'list-item',
            listType: listCtx.type,
            listLevel: listStack.length - 1,
            listIndex: listCtx.index,
            runs: []
          };
          blocks.push(currentBlock);
        }
        // Headings
        else if (/^h([1-6])$/.test(tag)) {
          finalizeBlock();
          const level = parseInt(tag.charAt(1), 10);
          currentBlock = {
            type: 'heading',
            level: level,
            runs: []
          };
          blocks.push(currentBlock);
        }
        // Paragraphs and other block elements
        else if (BLOCK_TAGS.has(tag)) {
          finalizeBlock();
          currentBlock = { type: 'paragraph', runs: [] };
          blocks.push(currentBlock);
        }
        
        // Inline formatting - push to format stack (FIX for Bug #1!)
        // Either from semantic tags OR CSS styles
        if (INLINE_FORMAT_MAP[tag]) {
          formatStack.push({ tag: tag, prop: INLINE_FORMAT_MAP[tag] });
        } else if (cssFormats.length > 0) {
          // CSS-based formatting (span, div with style)
          formatStack.push({ tag: tag, cssFormats: cssFormats, isStyled: true });
        }
        
        // Links - store href for potential use
        if (tag === 'a') {
          formatStack.push({ tag: 'a', href: attrs.href || '' });
        }
        // Line breaks
        else if (tag === 'br') {
          ensureBlock();
          const state = getFormatState();
          currentBlock.runs.push({ text: '\n', ...state });
        }
      }
      else if (token.type === 'close') {
        const tag = token.tag;

        // List container closes
        if (LIST_CONTAINERS.has(tag)) {
          listStack.pop();
          if (listStack.length === 0) {
            finalizeBlock(); // Exit list context
          }
        }
        // Block element closes
        else if (tag === 'li' || /^h[1-6]$/.test(tag) || BLOCK_TAGS.has(tag)) {
          finalizeBlock();
        }
        // Inline format closes - pop from stack (FIX for Bug #1!)
        else if (INLINE_FORMAT_MAP[tag] || tag === 'a') {
          // Find and remove matching open tag
          for (let i = formatStack.length - 1; i >= 0; i--) {
            if (formatStack[i].tag === tag) {
              formatStack.splice(i, 1);
              break;
            }
          }
        }
      }
      else if (token.type === 'text') {
        const text = token.content;
        if (!text) continue;

        ensureBlock();
        const state = getFormatState();
        
        // Add text run with current format state
        currentBlock.runs.push({
          text: text,
          bold: state.bold,
          italic: state.italic,
          underline: state.underline,
          strikethrough: state.strikethrough,
          code: state.code
        });
      }
    }

    // Finalize any remaining block
    finalizeBlock();

    // Clean up empty blocks
    return blocks.filter(block => 
      block.runs && block.runs.length > 0 && 
      block.runs.some(run => run.text && run.text.trim())
    );
  }

  return { build };
})();

console.log('⚡ FlashDoc Formatting Engine v2 loaded');

// ============================================================================
// BATCH 2: DOCX Renderer Layer
// FIX for Bug #2: Echte DOCX Listen mit numbering config
// ============================================================================

/**
 * DocxRenderer - Creates properly formatted DOCX elements
 * Uses docx.js library with real Word formatting
 */
const DocxRenderer = (function() {
  /**
   * Create a TextRun with proper formatting from a run object
   * @param {Object} run - {text, bold, italic, underline, strikethrough, code}
   * @param {number} fontSize - Size in half-points (11pt = 22)
   * @returns {Object} - docx.TextRun configuration
   */
  function createTextRun(run, fontSize = 22) {
    const config = {
      text: run.text || '',
      font: run.code ? 'Courier New' : 'Calibri',
      size: fontSize,
      bold: Boolean(run.bold),
      italics: Boolean(run.italic)
    };
    
    if (run.underline) {
      config.underline = { type: 'single' };
    }
    if (run.strikethrough) {
      config.strike = true;
    }
    
    return config;
  }

  /**
   * Create numbering configuration for Word lists
   * FIX for Bug #2: Real Word numbering instead of Unicode bullets
   * @returns {Object} - Numbering configuration for docx.Document
   */
  function createNumberingConfig() {
    return {
      config: [
        // Bullet list configuration (3 levels)
        {
          reference: 'bullet-list',
          levels: [
            { level: 0, format: 'bullet', text: '•', alignment: 'left', style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
            { level: 1, format: 'bullet', text: '○', alignment: 'left', style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
            { level: 2, format: 'bullet', text: '▪', alignment: 'left', style: { paragraph: { indent: { left: 2160, hanging: 360 } } } }
          ]
        },
        // Ordered list configuration (3 levels)
        {
          reference: 'ordered-list',
          levels: [
            { level: 0, format: 'decimal', text: '%1.', alignment: 'left', style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
            { level: 1, format: 'lowerLetter', text: '%2)', alignment: 'left', style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
            { level: 2, format: 'lowerRoman', text: '%3.', alignment: 'left', style: { paragraph: { indent: { left: 2160, hanging: 360 } } } }
          ]
        }
      ]
    };
  }

  return { createTextRun, createNumberingConfig };
})();

// ============================================================================
// BATCH 3: PDF Renderer Layer
// FIX for Bug #4: Korrekte Ordered-List Nummerierung
// FIX for Bug #7: Context-basierte Counter (separate per list)
// ============================================================================

/**
 * PdfListContext - Manages list counters for PDF rendering
 * FIX for Bug #4: PDF zeigt "1. 2. 3." statt "•."
 * FIX for Bug #7: Zweite <ol> startet bei 1 (nicht fortlaufend)
 */
const PdfListContext = (function() {
  let counters = {};      // Counter per level: {'ordered-0': 1, 'ordered-1': 1, ...}
  let lastListType = null;
  let lastListLevel = -1;
  let inListContext = false;

  /**
   * Reset all counters (call at start of new document)
   */
  function reset() {
    counters = {};
    lastListType = null;
    lastListLevel = -1;
    inListContext = false;
  }

  /**
   * Get prefix for a block (bullet or number)
   * @param {Object} block - Block with type, listType, listLevel, listIndex
   * @returns {string|null} - Prefix like "• " or "1. " or null for non-list
   */
  function getPrefix(block) {
    // Non-list block exits list context
    if (block.type !== 'list-item') {
      if (inListContext) {
        reset();
      }
      return null;
    }

    inListContext = true;
    const level = block.listLevel || 0;
    const type = block.listType || 'bullet';
    const key = `${type}-${level}`;

    // Detect NEW list (different type at same level, or first item at level 0)
    const isNewList = 
      (block.listIndex === 0 && level === 0) ||
      (type !== lastListType && level === 0);

    if (isNewList) {
      // Reset counters for new list
      counters = {};
    }

    // Ordered list: increment and return number
    if (type === 'ordered') {
      counters[key] = (counters[key] || 0) + 1;
      lastListType = type;
      lastListLevel = level;
      return `${counters[key]}. `;
    }

    // Bullet list: return appropriate bullet for level
    const bullets = ['•', '○', '▪'];
    const bulletIndex = Math.min(level, bullets.length - 1);
    lastListType = type;
    lastListLevel = level;
    return `${bullets[bulletIndex]} `;
  }

  return { getPrefix, reset };
})();

/**
 * PdfRenderer - Renders formatted runs to jsPDF
 * FIX for Bug #1: Bold/Italic korrekt in PDF
 */
const PdfRenderer = (function() {
  /**
   * Render a single text run with formatting
   * @param {Object} doc - jsPDF instance
   * @param {Object} run - {text, bold, italic, underline, code}
   * @param {number} x - X position in mm
   * @param {number} y - Y position in mm
   * @param {number} fontSize - Font size in pt
   * @returns {number} - New X position after text
   */
  function renderRun(doc, run, x, y, fontSize) {
    if (!run.text) return x;

    // Determine font style based on formatting
    let fontStyle = 'normal';
    if (run.bold && run.italic) {
      fontStyle = 'bolditalic';
    } else if (run.bold) {
      fontStyle = 'bold';
    } else if (run.italic) {
      fontStyle = 'italic';
    }

    // Set font (use monospace for code)
    const fontFamily = run.code ? 'courier' : 'helvetica';
    doc.setFont(fontFamily, fontStyle);
    doc.setFontSize(fontSize);
    
    // Render text
    doc.text(run.text, x, y);
    
    // Return new X position
    const textWidth = doc.getTextWidth(run.text);
    return x + textWidth;
  }

  /**
   * Render all runs in a block, handling word wrap
   * @param {Object} doc - jsPDF instance
   * @param {Array} runs - Array of run objects
   * @param {number} startX - Starting X position
   * @param {number} y - Y position
   * @param {number} fontSize - Font size
   * @param {number} maxWidth - Maximum width for wrapping
   * @returns {number} - Final X position
   */
  function renderRuns(doc, runs, startX, y, fontSize, maxWidth) {
    let x = startX;
    
    for (const run of runs) {
      x = renderRun(doc, run, x, y, fontSize);
    }
    
    return x;
  }

  return { renderRun, renderRuns };
})();

console.log('⚡ FlashDoc Renderer Layer loaded');

// ============================================================================
// END FORMATTING ENGINE v2
// ============================================================================

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
    console.log('ðŸ”§ Setting up context menus...');
    console.log('ðŸ“¦ Current settings.categoryShortcuts:', this.settings.categoryShortcuts);

    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.warn('Context menu cleanup warning:', chrome.runtime.lastError.message);
      }

      if (!this.settings.enableContextMenu) {
        console.log('â­ï¸ Context menu disabled in settings');
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
      console.log('ðŸ“‹ Category shortcuts:', shortcuts);
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
          txt: 'ðŸ“„', md: 'ðŸ“', docx: 'ðŸ“œ', pdf: 'ðŸ“•', json: 'ðŸ§©',
          js: 'ðŸŸ¡', ts: 'ðŸ”µ', py: 'ðŸ', html: 'ðŸŒ', css: 'ðŸŽ¨',
          yaml: 'ðŸ§¾', sql: 'ðŸ“‘', sh: 'âš™ï¸'
        };

        shortcuts.forEach(shortcut => {
          const emoji = formatEmojis[shortcut.format] || 'ðŸ“„';
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

    // Standard format save - need to get HTML from tab
    this.getHtmlSelectionAndSave(info.selectionText, menuId, tab).catch((error) => {
      console.error('Context menu save failed:', error);
    });
  }

  /**
   * Get HTML selection from tab and save
   */
  async getHtmlSelectionAndSave(fallbackText, type, tab) {
    let html = '';
    let text = fallbackText;
    
    // Try to get HTML from the tab
    if (tab && tab.id) {
      try {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return { html: '' };
            try {
              const range = sel.getRangeAt(0);
              const container = document.createElement('div');
              container.appendChild(range.cloneContents());
              return { html: container.innerHTML };
            } catch (e) {
              return { html: '' };
            }
          }
        });
        if (result && result.result && result.result.html) {
          html = result.result.html;
        }
      } catch (e) {
        console.log('[FlashDoc] Could not get HTML selection:', e);
      }
    }
    
    await this.handleSave(text, type, tab, { html });
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
        func: () => {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return { text: '', html: '' };
          
          const text = sel.toString();
          
          // Extract HTML from selection
          let html = '';
          try {
            const range = sel.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            html = container.innerHTML;
          } catch (e) {
            html = '';
          }
          
          return { text, html };
        }
      });

      if (selection && selection.result && selection.result.text && selection.result.text.trim()) {
        await this.handleSave(selection.result.text, type, tab, { html: selection.result.html });
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

  // DEPRECATED: parseHtmlContent removed in v2
  // Replaced by: HtmlTokenizer.tokenize() + BlockBuilder.build()
  // See FORMATTING ENGINE v2 at top of file

  createPdfBlob(content, html = '') {
    // NEW PIPELINE v2: Use Formatting Engine
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);

    // DEBUG: Log input
    console.log('[PDF] Input HTML length:', html?.length || 0);
    console.log('[PDF] Input HTML preview:', html?.substring(0, 200));

    // Parse HTML using new tokenizer → builder pipeline
    let blocks;
    if (html && html.trim()) {
      const tokens = HtmlTokenizer.tokenize(html);
      console.log('[PDF] Tokens:', tokens.length, tokens.slice(0, 5));
      blocks = BlockBuilder.build(tokens);
      console.log('[PDF] Blocks:', blocks.length);
      // Log first block with runs for debugging
      if (blocks[0]) {
        console.log('[PDF] First block:', JSON.stringify(blocks[0], null, 2));
      }
    } else {
      console.log('[PDF] No HTML - using plain text fallback');
      blocks = content.split(/\n\n+/).map(para => ({
        type: 'paragraph',
        runs: [{ text: para.trim(), bold: false, italic: false }]
      })).filter(b => b.runs.length > 0 && b.runs[0].text.length > 0);
    }

    const fontSizes = {
      h1: 18, h2: 16, h3: 14, h4: 12, h5: 11, h6: 10,
      paragraph: 11, 'list-item': 11
    };

    let y = margin + 5;
    PdfListContext.reset(); // Reset list counters for new document

    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin + 5;
      }
    };

    for (const block of blocks) {
      let fontSize = fontSizes.paragraph;
      let lineHeight = 5;
      let x = margin;

      // Heading formatting
      if (block.type === 'heading') {
        fontSize = fontSizes[`h${block.level}`] || 14;
        lineHeight = fontSize * 0.45;
      }

      // Get list prefix (FIX Bug #4 and #7!)
      const prefix = PdfListContext.getPrefix(block);
      if (prefix) {
        const indent = (block.listLevel || 0) * 5;
        x = margin + indent;
        checkPageBreak(lineHeight);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
        doc.text(prefix, x, y);
        x += doc.getTextWidth(prefix);
      }

      // Render all runs with formatting (FIX Bug #1!)
      for (const run of block.runs) {
        if (!run.text || !run.text.trim()) continue;
        
        checkPageBreak(lineHeight);
        
        // Set font style based on formatting
        let fontStyle = 'normal';
        if (run.bold && run.italic) fontStyle = 'bolditalic';
        else if (run.bold) fontStyle = 'bold';
        else if (run.italic) fontStyle = 'italic';
        
        // Heading always bold
        if (block.type === 'heading') fontStyle = run.italic ? 'bolditalic' : 'bold';

        // DEBUG: Log formatting being applied
        if (run.bold || run.italic) {
          console.log('[PDF] Applying format:', fontStyle, 'to:', run.text.substring(0, 30));
        }

        const fontFamily = run.code ? 'courier' : 'helvetica';
        doc.setFont(fontFamily, fontStyle);
        doc.setFontSize(fontSize);

        // Word wrap for long text
        const availableWidth = maxWidth - (x - margin);
        const wrappedLines = doc.splitTextToSize(run.text, availableWidth);
        
        for (let i = 0; i < wrappedLines.length; i++) {
          if (i > 0) {
            y += lineHeight;
            checkPageBreak(lineHeight);
            x = margin + ((block.listLevel || 0) * 5);
            if (prefix) x += doc.getTextWidth(prefix);
          }
          doc.text(wrappedLines[i], x, y);
        }
        
        x += doc.getTextWidth(wrappedLines[wrappedLines.length - 1] || '');
      }

      y += lineHeight;

      // Extra spacing after blocks
      if (block.type === 'heading') y += 3;
      else if (block.type === 'paragraph') y += 2;
    }

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
    // NEW PIPELINE v2: Use Formatting Engine
    const { Document, Paragraph, TextRun, Packer, HeadingLevel } = docx;

    // Parse HTML using new tokenizer → builder pipeline
    let blocks;
    if (html && html.trim()) {
      const tokens = HtmlTokenizer.tokenize(html);
      blocks = BlockBuilder.build(tokens);
    } else {
      // Fallback: plain text to paragraphs
      blocks = content.split(/\n\n+/).map(para => ({
        type: 'paragraph',
        runs: [{ text: para.trim(), bold: false, italic: false }]
      })).filter(b => b.runs.length > 0 && b.runs[0].text.length > 0);
    }

    // Heading level mapping
    const headingLevels = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6
    };

    // Font sizes in half-points (11pt = 22)
    const fontSizes = {
      h1: 36, h2: 32, h3: 28, h4: 24, h5: 22, h6: 20,
      paragraph: 22, 'list-item': 22, heading: 28
    };

    // Build paragraphs with proper formatting
    const paragraphs = blocks.map(block => {
      const fontSize = block.type === 'heading' 
        ? (fontSizes[`h${block.level}`] || 28)
        : (fontSizes[block.type] || 22);

      // Create text runs with formatting (FIX Bug #1!)
      const textRuns = block.runs.map(run => {
        const config = DocxRenderer.createTextRun(run, fontSize);
        if (block.type === 'heading') config.bold = true;
        return new TextRun(config);
      });

      // List items with REAL Word numbering (FIX Bug #2!)
      if (block.type === 'list-item') {
        const level = Math.min(block.listLevel || 0, 2);
        const reference = block.listType === 'ordered' ? 'ordered-list' : 'bullet-list';
        
        return new Paragraph({
          children: textRuns,
          numbering: { reference, level },
          spacing: { after: 80 }
        });
      }

      // Headings
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

    // Create document with numbering configuration (FIX Bug #2!)
    const doc = new Document({
      numbering: DocxRenderer.createNumberingConfig(),
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: paragraphs
      }]
    });

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
  console.log(`âš¡ FlashDoc ${details.reason}: re-injecting content scripts...`);

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
          console.log(`âœ… Injected into tab ${tab.id}: ${tab.url.substring(0, 50)}...`);
        } catch (e) {
          // Tab might not support scripting - this is normal
          console.log(`â­ï¸ Skipped tab ${tab.id}: ${e.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to re-inject content scripts:', error);
  }

  if (details.reason === 'install') {
    console.log('ðŸŽ‰ FlashDoc installed!');
    chrome.tabs.create({ url: 'options.html' });
  }
});

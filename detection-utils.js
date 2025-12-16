(function (global) {
  const htmlStructuralPatterns = [
    /<!doctype html>/i,
    /^<html[\s>]/i,
    /<head[\s>]/i,
    /<body[\s>]/i,
    /<title[\s>]/i
  ];

  const htmlCommonTagPatterns = [
    /<div[\s>]/i,
    /<span[\s>]/i,
    /<section[\s>]/i,
    /<article[\s>]/i,
    /<main[\s>]/i,
    /<header[\s>]/i,
    /<footer[\s>]/i,
    /<p[\s>]/i,
    /<h[1-6][\s>]/i
  ];

  const codeKeywords = /(function|const|let|var|class)\b/;

  function hasHTMLStructure(content) {
    const trimmed = content.trim();

    const structuralScore = htmlStructuralPatterns.filter((p) => p.test(trimmed)).length;
    const commonTagScore = htmlCommonTagPatterns.filter((p) => p.test(content)).length;
    const hasClosingTags = /<\/[a-z][\w-]*>/i.test(content) && /<[a-z][\w-]*[^>]*>/i.test(content);
    const hasMetaOrLink = /<(meta|link|style|script)[\s>]/i.test(content);

    return (
      structuralScore >= 1 ||
      (hasClosingTags && (commonTagScore >= 1 || hasMetaOrLink)) ||
      commonTagScore >= 2
    );
  }

  function isLikelyCode(content) {
    return codeKeywords.test(content) && !hasHTMLStructure(content);
  }

  function isYAML(content) {
    const yamlPatterns = [
      /^[\w-]+:\s+[\w\s]/m,
      /^  - /m,
      /^---\s*$/m,
      /^\w+:\s*$/m
    ];
    return yamlPatterns.some((p) => p.test(content));
  }

  function isPython(content) {
    const pythonPatterns = [
      /^def\s+\w+\s*\(/m,
      /^class\s+\w+/m,
      /^import\s+\w+/m,
      /^from\s+\w+\s+import/m,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
    ];
    const score = pythonPatterns.filter((p) => p.test(content)).length;
    return score >= 2;
  }

  function isJSON(content) {
    try {
      JSON.parse(content.trim());
      return true;
    } catch {
      return false;
    }
  }

  function isXML(content) {
    const xmlPatterns = [
      /<\?xml/i,
      /<svg/i,
      /<\w+[^>]*xmlns/,
      /<\w+>\s*<\w+>/,
      /<!ENTITY/i
    ];
    const trimmed = content.trim();
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<svg')) return true;
    return xmlPatterns.some((p) => p.test(content));
  }

  function isTypeScript(content) {
    if (hasHTMLStructure(content)) return false;

    const tsPatterns = [
      /:\s*(string|number|boolean|any|void|never|unknown)\s*[;,)=]/,
      /interface\s+\w+/, 
      /type\s+\w+\s*=\s*\{?/, 
      /enum\s+\w+/, 
      /as\s+(const|string|number|boolean|any)/,
      /export\s+(type|interface|enum)/,
      /implements\s+\w+/, 
      /private\s+\w+|public\s+\w+|protected\s+\w+/,
      /React\.FC</,
      /useState<.*>/,
      /:\s*React\./
    ];
    const score = tsPatterns.filter((p) => p.test(content)).length;
    return score >= 2;
  }

  function isJavaScript(content) {
    if (hasHTMLStructure(content)) return false;

    const jsPatterns = [
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /=>\s*\{/, 
      /require\(['"]/, 
      /import\s+.*\s+from\s+['"]/, 
      /console\.log/ 
    ];
    const score = jsPatterns.filter((p) => p.test(content)).length;
    return score >= 2 || (score >= 1 && isLikelyCode(content));
  }

  function isSQL(content) {
    const sqlPatterns = [
      /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\s+/i,
      /\bFROM\s+\w+/i,
      /\bWHERE\s+/i,
      /\bJOIN\s+/i,
      /\bGROUP\s+BY\b/i,
      /\bORDER\s+BY\b/i,
      /\bINTO\s+\w+/i
    ];
    const score = sqlPatterns.filter((p) => p.test(content)).length;
    return score >= 2;
  }

  function isShellScript(content) {
    const shellPatterns = [
      /^#!\/bin\/(ba)?sh/m,
      /^#!\/usr\/bin\/env\s+(ba)?sh/m,
      /\b(echo|export|source|alias)\s+/, 
      /\$\{?\w+\}?/, 
      /if\s+\[.*\]\s*;\s*then/,
      /for\s+\w+\s+in\s+/, 
      /while\s+\[.*\]/
    ];
    const score = shellPatterns.filter((p) => p.test(content)).length;
    if (content.trim().startsWith('#!/bin/bash') || content.trim().startsWith('#!/bin/sh')) return true;
    return score >= 2;
  }

  function isCSV(content) {
    const trimmed = content.trim();
    if (!trimmed.includes('\n')) return false;

    const delimiters = [',', ';', '\t'];
    const lines = trimmed.split(/\r?\n/);
    const delimiter = delimiters.find((symbol) => lines[0].includes(symbol));
    if (!delimiter) return false;

    const columnCount = lines[0].split(delimiter).length;
    if (columnCount < 2) return false;

    return lines.slice(1).every((line) => {
      if (!line.trim()) return true;
      const cells = line.split(delimiter);
      return cells.length === columnCount;
    });
  }

  function isMarkdown(content) {
    const mdPatterns = [
      /^#{1,6}\s+/m,
      /\[.+\]\(.+\)/,
      /^\s*[-*+]\s+/m,
      /```[\w]*\n/,
      /^\d+\.\s+/m
    ];
    const score = mdPatterns.filter((p) => p.test(content)).length;
    return score >= 2;
  }

  function isCSS(content) {
    const cssPatterns = [
      /[\w-]+\s*\{[^}]*[\w-]+\s*:\s*[^}]+\}/,
      /@media\s*\([^)]+\)/,
      /@import\s+/, 
      /[\w-]+:\s*[\w-]+(\([^)]*\))?;/,
      /\.([\w-]+)\s*\{/,
      /#([\w-]+)\s*\{/,
      /@keyframes\s+\w+/
    ];
    const score = cssPatterns.filter((p) => p.test(content)).length;
    return score >= 2;
  }

  function detectContentType(content) {
    const text = (content || '').trim();
    if (!text) return 'txt';

    // URL detection
    if (/^https?:\/\//i.test(text)) return 'url';

    if (isYAML(text)) return 'yaml';
    if (isJSON(text)) return 'json';
    if (hasHTMLStructure(text)) return 'html';
    if (isXML(text)) return 'xml';
    if (isTypeScript(text)) return 'ts';
    if (isJavaScript(text)) return 'js';
    if (isPython(text)) return 'py';
    if (isSQL(text)) return 'sql';
    if (isShellScript(text)) return 'sh';
    if (isCSV(text)) return 'csv';
    if (isMarkdown(text)) return 'md';
    if (isCSS(text)) return 'css';

    return 'txt';
  }

  const DetectionUtils = {
    detectContentType,
    hasHTMLStructure,
    isTypeScript,
    isJavaScript
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DetectionUtils;
  }

  global.DetectionUtils = DetectionUtils;
})(typeof self !== 'undefined' ? self : this);

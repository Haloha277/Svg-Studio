import DOMPurify from 'dompurify';
import type { FormatResult, SvgDiagnostic, SvgProcessResult } from '../types/studio';

interface XmlAttr {
  name: string;
  value: string;
  quote: '"' | "'";
  line: number;
  column: number;
}

type XmlNode =
  | {
      type: 'element';
      name: string;
      attrs: XmlAttr[];
      children: XmlNode[];
      selfClosing: boolean;
      line: number;
      column: number;
    }
  | {
      type: 'text';
      value: string;
      line: number;
      column: number;
    }
  | {
      type: 'comment';
      value: string;
      line: number;
      column: number;
    }
  | {
      type: 'cdata';
      value: string;
      line: number;
      column: number;
    };

class XmlParseError extends Error {
  line: number;
  column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.line = line;
    this.column = column;
  }
}

const UNSAFE_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'applet',
  'meta',
  'link',
  'base',
  'audio',
  'video',
  'canvas',
  'frame',
  'frameset',
  'form',
  'input',
  'textarea',
  'button',
  'select',
]);

const URL_ATTRS = new Set(['href', 'xlink:href', 'src', 'action', 'formaction', 'poster']);

const SMIL_ELEMENTS = new Set(['animate', 'animatetransform', 'animatemotion', 'set', 'mpath']);

function localTagName(rawName: string): string {
  const idx = rawName.indexOf(':');
  return (idx >= 0 ? rawName.slice(idx + 1) : rawName).toLowerCase();
}

function getLineCol(input: string, index: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < index && i < input.length; i++) {
    if (input.charCodeAt(i) === 10) {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: index - lastNewline };
}

function isNameStartChar(ch: string): boolean {
  return /[A-Za-z_:]/.test(ch);
}

function isNameChar(ch: string): boolean {
  return /[A-Za-z0-9._:-]/.test(ch);
}

interface ParsedXmlDocument {
  xmlDecl: string | null;
  root: Extract<XmlNode, { type: 'element' }>;
  securityWarnings: string[];
  strippedCount: number;
}

function parseXmlDocument(source: string): ParsedXmlDocument {
  let pos = 0;
  const len = source.length;
  let xmlDecl: string | null = null;
  const securityWarnings: string[] = [];
  let strippedCount = 0;

  const skipWhitespace = () => {
    while (pos < len && /\s/.test(source[pos])) {
      pos++;
    }
  };

  // Handle optional UTF-8 BOM
  if (source.charCodeAt(0) === 0xfeff) {
    pos = 1;
  }

  // Prolog: whitespace, comments, <?xml ...?>, <!DOCTYPE ...>
  while (pos < len) {
    skipWhitespace();
    if (pos >= len) break;

    if (source.startsWith('<?', pos)) {
      const end = source.indexOf('?>', pos + 2);
      if (end === -1) {
        const lc = getLineCol(source, pos);
        throw new XmlParseError('Unterminated XML processing instruction "<?".', lc.line, lc.column);
      }
      const piContent = source.slice(pos, end + 2);
      if (/^<\?xml\b/i.test(piContent) && !xmlDecl) {
        xmlDecl = piContent;
      }
      pos = end + 2;
      continue;
    }

    if (source.startsWith('<!--', pos)) {
      const end = source.indexOf('-->', pos + 4);
      if (end === -1) {
        const lc = getLineCol(source, pos);
        throw new XmlParseError('Unterminated XML comment.', lc.line, lc.column);
      }
      pos = end + 3;
      continue;
    }

    if (source.startsWith('<!DOCTYPE', pos) || source.startsWith('<!doctype', pos)) {
      // Safely skip DOCTYPE and flag any ENTITY declarations
      let depth = 0;
      let inQuote: string | null = null;
      const start = pos;
      while (pos < len) {
        const ch = source[pos];
        if (inQuote) {
          if (ch === inQuote) inQuote = null;
        } else {
          if (ch === '"' || ch === "'") inQuote = ch;
          else if (ch === '<') depth++;
          else if (ch === '>') {
            depth--;
            if (depth === 0) {
              pos++;
              break;
            }
          }
        }
        pos++;
      }
      if (depth !== 0) {
        const lc = getLineCol(source, start);
        throw new XmlParseError('Unterminated <!DOCTYPE> declaration.', lc.line, lc.column);
      }
      const doctypeStr = source.slice(start, pos);
      if (/<!ENTITY/i.test(doctypeStr)) {
        securityWarnings.push('Removed DOCTYPE with external/internal ENTITY declarations.');
        strippedCount++;
      } else {
        securityWarnings.push('Stripped DOCTYPE declaration for safe SVG rendering.');
        strippedCount++;
      }
      continue;
    }

    break;
  }

  skipWhitespace();
  if (pos >= len) {
    throw new XmlParseError('No root <svg> element found.', 1, 1);
  }

  if (source[pos] !== '<') {
    const lc = getLineCol(source, pos);
    throw new XmlParseError('Unexpected character data before root element.', lc.line, lc.column);
  }

  function parseElement(): Extract<XmlNode, { type: 'element' }> {
    const startIdx = pos;
    const startLc = getLineCol(source, startIdx);
    pos++; // skip '<'

    if (pos >= len || !isNameStartChar(source[pos])) {
      throw new XmlParseError('Invalid or missing element tag name.', startLc.line, startLc.column);
    }

    const nameStart = pos;
    while (pos < len && isNameChar(source[pos])) {
      pos++;
    }
    const tagName = source.slice(nameStart, pos);

    const attrs: XmlAttr[] = [];
    const seenAttrs = new Set<string>();

    while (pos < len) {
      const wsBefore = pos;
      skipWhitespace();

      if (pos >= len) {
        throw new XmlParseError(`Unclosed opening tag <${tagName}>.`, startLc.line, startLc.column);
      }

      if (source.startsWith('/>', pos)) {
        pos += 2;
        return {
          type: 'element',
          name: tagName,
          attrs,
          children: [],
          selfClosing: true,
          line: startLc.line,
          column: startLc.column,
        };
      }

      if (source[pos] === '>') {
        pos++;
        break;
      }

      if (pos === wsBefore && attrs.length > 0) {
        const lc = getLineCol(source, pos);
        throw new XmlParseError(
          `Expected whitespace between attributes on <${tagName}>.`,
          lc.line,
          lc.column
        );
      }

      const attrLc = getLineCol(source, pos);
      if (!isNameStartChar(source[pos])) {
        throw new XmlParseError(
          `Invalid attribute name in <${tagName}> near "${source.slice(pos, pos + 12)}".`,
          attrLc.line,
          attrLc.column
        );
      }

      const attrNameStart = pos;
      while (pos < len && isNameChar(source[pos])) {
        pos++;
      }
      const attrName = source.slice(attrNameStart, pos);

      if (seenAttrs.has(attrName)) {
        throw new XmlParseError(
          `Duplicate attribute "${attrName}" on <${tagName}>.`,
          attrLc.line,
          attrLc.column
        );
      }
      seenAttrs.add(attrName);

      skipWhitespace();
      if (pos >= len || source[pos] !== '=') {
        throw new XmlParseError(
          `Missing "=" after attribute "${attrName}" on <${tagName}>.`,
          attrLc.line,
          attrLc.column
        );
      }
      pos++; // skip '='
      skipWhitespace();

      if (pos >= len || (source[pos] !== '"' && source[pos] !== "'")) {
        const lc = getLineCol(source, pos);
        throw new XmlParseError(
          `Attribute "${attrName}" on <${tagName}> must be enclosed in quotes.`,
          lc.line,
          lc.column
        );
      }

      const quote = source[pos] as '"' | "'";
      pos++; // skip opening quote
      const valStart = pos;
      while (pos < len && source[pos] !== quote) {
        if (source[pos] === '<') {
          const lc = getLineCol(source, pos);
          throw new XmlParseError(
            `Unescaped "<" inside attribute "${attrName}" on <${tagName}>.`,
            lc.line,
            lc.column
          );
        }
        pos++;
      }

      if (pos >= len) {
        throw new XmlParseError(
          `Unterminated quote for attribute "${attrName}" on <${tagName}>.`,
          attrLc.line,
          attrLc.column
        );
      }

      const attrVal = source.slice(valStart, pos);
      pos++; // skip closing quote

      attrs.push({
        name: attrName,
        value: attrVal,
        quote,
        line: attrLc.line,
        column: attrLc.column,
      });
    }

    // Parse children until </tagName>
    const children: XmlNode[] = [];
    while (pos < len) {
      if (source.startsWith('</', pos)) {
        const closeLc = getLineCol(source, pos);
        pos += 2;
        const closeStart = pos;
        while (pos < len && isNameChar(source[pos])) {
          pos++;
        }
        const closeName = source.slice(closeStart, pos);
        skipWhitespace();
        if (pos >= len || source[pos] !== '>') {
          throw new XmlParseError(
            `Malformed closing tag </${closeName}>.`,
            closeLc.line,
            closeLc.column
          );
        }
        pos++; // skip '>'

        if (closeName !== tagName) {
          throw new XmlParseError(
            `Mismatched closing tag </${closeName}>; expected </${tagName}> (opened at line ${startLc.line}).`,
            closeLc.line,
            closeLc.column
          );
        }

        return {
          type: 'element',
          name: tagName,
          attrs,
          children,
          selfClosing: false,
          line: startLc.line,
          column: startLc.column,
        };
      }

      if (source.startsWith('<!--', pos)) {
        const cLc = getLineCol(source, pos);
        const end = source.indexOf('-->', pos + 4);
        if (end === -1) {
          throw new XmlParseError('Unterminated XML comment.', cLc.line, cLc.column);
        }
        children.push({
          type: 'comment',
          value: source.slice(pos + 4, end),
          line: cLc.line,
          column: cLc.column,
        });
        pos = end + 3;
        continue;
      }

      if (source.startsWith('<![CDATA[', pos)) {
        const cLc = getLineCol(source, pos);
        const end = source.indexOf(']]>', pos + 9);
        if (end === -1) {
          throw new XmlParseError('Unterminated CDATA section.', cLc.line, cLc.column);
        }
        children.push({
          type: 'cdata',
          value: source.slice(pos + 9, end),
          line: cLc.line,
          column: cLc.column,
        });
        pos = end + 3;
        continue;
      }

      if (source.startsWith('<?', pos)) {
        const piLc = getLineCol(source, pos);
        const end = source.indexOf('?>', pos + 2);
        if (end === -1) {
          throw new XmlParseError('Unterminated processing instruction.', piLc.line, piLc.column);
        }
        pos = end + 2;
        continue;
      }

      if (source[pos] === '<') {
        children.push(parseElement());
        continue;
      }

      // Text node
      const tLc = getLineCol(source, pos);
      const tStart = pos;
      while (pos < len && source[pos] !== '<') {
        pos++;
      }
      const textVal = source.slice(tStart, pos);
      if (textVal.length > 0) {
        children.push({
          type: 'text',
          value: textVal,
          line: tLc.line,
          column: tLc.column,
        });
      }
    }

    throw new XmlParseError(
      `Missing closing tag </${tagName}> (opened at line ${startLc.line}).`,
      startLc.line,
      startLc.column
    );
  }

  const root = parseElement();

  // Ensure nothing trails after root element except whitespace and comments
  while (pos < len) {
    skipWhitespace();
    if (pos >= len) break;
    if (source.startsWith('<!--', pos)) {
      const end = source.indexOf('-->', pos + 4);
      if (end === -1) {
        const lc = getLineCol(source, pos);
        throw new XmlParseError('Unterminated trailing XML comment.', lc.line, lc.column);
      }
      pos = end + 3;
      continue;
    }
    const lc = getLineCol(source, pos);
    throw new XmlParseError(
      'Unexpected content after closing </' + root.name + '> root element.',
      lc.line,
      lc.column
    );
  }

  return { xmlDecl, root, securityWarnings, strippedCount };
}

function isUrlSafe(rawValue: string): { safe: boolean; reason?: string } {
  const normalized = rawValue.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  if (!normalized) return { safe: true };

  if (normalized.startsWith('#')) {
    return { safe: true };
  }

  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/') ||
    normalized.startsWith('data:application/') ||
    normalized.startsWith('data:image/svg+xml')
  ) {
    return { safe: false, reason: `Blocked executable or unsafe URI scheme in "${rawValue.slice(0, 32)}".` };
  }

  if (/^(https?:|ftp:|file:|\/\/)/i.test(normalized)) {
    return { safe: false, reason: `Blocked external resource reference "${rawValue.slice(0, 48)}".` };
  }

  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(normalized)) {
    return { safe: true };
  }

  if (normalized.startsWith('data:')) {
    return { safe: false, reason: `Blocked unsupported data URI "${rawValue.slice(0, 32)}".` };
  }

  return { safe: true };
}

function sanitizeCssString(css: string): { cleaned: string; warnings: string[]; stripped: number } {
  const warnings: string[] = [];
  let stripped = 0;
  let cleaned = css;

  if (/@import\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/@import[^;]*;?/gi, '');
    warnings.push('Removed @import rule from SVG styles.');
    stripped++;
  }

  if (/expression\s*\(|-moz-binding\s*:|javascript\s*:/gi.test(cleaned)) {
    cleaned = cleaned.replace(/expression\s*\([^)]*\)/gi, '');
    cleaned = cleaned.replace(/-moz-binding\s*:[^;]+;?/gi, '');
    cleaned = cleaned.replace(/javascript\s*:[^;"']*/gi, '');
    warnings.push('Removed unsafe CSS expression or script directive.');
    stripped++;
  }

  // Block external url(...) inside CSS while preserving local url(#id)
  cleaned = cleaned.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (full, _q, inner) => {
    const trimmed = String(inner).trim();
    if (trimmed.startsWith('#')) {
      return `url(${trimmed})`;
    }
    warnings.push(`Blocked external CSS url(${trimmed.slice(0, 32)}).`);
    stripped++;
    return 'none';
  });

  return { cleaned, warnings, stripped };
}

function sanitizeAstNode(
  node: XmlNode,
  warnings: string[],
  counter: { count: number }
): XmlNode | null {
  if (node.type === 'comment' || node.type === 'text') {
    return node;
  }

  if (node.type === 'cdata') {
    return node;
  }

  const tag = localTagName(node.name);
  if (UNSAFE_ELEMENTS.has(tag)) {
    warnings.push(`Removed unsafe <${node.name}> element.`);
    counter.count++;
    return null;
  }

  // Check SMIL animations targeting unsafe attributes
  if (SMIL_ELEMENTS.has(tag)) {
    const targetAttr = node.attrs.find((a) => a.name.toLowerCase() === 'attributename');
    if (targetAttr) {
      const val = targetAttr.value.trim().toLowerCase();
      if (val === 'href' || val === 'xlink:href' || val === 'src' || val.startsWith('on')) {
        warnings.push(`Blocked SMIL <${node.name}> targeting "${targetAttr.value}".`);
        counter.count++;
        return null;
      }
    }
    for (const attr of node.attrs) {
      if (['from', 'to', 'values'].includes(attr.name.toLowerCase())) {
        if (/javascript:|vbscript:|https?:|\/\//i.test(attr.value)) {
          warnings.push(`Blocked unsafe URI inside <${node.name}> animation.`);
          counter.count++;
          return null;
        }
      }
    }
  }

  const safeAttrs: XmlAttr[] = [];
  for (const attr of node.attrs) {
    const lowerName = attr.name.toLowerCase();

    // Strip all inline event handlers (on*)
    if (/^on[a-z0-9_-]*$/i.test(lowerName)) {
      warnings.push(`Removed inline event handler "${attr.name}" on <${node.name}>.`);
      counter.count++;
      continue;
    }

    // Validate URL attributes
    if (URL_ATTRS.has(lowerName) || URL_ATTRS.has(localTagName(lowerName))) {
      const check = isUrlSafe(attr.value);
      if (!check.safe) {
        warnings.push(check.reason ?? `Blocked unsafe ${attr.name} attribute.`);
        counter.count++;
        continue;
      }
    }

    // Check style attribute
    if (lowerName === 'style') {
      const res = sanitizeCssString(attr.value);
      if (res.stripped > 0) {
        warnings.push(...res.warnings);
        counter.count += res.stripped;
      }
      safeAttrs.push({ ...attr, value: res.cleaned });
      continue;
    }

    // Check CSS url(...) in presentation attributes (fill, stroke, clip-path, mask, filter, marker-*)
    if (/url\s*\(/i.test(attr.value)) {
      const res = sanitizeCssString(attr.value);
      if (res.stripped > 0) {
        warnings.push(...res.warnings);
        counter.count += res.stripped;
        safeAttrs.push({ ...attr, value: res.cleaned });
        continue;
      }
    }

    safeAttrs.push(attr);
  }

  // Sanitize <style> text content
  const safeChildren: XmlNode[] = [];
  for (const child of node.children) {
    if (tag === 'style' && (child.type === 'text' || child.type === 'cdata')) {
      const res = sanitizeCssString(child.value);
      if (res.stripped > 0) {
        warnings.push(...res.warnings);
        counter.count += res.stripped;
      }
      safeChildren.push({ type: 'text', value: res.cleaned, line: child.line, column: child.column });
    } else {
      const sanitizedChild = sanitizeAstNode(child, warnings, counter);
      if (sanitizedChild) safeChildren.push(sanitizedChild);
    }
  }

  return {
    ...node,
    attrs: safeAttrs,
    children: safeChildren,
  };
}

function serializeXmlNode(node: XmlNode): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'comment') return `<!--${node.value}-->`;
  if (node.type === 'cdata') return `<![CDATA[${node.value}]]>`;

  const attrsStr = node.attrs
    .map((a) => ` ${a.name}=${a.quote}${a.value}${a.quote}`)
    .join('');

  if (node.selfClosing && node.children.length === 0) {
    return `<${node.name}${attrsStr} />`;
  }

  const childrenStr = node.children.map(serializeXmlNode).join('');
  return `<${node.name}${attrsStr}>${childrenStr}</${node.name}>`;
}

function formatXmlNode(node: XmlNode, depth: number, indentUnit: string): string {
  const indent = indentUnit.repeat(depth);

  if (node.type === 'comment') {
    const trimmed = node.value.trim();
    return `${indent}<!-- ${trimmed} -->`;
  }

  if (node.type === 'cdata') {
    return `${indent}<![CDATA[${node.value}]]>`;
  }

  if (node.type === 'text') {
    return `${indent}${node.value.trim()}`;
  }

  const attrsStr = node.attrs
    .map((a) => ` ${a.name}=${a.quote}${a.value}${a.quote}`)
    .join('');

  const meaningfulChildren = node.children.filter(
    (c) => c.type !== 'text' || c.value.trim().length > 0
  );

  if (meaningfulChildren.length === 0) {
    return `${indent}<${node.name}${attrsStr} />`;
  }

  // Inline single short text child (e.g. <title>Icon</title>, <text ...>Hello</text>)
  if (
    meaningfulChildren.length === 1 &&
    meaningfulChildren[0].type === 'text' &&
    !meaningfulChildren[0].value.includes('\n') &&
    meaningfulChildren[0].value.trim().length <= 80
  ) {
    return `${indent}<${node.name}${attrsStr}>${meaningfulChildren[0].value.trim()}</${node.name}>`;
  }

  const inner = meaningfulChildren
    .map((child) => formatXmlNode(child, depth + 1, indentUnit))
    .join('\n');

  return `${indent}<${node.name}${attrsStr}>\n${inner}\n${indent}</${node.name}>`;
}

function extractIntrinsicDimensions(root: Extract<XmlNode, { type: 'element' }>): {
  viewBox: string | null;
  width: number;
  height: number;
  diagnostics: SvgDiagnostic[];
} {
  const diagnostics: SvgDiagnostic[] = [];
  const vbAttr = root.attrs.find((a) => a.name === 'viewBox');
  const wAttr = root.attrs.find((a) => a.name === 'width');
  const hAttr = root.attrs.find((a) => a.name === 'height');

  let viewBox: string | null = null;
  let vbW: number | null = null;
  let vbH: number | null = null;

  if (vbAttr) {
    const parts = vbAttr.value
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)) || parts[2] < 0 || parts[3] < 0) {
      diagnostics.push({
        severity: 'error',
        message: `Invalid viewBox="${vbAttr.value}". Expected 4 numbers: "min-x min-y width height" with non-negative dimensions.`,
        line: vbAttr.line,
        column: vbAttr.column,
      });
    } else {
      viewBox = vbAttr.value.trim();
      vbW = parts[2] || 400;
      vbH = parts[3] || 400;
    }
  }

  const parseDim = (attr: XmlAttr | undefined, label: string): number | null => {
    if (!attr) return null;
    const raw = attr.value.trim();
    if (raw.endsWith('%')) return null;
    const match = raw.match(/^([+-]?\d*\.?\d+)(px|pt|pc|mm|cm|in|em|rem)?$/i);
    if (!match) return null;
    const num = Number(match[1]);
    if (!Number.isFinite(num) || num < 0) {
      diagnostics.push({
        severity: 'error',
        message: `Invalid ${label}="${attr.value}". Dimension must be non-negative.`,
        line: attr.line,
        column: attr.column,
      });
      return null;
    }
    return num;
  };

  const parsedW = parseDim(wAttr, 'width');
  const parsedH = parseDim(hAttr, 'height');

  return {
    viewBox,
    width: parsedW ?? vbW ?? 400,
    height: parsedH ?? vbH ?? 400,
    diagnostics,
  };
}

function runDomPurifyInBrowser(svgMarkup: string): string {
  if (typeof window === 'undefined' || typeof DOMPurify?.sanitize !== 'function') {
    return svgMarkup;
  }

  const purifier = DOMPurify;
  const sanitized = purifier.sanitize(svgMarkup, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: [
      'animate',
      'animateMotion',
      'animateTransform',
      'set',
      'mpath',
      'title',
      'desc',
      'style',
      'clipPath',
      'mask',
      'linearGradient',
      'radialGradient',
      'stop',
      'pattern',
      'marker',
      'symbol',
      'use',
      'defs',
      'feGaussianBlur',
      'feDropShadow',
      'feColorMatrix',
      'feOffset',
      'feBlend',
      'feMerge',
      'feMergeNode',
      'feFlood',
      'feComposite',
      'feTurbulence',
      'feDisplacementMap',
    ],
    ADD_ATTR: [
      'attributeName',
      'attributeType',
      'begin',
      'dur',
      'end',
      'from',
      'to',
      'by',
      'values',
      'repeatCount',
      'repeatDur',
      'keyTimes',
      'keySplines',
      'calcMode',
      'additive',
      'accumulate',
      'type',
      'path',
      'rotate',
      'origin',
      'viewBox',
      'preserveAspectRatio',
      'xmlns',
      'xmlns:xlink',
      'xlink:href',
      'href',
      'gradientUnits',
      'gradientTransform',
      'spreadMethod',
      'patternUnits',
      'patternTransform',
      'clipPathUnits',
      'maskUnits',
      'maskContentUnits',
      'markerWidth',
      'markerHeight',
      'refX',
      'refY',
      'orient',
      'stdDeviation',
      'in',
      'in2',
      'result',
      'mode',
      'operator',
      'k1',
      'k2',
      'k3',
      'k4',
      'dx',
      'dy',
      'flood-color',
      'flood-opacity',
      'baseFrequency',
      'numOctaves',
      'seed',
      'scale',
      'xChannelSelector',
      'yChannelSelector',
    ],
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'applet', 'link', 'meta'],
    FORBID_ATTR: [
      'onload',
      'onerror',
      'onclick',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'onbegin',
      'onend',
      'onrepeat',
    ],
  });

  return typeof sanitized === 'string' ? sanitized : String(sanitized);
}

export function processSvgForPreview(source: string): SvgProcessResult {
  if (!source || !source.trim()) {
    return {
      valid: false,
      empty: true,
      sanitizedSvg: null,
      diagnostics: [{ severity: 'error', message: 'Editor is empty. Enter SVG markup or load an example.' }],
      securityWarnings: [],
      strippedCount: 0,
      viewBox: null,
      intrinsicWidth: 400,
      intrinsicHeight: 400,
    };
  }

  let parsed: ParsedXmlDocument;
  try {
    parsed = parseXmlDocument(source);
  } catch (err) {
    if (err instanceof XmlParseError) {
      return {
        valid: false,
        empty: false,
        sanitizedSvg: null,
        diagnostics: [{ severity: 'error', message: err.message, line: err.line, column: err.column }],
        securityWarnings: [],
        strippedCount: 0,
        viewBox: null,
        intrinsicWidth: 400,
        intrinsicHeight: 400,
      };
    }
    return {
      valid: false,
      empty: false,
      sanitizedSvg: null,
      diagnostics: [{ severity: 'error', message: 'Unable to parse SVG XML document.' }],
      securityWarnings: [],
      strippedCount: 0,
      viewBox: null,
      intrinsicWidth: 400,
      intrinsicHeight: 400,
    };
  }

  const rootTag = localTagName(parsed.root.name);
  if (rootTag !== 'svg') {
    return {
      valid: false,
      empty: false,
      sanitizedSvg: null,
      diagnostics: [
        {
          severity: 'error',
          message: `Invalid root element <${parsed.root.name}>. Document must have an <svg> root element.`,
          line: parsed.root.line,
          column: parsed.root.column,
        },
      ],
      securityWarnings: parsed.securityWarnings,
      strippedCount: parsed.strippedCount,
      viewBox: null,
      intrinsicWidth: 400,
      intrinsicHeight: 400,
    };
  }

  const diagnostics: SvgDiagnostic[] = [];

  const xmlnsAttr = parsed.root.attrs.find((a) => a.name === 'xmlns');
  if (xmlnsAttr && xmlnsAttr.value.trim() !== 'http://www.w3.org/2000/svg') {
    diagnostics.push({
      severity: 'error',
      message: `Invalid SVG namespace "${xmlnsAttr.value}". Expected "http://www.w3.org/2000/svg".`,
      line: xmlnsAttr.line,
      column: xmlnsAttr.column,
    });
  }

  const dims = extractIntrinsicDimensions(parsed.root);
  diagnostics.push(...dims.diagnostics);

  // Browser native XML parser cross-check
  if (typeof DOMParser !== 'undefined' && diagnostics.length === 0) {
    try {
      const domDoc = new DOMParser().parseFromString(source, 'image/svg+xml');
      const parserError = domDoc.querySelector('parsererror');
      if (parserError) {
        const msg = parserError.textContent?.trim().split('\n')[0] || 'Malformed XML detected by browser parser.';
        diagnostics.push({ severity: 'error', message: msg });
      }
    } catch {
      diagnostics.push({ severity: 'error', message: 'Browser XML parser rejected the SVG markup.' });
    }
  }

  if (diagnostics.some((d) => d.severity === 'error')) {
    return {
      valid: false,
      empty: false,
      sanitizedSvg: null,
      diagnostics,
      securityWarnings: parsed.securityWarnings,
      strippedCount: parsed.strippedCount,
      viewBox: dims.viewBox,
      intrinsicWidth: dims.width,
      intrinsicHeight: dims.height,
    };
  }

  // Defense-in-depth sanitization: AST scrubber + DOMPurify
  const securityWarnings = [...parsed.securityWarnings];
  const counter = { count: parsed.strippedCount };
  const scrubbedRoot = sanitizeAstNode(parsed.root, securityWarnings, counter);

  if (!scrubbedRoot || scrubbedRoot.type !== 'element') {
    return {
      valid: false,
      empty: false,
      sanitizedSvg: null,
      diagnostics: [{ severity: 'error', message: 'SVG root was rejected during security sanitization.' }],
      securityWarnings,
      strippedCount: counter.count,
      viewBox: dims.viewBox,
      intrinsicWidth: dims.width,
      intrinsicHeight: dims.height,
    };
  }

  // Ensure xmlns="http://www.w3.org/2000/svg" is present for DOMParser / SVG rendering
  if (!scrubbedRoot.attrs.some((a) => a.name === 'xmlns')) {
    scrubbedRoot.attrs = [
      { name: 'xmlns', value: 'http://www.w3.org/2000/svg', quote: '"', line: 1, column: 1 },
      ...scrubbedRoot.attrs,
    ];
  }

  const astSerialized = serializeXmlNode(scrubbedRoot);
  const purified = runDomPurifyInBrowser(astSerialized);

  // Deduplicate warnings cleanly
  const uniqueWarnings = Array.from(new Set(securityWarnings));

  return {
    valid: true,
    empty: false,
    sanitizedSvg: purified,
    diagnostics,
    securityWarnings: uniqueWarnings,
    strippedCount: counter.count,
    viewBox: dims.viewBox,
    intrinsicWidth: dims.width,
    intrinsicHeight: dims.height,
  };
}

export function formatSvgMarkup(source: string, tabSize: 2 | 4 = 2): FormatResult {
  if (!source || !source.trim()) {
    return {
      ok: false,
      formatted: source,
      error: { severity: 'error', message: 'Cannot format empty editor content.' },
    };
  }

  try {
    const parsed = parseXmlDocument(source);
    const indentUnit = ' '.repeat(tabSize);
    const body = formatXmlNode(parsed.root, 0, indentUnit);
    const formatted = parsed.xmlDecl ? `${parsed.xmlDecl}\n${body}\n` : `${body}\n`;
    return { ok: true, formatted };
  } catch (err) {
    if (err instanceof XmlParseError) {
      return {
        ok: false,
        formatted: source,
        error: {
          severity: 'error',
          message: `Cannot format malformed XML: ${err.message}`,
          line: err.line,
          column: err.column,
        },
      };
    }
    return {
      ok: false,
      formatted: source,
      error: { severity: 'error', message: 'Cannot format invalid SVG markup.' },
    };
  }
}

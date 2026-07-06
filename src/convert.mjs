/************************************************************
 * Series of conversion functions to process a DOM tree and
 * convert it to an exist .docx document
 ***********************************************************/

import { appendRootNodes } from './append-root-nodes.mjs';
import { copyOptions } from './copy-options.mjs';
import {
  Paragraph,
  TextRun,
  InternalHyperlink,
  ExternalHyperlink,
  Header,
  Footer,
  HeadingLevel,
  Bookmark
} from 'docx';


// Bookmark IDs that have already been created
const bookmarks = {};

// Last given instance ID for ordered lists
let lastInstanceID = 1;


export function convertBody(body, doc) {
  const children = body.children;

  for (const child of children) {
    if (child.className.includes('head')) {
      const docNodes = convertHead(child);
      appendRootNodes(docNodes, doc);
    }
    else if (child.id === 'toc-nav') {
      continue;
    }
    else if (child.id === 'toc') {
      // Table of Contents needs to appear in the preamble
      const docNodes = convertTableOfcontents(child);
      appendRootNodes(docNodes, doc, { preamble: true });
    }
    else if (child.id === 'abstract') {
      const docNodes = convertAbstract(child);
      appendRootNodes(docNodes, doc);
    }
    else if (child.id === 'intro' || child.id === 'introduction') {
      // Introduction needs to appear in the preamble
      const docNodes = convertIntroduction(child);
      appendRootNodes(docNodes, doc, { preamble: true });
    }
    else if (child.id === 'sotd') {
      continue;
    }
    else {
      const docNodes = convertNode(child);
      appendRootNodes(docNodes, doc);
    }
  }
}

/**
 * Convert the header section.
 * 
 * That essentially means copying the title and ignoring the rest, because
 * ISO standards typically won't contain the W3C logo, the front matter, the
 * W3C copyright and the link to translations.
 */
function convertHead(head) {
  const children = head.children;
  for (const child of children) {
    if (child.nodeName === 'H1') {
      return convertHeading(child);
    }
  }
  return null;
}

/**
 * Convert the table of contents
 */
function convertTableOfcontents(toc) {
  return null;
}

/**
 * Convert the introduction
 *
 * Note: No need to flag the section as non normative explicitly. The section
 * can be converted as any other section otherwise.
 */
function convertIntroduction(intro) {
  return convertSection(intro);
}

/**
 * W3C's abstract seems to map to ISO's mandatory Scope section, although
 * note that may not be worth checking after conversion.
 */
function convertAbstract(abstract) {
  return [
    new Paragraph({
      text: 'Scope',
      heading: HeadingLevel.HEADING_2
    })
  ]
  .concat(
    [...abstract.children]
      .filter(child => !child.nodeName.startsWith('H'))
      .map(child => convertNode(child))
      .flat()
      .filter(node => !!node)
  );
}


/**
 * Convert a generic DOM node to a list of docx objects that can mix Paragraphs
 * and inline objects à la TextRun.
 */
function convertNode(node, options) {
  if (node.id) {
    options = copyOptions(options);
    options.ids = options.ids ?? [];
    options.ids.push(node.id);
  }
  switch (node.nodeName) {
    case 'A':
      return convertLink(node, options);
    case 'ASIDE':
      return convertSection(node, options);
    case 'B':
    case 'STRONG':
      return convertStrong(node, options);
    case 'BR':
      return new TextRun('\n');
    case 'CODE':
      return convertCode(node, options);
    case 'DD':
      return convertDefinitionDescription(node, options);
    case 'DFN':
      return convertDefinition(node, options);
    case 'DIV':
      return convertSection(node, options);
    case 'DL':
      return convertDefinitionList(node, options);
    case 'DT':
      return convertDefinitionTerm(node, options);
    case 'EM':
    case 'I':
      return convertEm(node, options);
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6':
      return convertHeading(node, options);
    case 'LI':
      return convertListItem(node, options);
    case 'OL':
      return convertOrderedList(node, options);
    case 'P':
      return convertParagraph(node, options);
    case 'SECTION':
      return convertSection(node, options);
    case 'SCRIPT':
      return null;
    case 'SPAN':
      return convertSpan(node, options);
    case 'SUB':
      return convertSub(node, options);
    case 'SUP':
      return convertSup(node, options);
    case 'UL':
      return convertUnorderedList(node, options);
    case 'BDI':
    case 'ABBR':
    case 'CITE':
    case 'Q':
      // TODO: improve support for ABBR, CITE, and Q
      return convertTextNode(node, options);
    default:
      if (node.nodeType === 3) {
        // Text node
        return convertTextNode(node, options);
      }
      else if (node.nodeType === 1) {
        // TODO: handle img, table, etc.
        console.error(`Unsupported node type found: ${node.nodeName}`);
        return convertTextNode(node, options);
      }
  }
}

/**
 * Convert a generic section (<section>, <div>, <aside>)
 */
function convertSection(section, options) {
  if (section.hasAttribute('hidden')) {
    return null;
  }
  return convertChildNodes(section, options);
}

function convertParagraph(p, options) {
  const para = {
    children: convertChildNodes(p, options)
  };
  if (options?.level === 0 || options?.level > 0) {
    if (options.reference) {
      para.numbering = {
        reference: options.reference,
        level: options.level,
        instance: options.instance ?? 1
      };
    }
    else {
      para.bullet = {
        level: options.level
      };
    }
  }
  if (options?.style) {
    para.style = options.style;
  }
  if (options?.heading) {
    para.heading = options.heading;
    para.numbering = false;
  }
  return new Paragraph(para);
}

// Do we need to do anything with a span?
function convertSpan(span, options) {
  return convertChildNodes(span, options);
}

function convertSub(node, options) {
  options = copyOptions(options);
  options.subScript = true;
  return convertChildNodes(node);
}

function convertSup(node, options) {
  options = copyOptions(options);
  options.superScript = true;
  return convertChildNodes(node);
}

/**
 * If the link is an internal link, a bookmark needs to be created.
 * Link is more direct otherwise.
 */
function convertLink(a, options) {
  if (!a.textContent) {
    return null;
  }
  options = copyOptions(options);
  options.hyperlink = true;
  if (a.getAttribute('href').startsWith('#')) {
    return new InternalHyperlink({
      children: convertChildNodes(a, options),
      anchor: a.getAttribute('href').substring(1)
    });
  }
  else {
    return new ExternalHyperlink({
      children: convertChildNodes(a, options),
      link: a.href
    });
  }
}

function convertHeading(h, options) {
  const level = h.nodeName.substring(1);
  options = copyOptions(options);
  if (level === '1') {
    // Why ISO, why?!?
    options.style = 'zzSTDTitle';
  }
  else {
    options.heading = HeadingLevel['HEADING_' + level];
  }
  return convertParagraph(h, options);
}

/**
 * Convert text with emphasis.
 *
 * Note: Main difficulty is that a TextRun in the .docx document cannot contain
 * children, so we need to "propagate" the emphasis to children
 */
function convertEm(em, options) {
  options = copyOptions(options);
  options.italics = true;
  return convertChildNodes(em, options);
}

/**
 * Convert bold text.
 *
 * Note: Main difficulty is that a TextRun in the .docx document cannot contain
 * children, so we need to "propagate" the bold aspect to children
 */
function convertStrong(em, options) {
  options = copyOptions(options);
  options.bold = true;
  return convertChildNodes(em, options);
}

/**
 * Convert actual text.
 *
 * Note: This is where inline styles get applied in a .docx document
 */
function convertTextNode(node, options) {
  const textrun = {
    text: node.textContent.replace(/\s+/g, ' ')
  };
  if (options?.italics) {
    textrun.italics = true;
  }
  if (options?.bold) {
    textrun.bold = true;
  }
  if (options?.superScript) {
    textrun.superScript = true;
  }
  if (options?.subScript) {
    textrun.subScript = true;
  }
  // TODO: need a style that is both hyperlink *and* code
  if (options?.hyperlink && options?.code) {
    textrun.style = 'CodeHyperlink';
  }
  else if (options?.hyperlink) {
    textrun.style = 'Hyperlink';
  }
  else if (options?.code) {
    textrun.style = 'CodeInline';
  }
  let res = new TextRun(textrun);
  const ids = options?.ids ?? [];
  ids.reverse();
  for (const id of ids) {
    if (bookmarks[id] || id.startsWith('ref-for-')) {
      continue;
    }
    bookmarks[id] = true;
    res = new Bookmark({ id, children: [res] });
  }
  return res;
}


function convertOrderedList(node, options) {
  options = copyOptions(options);
  if (options.level === 0 || options.level > 0) {
    options.level += 1;
  }
  else {
    options.level = 0;
  }
  options.reference = 'ol';
  options.instance = lastInstanceID++;
  return convertChildren(node, options);
}

function convertUnorderedList(node, options) {
  options = copyOptions(options);
  if (options.level === 0 || options.level > 0) {
    options.level += 1;
  }
  else {
    options.level = 0;
  }
  options.reference = 'ul';
  options.instance = lastInstanceID++;
  return convertChildren(node, options);
}

function convertListItem(node, options) {
  const docNodes = convertChildNodes(node, options);
  if (docNodes?.find(node => node instanceof Paragraph)) {
    // Hmm, so we were more expecting to see inline runs here,
    // TODO: only the first paragraph should get a bullet, the other ones
    // should be indented without bullets
    return docNodes;
  }
  else {
    return convertParagraph(node, options);
  }
}

function convertCode(node, options) {
  options = copyOptions(options);
  options.code = true;
  return convertChildNodes(node, options);
}

function convertDefinitionList(node, options) {
  if (node.hasAttribute('hidden')) {
    return null;
  }
  return convertChildren(node, options);
}

function convertDefinitionTerm(node, options) {
  options = copyOptions(options);
  options.style = 'Terms';
  return convertParagraph(node, options);
}

function convertDefinitionDescription(node, options) {
  options = copyOptions(options);
  options.style = 'Definition';
  const docNodes = convertChildNodes(node, options);
  if (docNodes?.find(node => node instanceof Paragraph)) {
    return docNodes;
  }
  else {
    return convertParagraph(node, options);
  }
}

function convertDefinition(node, options) {
  options = copyOptions(options);
  options.bold = true;
  return convertChildNodes(node, options);
}

function convertChildren(node, options) {
  return [...node.children]
    .map(child => convertNode(child, options))
    .flat()
    .filter(node => !!node);
}

function convertChildNodes(node, options) {
  return [...node.childNodes]
    .map(child => convertNode(child, options))
    .flat()
    .filter(node => !!node);
}
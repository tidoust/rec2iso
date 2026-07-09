/************************************************************
 * Series of conversion functions to process a DOM tree and
 * convert it to an exist .docx document
 ***********************************************************/

import { appendRootNodes } from './append-root-nodes.mjs';
import { flattenDOM } from './flatten.mjs';
import { copyOptions } from './copy-options.mjs';
import {
  Paragraph,
  TextRun,
  InternalHyperlink,
  ExternalHyperlink,
  HeadingLevel,
  Bookmark
} from 'docx';


// Bookmark IDs that have already been created
const bookmarks = {};

// Last given instance ID for ordered lists
let lastInstanceID = 1;


export function convertBody(body, doc = {}) {
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
  return doc;
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
      return convertNode(child);
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
  return convertNode(intro);
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
function convertNode(node) {
  const flat = flattenDOM(node);
  const result = flat.map(p => convertBlock(p));
  return result;
}

function getOptionsFromAttributes(el, options = {}) {
  options = copyOptions(options);
  if (el.hasAttribute('data-subscript')) {
    options.subScript = true;
  }
  if (el.hasAttribute('data-superscript')) {
    options.superScript = true;
  }
  if (el.hasAttribute('data-italics')) {
    options.italics = true;
  }
  if (el.hasAttribute('data-bold')) {
    options.bold = true;
  }
  if (el.hasAttribute('data-code')) {
    if (options.hyperlink) {
      options.style = 'CodeHyperlink';
    }
    else {
      options.style = 'CodeInline';
    }
  }
  if (el.hasAttribute('data-dt')) {
    options.style = 'Terms';
  }
  if (el.hasAttribute('data-dd')) {
    options.style = 'Definition';
  }
  if (el.hasAttribute('data-heading')) {
    const level = el.getAttribute('data-heading');
    if (level === '1') {
      // Why ISO, why?!?
      options.style = 'zzSTDTitle';
    }
    else {
      options.heading = HeadingLevel['HEADING_' + level];
      options.numbering = false;
    }
  }
  if (el.hasAttribute('data-bullet')) {
    options.bullet = {
      level: el.getAttribute('data-bullet')
    };
  }
  return options;
}

function convertBlock(el) {
  const options = getOptionsFromAttributes(el);
  const para = {
    children: [...el.childNodes]
      .map(child => convertInline(child, options))
      .flat(),
    ...options
  };
  return new Paragraph(para);
}

function convertInline(el, options) {
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'a') {
    // We're dealing with an anchor or a link
    if (el.hasAttribute('id')) {
      const id = el.getAttribute('id');
      if (bookmarks[id]) {
        return [...el.childNodes]
          .map(child => convertInline(child, options))
          .flat();
      }
      bookmarks[id] = true;
      return [new Bookmark({
        id,
        children: [...el.childNodes]
          .map(child => convertInline(child, options))
          .flat()
      })];
    }
    else {
      options = copyOptions(options);
      options.hyperlink = true;
      options.style = 'Hyperlink';
      if (el.getAttribute('href').startsWith('#')) {
        return [new InternalHyperlink({
          children: [...el.childNodes]
            .map(child => convertInline(child, options))
            .flat(),
          anchor: el.getAttribute('href').substring(1)
        })];
      }
      else {
        return [new ExternalHyperlink({
          children: [...el.childNodes]
            .map(child => convertInline(child, options))
            .flat(),
          link: el.href
        })];
      }
    }
  }
  else {
    // We're dealing with a <span> element
    const textrun = {
      text: el.textContent.replace(/\s+/g, ' '),
      ...getOptionsFromAttributes(el, options)
    };
    return [new TextRun(textrun)];
  }
}

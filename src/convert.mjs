/************************************************************
 * Conversion function that takes a flattened DOM tree as
 * input and converts it to a list of docx Paragraph
 ***********************************************************/

import fs from 'node:fs';
import { imageSize } from 'image-size';
import { appendRootNodes } from './append-root-nodes.mjs';
import { flattenDOM } from './flatten.mjs';
import { copyOptions } from './copy-options.mjs';
import {
  Paragraph,
  TextRun,
  InternalHyperlink,
  ExternalHyperlink,
  HeadingLevel,
  Bookmark,
  convertInchesToTwip,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  ImageRun
} from 'docx';


// Bookmark IDs that have already been created
const bookmarks = {};
const images = {};

export async function convertBody(body, doc = {}) {
  const children = body.children;

  const imgs = [...body.querySelectorAll('img')];
  for (const img of imgs) {
    if (images[img.src]) {
      continue;
    }
    if (img.src.startsWith('file://')) {
      images[img.src] = fs.readFileSync(img.src.replace(/^file:\/\//, ''));
    }
    else {
      const response = await fetch(img.src);
      images[img.src] = Buffer.from(await response.arrayBuffer());
    }
  }

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
  // TODO: Some of the paragraph styles may be combined in HTML
  // (e.g., a note may appear in a dd) but there is no way to combine
  // styles in the docx. We do code in the end because code text would end up
  // being justified otherwise, which isn't fantastic.
  if (el.hasAttribute('data-dt')) {
    options.style = 'Terms';
  }
  if (el.hasAttribute('data-dd')) {
    options.style = 'Definition';
  }
  if (el.hasAttribute('data-example')) {
    options.style = 'Example';
  }
  if (el.hasAttribute('data-note')) {
    options.style = 'Note';
  }
  if (el.hasAttribute('data-figure')) {
    options.style = 'Figure Title';
  }
  if (el.hasAttribute('data-figcaption')) {
    options.style = 'Figure Title';
  }
  if (el.hasAttribute('data-code')) {
    if (options.hyperlink) {
      options.style = 'CodeHyperlink';
    }
    else if (el.nodeName === 'P') {
      options.style = 'Code';
    }
    else {
      options.style = 'CodeInline';
    }
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
  if (el.hasAttribute('data-hasbullet')) {
    // TODO: handle numbering
    options.bullet = {
      level: parseInt(el.getAttribute('data-level'), 10)
    };
  }
  else if (el.hasAttribute('data-level')) {
    // TODO: indentation may need to be adjusted
    const level = parseInt(el.getAttribute('data-level'), 10);
    options.indent = {
      left: convertInchesToTwip(0.5 + (level - 1) * 0.25)
    };
  }
  return options;
}

function convertBlock(el) {
  const options = getOptionsFromAttributes(el);
  if (el.nodeName === 'TABLE') {
    const table = {
      alignment: AlignmentType.CENTER,
      rows: [...el.childNodes]
        .map(child => convertBlock(child, options))
        .flat()
        .filter(child => child instanceof TableRow),
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      ...options
    };
    return new Table(table);
  }
  if (el.nodeName === 'TR') {
    const row = {
      children: [...el.childNodes]
        .map(child => convertBlock(child, options))
        .flat()
        .filter(child => child instanceof TableCell),
      ...options
    };
    if (el.hasAttribute('data-header')) {
      row.tableHeader = true;
    }
    return new TableRow(row);
  }
  if (el.nodeName === 'TD') {
    const cell = {
      children: [...el.childNodes]
        .map(child => convertBlock(child, options))
        .flat(),
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      ...options
    };
    return new TableCell(cell);
  }
  
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
  else if (tagName === 'img') {
    // We're dealing with an <img> element
    const image = images[el.src];
    const dimensions = imageSize(image);
    const ratio = dimensions.width / dimensions.height;
    if (dimensions.width > 500) {
      dimensions.width = 500;
      dimensions.height = dimensions.width / ratio;
    }
    if (dimensions.height > 500) {
      dimensions.height = 500;
      dimensions.width = dimensions.height * ratio;
    }
    const imagerun = {
      type: el.src.match(/\.([^\.\/]+)$/)[1],
      data: image,
      transformation: {
        width: dimensions.width,
        height: dimensions.height
      },
      fallback: {}
    };
    if (el.hasAttribute('alt')) {
      // Docx has a "name", "title", and "description".
      // Not sure what the nuance is between these but all are required
      imagerun.altText = {
        name: el.getAttribute('alt'),
        title: el.getAttribute('alt'),
        description: el.getAttribute('alt')
      };
    }
    return [new ImageRun(imagerun)];
  }
  else if (tagName === 'br') {
    // We're dealing with a line break
    const textrun = {
      text: '',
      break: 1,
      ...getOptionsFromAttributes(el, options)
    };
    return [new TextRun(textrun)];
  }
  else {
    // We're dealing with a <span> element
    const lines = el.textContent.split(/\n/);
    const res = [];
    let firstLine = true;
    for (const line of lines) {
      const textrun = {
        text: line,
        ...getOptionsFromAttributes(el, options)
      };
      if (!firstLine) {
        textrun.break = 1;
      }
      res.push(new TextRun(textrun));
      firstLine = false;
    }
    return res;
  }
}

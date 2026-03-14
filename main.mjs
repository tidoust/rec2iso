/**
 * Convert a W3C Recommendation to something close to an ISO-compliant .docx
 * document.
 *
 * TODO:
 * - Create bookmarks for things with IDs
 * - Handle internal links
 * - Handle ordered lists
 * - Handle tables
 * - Handle images
 * - Handle <abbr>, <cite>, <q>
 * - Handle list items that have block content
 * - Convert absolute links to self to internal links if some exist
 * - Drop non-significant spaces, coz' they are significant in a .docx document :(
 * - Add styles for definition lists and handle them.
 * - Style examples properly
 * - Style notes properly
 * - Add the TOC
 * - Add the ISO boilerplate text (Foreword, copyright)
 * - Add metadata to the .docx document such as creator, title, and description
 * - Consider renumbering sections?
 * - Consider rewriting the references appendix to a more ISO-friendly format?
 * - Drop "This section is non-normative" in the Introduction section. That's
 * always the case for the Introduction section in ISO documents.
 * - Find a way to report spec editors. Any "acknowledgments" section would
 * appear in the ISO version, while not the list of editors. That seems wrong!
 * - Figure out what happens to custom styles during ISO publication. If they
 * get ignored, find another approach!
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  Header, Footer,
  TableOfContents, HeadingLevel,
  AlignmentType,
  UnderlineType
} from 'docx';
import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';

/************************************************************
 * Main loop
 ***********************************************************/
// The styles.xml is extracted from the ISO .dotx template
// (just rename the file to .zip, and get it from under the "word" folder)
const styles = await fs.readFile('./styles.xml', 'utf-8');

// Prepare the .docx document
// Two main sections: preamble content which includes the table of contents
// and the introduction. And the main content that starts with the spec title.
const doc = {
  externalStyles: styles,
  styles: {
    characterStyles: [
      {
        id: 'CodeInline',
        name: 'Code (inline)',
        basedOn: 'DefaultParagraphFont',
        run: {
          font: 'Courier New',
          size: 18
        }
      },
      {
        id: 'CodeHyperlink',
        name: 'Code with hyperlink',
        basedOn: 'DefaultParagraphFont',
        run: {
          font: 'Courier New',
          size: 18,
          color: '#0000FF',
          underline: {
            type: UnderlineType.SINGLE
          }
        }
      }
    ]
  },

  sections: [
    {
      children: []
    },
    {
      children: []
    }
  ]
};

// Load W3C Recommendation
const dom = await JSDOM.fromFile('wcag.html');


// Convert the W3C Recommendation
convertBody(dom.window.document.body);

// Serialize the .docx document
const docx = new Document(doc);

const buffer = await Packer.toBuffer(docx);
await fs.writeFile('wcag.docx', buffer);



/************************************************************
 * Conversion functions
 ***********************************************************/
function convertBody(body) {
  const children = body.children;

  for (const child of children) {
    if (child.className.includes('head')) {
      const docNodes = convertHead(child);
      appendRootNodes(docNodes);
    }
    else if (child.id === 'toc-nav') {
      continue;
    }
    else if (child.id === 'toc') {
      // Table of Contents needs to appear in the preamble
      const docNodes = convertTableOfcontents(child);
      appendRootNodes(docNodes, { preamble: true });
    }
    else if (child.id === 'abstract') {
      const docNodes = convertAbstract(child);
      appendRootNodes(docNodes);
    }
    else if (child.id === 'intro' || child.id === 'introduction') {
      // Introduction needs to appear in the preamble
      const docNodes = convertIntroduction(child);
      appendRootNodes(docNodes, { preamble: true });
    }
    else if (child.id === 'sotd') {
      continue;
    }
    else {
      const docNodes = convertNode(child);
      appendRootNodes(docNodes);
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
 * Convert a generic DOM node
 */
function convertNode(node, options) {
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
        console.log(node.nodeName);
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
    children: convertChildNodes(p)
  };
  if (options?.level === 0 || options?.level > 0) {
    para.bullet = {
      level: options.level
    };
  }
  if (options?.style) {
    para.style = options.style;
  }
  return new Paragraph(para);
}

// Do we need to do anything with a span?
function convertSpan(span, options) {
  return convertChildNodes(span, options);
}

function convertSub(node, options) {
  options = options ? Object.assign({}, options) : {};
  options.subScript = true;
  return convertChildNodes(node);
}

function convertSup(node, options) {
  options = options ? Object.assign({}, options) : {};
  options.superScript = true;
  return convertChildNodes(node);
}

/**
 * If the link is an internal link, a bookmark needs to be created.
 * Link is more direct otherwise.
 */
function convertLink(a, options) {
  // TODO: distinguish internal/external links
  options = options ? Object.assign({}, options) : {};
  options.hyperlink = true;
  return new ExternalHyperlink({
    children: convertChildNodes(a, options),
    link: a.href
  });
}

function convertHeading(h) {
  const level = h.nodeName.substring(1);
  if (level === '1') {
    // Why ISO, why?!?
    return new Paragraph({
      children: convertChildNodes(h),
      style: 'zzSTDTitle'
    });
  }
  else {
    return new Paragraph({
      children: convertChildNodes(h),
      heading: HeadingLevel['HEADING_' + level]
    });
  }
}

/**
 * Convert text with emphasis.
 *
 * Note: Main difficulty is that a TextRun in the .docx document cannot contain
 * children, so we need to "propagate" the emphasis to children
 */
function convertEm(em, options) {
  options = options ? Object.assign({}, options) : {};
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
  options = options ? Object.assign({}, options) : {};
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
  return new TextRun(textrun);
}


function convertOrderedList(node, options) {
  // TODO: handle numbers
  options = options ? Object.assign({}, options) : {};
  if (options.level === 0 || options.level > 0) {
    options.level += 1;
  }
  else {
    options.level = 0;
  }
  return convertChildren(node, options);
}

function convertUnorderedList(node, options) {
  options = options ? Object.assign({}, options) : {};
  if (options.level === 0 || options.level > 0) {
    options.level += 1;
  }
  else {
    options.level = 0;
  }
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
    return new Paragraph({
      children: docNodes,
      bullet: {
        level: options.level
      }
    });
  }
}

function convertCode(node, options) {
  options = options ? Object.assign({}, options) : {};
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
  return new Paragraph({
    children: convertChildNodes(node),
    style: 'Terms'
  });
}

function convertDefinitionDescription(node, options) {
  options = options ? Object.assign({}, options) : {};
  options.style = 'Definition';
  const docNodes = convertChildNodes(node, options);
  if (docNodes?.find(node => node instanceof Paragraph)) {
    return docNodes;
  }
  else {
    return new Paragraph({
      children: docNodes,
      style: 'Definition'
    });
  }
}

function convertDefinition(node, options) {
  options = options ? Object.assign({}, options) : {};
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

/**
 * Append a list of converted nodes to the main section of the
 * .docx document
 */
function appendRootNodes(nodes, options) {
  if (!nodes) {
    return;
  }
  nodes = Array.isArray(nodes) ? nodes : [nodes];
  if (nodes.length === 0) {
    return;
  }
  const sectionIdx = options?.preamble ? 0 : 1;
  let inlineruns = [];
  for (const node of nodes) {
    if (node instanceof Paragraph) {
      if (inlineruns.length > 0) {
        doc.sections[sectionIdx].children.push(
          new Paragraph({
            children: inlineruns
          })
        );
        inlineruns = [];
      }
      doc.sections[sectionIdx].children.push(node);
    }
    else {
      inlineruns.push(node);
    }
  }
  if (inlineruns.length > 0) {
    doc.sections[sectionIdx].children.push(
      new Paragraph({
        children: inlineruns
      })
    );
  }
}


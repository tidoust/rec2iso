/**
 * Convert a W3C Recommendation to something close to an ISO-compliant .docx
 * document.
 *
 * TODO:
 * - Handle ordered lists
 * - Handle tables
 * - Handle images
 * - Handle <abbr>, <cite>, <q>
 * - Convert absolute links to self to internal links if some exist
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
  Packer
} from 'docx';
import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import { dropNonSignificantWhitespaces } from './src/drop-whitespaces.mjs';
import { convertBody } from './src/convert.mjs';
import { createDocxParameters } from './src/create-docx-parameters.mjs';


/************************************************************
 * Main loop
 ***********************************************************/
// Read the shortname of the W3C Recommendation to convert
const shortname = process.argv[2];
const url = `https://www.w3.org/TR/${shortname}/`;

// Load W3C Recommendation
// (file version in comment is for debugging)
//const dom = await JSDOM.fromURL(url);
const dom = await JSDOM.fromFile(`${shortname}.html`);

// Drop non-significant whitespaces to ease conversion
dropNonSignificantWhitespaces(dom.window.document.body);

// Convert the W3C Recommendation
const doc = createDocxParameters();
convertBody(dom.window.document.body, doc);

// Serialize the .docx document
const docx = new Document(doc);
const buffer = await Packer.toBuffer(docx);
await fs.writeFile(`${shortname}.docx`, buffer);

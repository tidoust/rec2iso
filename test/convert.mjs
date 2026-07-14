import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import { convertBody } from '../src/convert.mjs';
import { createDocxParameters } from '../src/create-docx-parameters.mjs';
import { dropNonSignificantWhitespaces } from '../src/drop-whitespaces.mjs';
import { JSDOM } from 'jsdom';
import { Document, Packer } from 'docx';

describe('Conversion', () => {
  it('preserves significant whitespaces', async () => {
    const html = `<div>
      <p>For <a href="#dfn-prerecorded" id="ref-for-dfn-prerecorded-8">prerecorded</a>
       <a href="#dfn-audio" id="ref-for-audio-2">audio</a>, there is something fishy.</p>
      <p><dfn id="dfn-prerecorded">prerecorded</dfn> is a cool concept about prerecording.</p>
      <p><dfn id="dfn-audio">audio</dfn> makes some noise.</p>
    </div>`;

    /*const html = `
      <p><strong>Sufficient and Advisory Techniques</strong> - For each of the <em>guidelines</em>.</p>
    `;*/

    const dom = new JSDOM(html);
    dropNonSignificantWhitespaces(dom.window.document.body);
    const doc = createDocxParameters();
    convertBody(dom.window.document.body, doc);
    const docx = new Document(doc);
    const buffer = await Packer.toBuffer(docx);
    await fs.writeFile(`test.docx`, buffer);
  });
});
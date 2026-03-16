/**
 * Patch the docx library to support adding custom styles on top of external
 * styles.
 *
 * THIS IS UGLY! Ideally, docx would support that feature. Hot patching is just
 * more convenient for now until we figure out how to upstream the change to
 * the source code.
 */

import * as fs from 'fs/promises';

// This changes line 18289 in v9.6.1 of docx
const filename = 'node_modules/docx/dist/index.mjs';
const initial = await fs.readFile(filename, 'utf8');
const patched = initial.replace(
  '__spreadProps(__spreadValues({}, externalStyles)',
  '__spreadProps(__spreadValues(__spreadValues({}, externalStyles), options.styles)'
);
await fs.writeFile(filename, patched, 'utf8');
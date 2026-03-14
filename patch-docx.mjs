/**
 * Patch the docx library to support adding custom styles on top of external
 * styles.
 *
 * THIS IS UGLY! Ideally, docx would have some support for that feature but:
 * I haven't looked at how to build the docx code from the source. Hot patching
 * the result of the build is just more convenient for now.
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
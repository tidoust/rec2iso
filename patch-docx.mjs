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
let patched = initial.replace(
  '__spreadProps(__spreadValues({}, externalStyles)',
  '__spreadProps(__spreadValues(__spreadValues({}, externalStyles), options.styles)'
);

patched = patched.replace(
  `
    if (options.children) {
      for (const child of options.children) {
        if (child instanceof Bookmark) {
          this.root.push(child.start);
          for (const textRun of child.children) {
            this.root.push(textRun);
          }
          this.root.push(child.end);
          continue;
        }
        this.root.push(child);
      }
    }
  `,
  `
    function processBookmark(node, root) {
      root.push(node.start);
      for (const child of node.children) {
        if (child instanceof Bookmark) {
          processBookmark(child, root);
        }
        else {
          root.push(child);
        }
      }
      root.push(node.end);
    }
    if (options.children) {
      for (const child of options.children) {
        if (child instanceof Bookmark) {
          processBookmark(child, this.root);
          continue;
        }
        this.root.push(child);
      }
    }
  `
);

await fs.writeFile(filename, patched, 'utf8');
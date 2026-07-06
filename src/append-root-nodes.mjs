import { Paragraph } from 'docx';

/**
 * Append a list of converted nodes to the main section of the .docx document,
 * represented by the Document instance passed as second parameter.
 *
 * The function also accepts a single node as first parameter instead of a list
 * of nodes.
 */
export function appendRootNodes(nodes, doc, options) {
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

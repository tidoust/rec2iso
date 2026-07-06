/************************************************************
 * Remove non-significant whitespaces from a DOM tree.
 ***********************************************************/
export function dropNonSignificantWhitespaces(root) {
  const inlineElements = [
    'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'ruby',
    'rt', 'rp', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup',
    'i', 'b', 'u', 'mark', 'bdi', 'bdo', 'span', 'br', 'wbr'
  ];
  const iterator = root.ownerDocument.createNodeIterator(root);
  let node;
  while (node = iterator.nextNode()) {
    // Whitespaces appear in text nodes
    if (node.nodeType === 3) {
      const parent = node.parentNode;
      if (parent.nodeName === 'PRE') {
        continue;
      }
      node.textContent = node.textContent.replace(/\s+/g, ' ');
      const isBlockParent = !inlineElements.includes(parent.nodeName.toLowerCase());
      if (isBlockParent) {
        node.textContent.trim();
      }
      if (!node.textContent) {
        node.remove();
      }
      if (isBlockParent && node.textContent === ' ') {
        node.remove();
      }
    }
  }
}

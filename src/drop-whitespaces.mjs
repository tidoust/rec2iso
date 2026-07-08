/************************************************************
 * Remove non-significant whitespaces from a DOM tree.
 ***********************************************************/
export function dropNonSignificantWhitespaces(root) {
  const inlineElements = [
    'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'ruby',
    'rt', 'rp', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup',
    'i', 'b', 'u', 'mark', 'bdi', 'bdo', 'span', 'br', 'wbr'
  ];
  const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };

  /**
   * Count the number of updates made in a given walk
   * (code will run till there are updates to make)
   */
  let updatesMade = 0;

  /**
   * Trim the start or the end of the given node.
   *
   * To trim a node:
   * - If the node is a block node, do nothing.
   * - If the node is a text node, trimStart/trimEnd the text.
   *   If the node becomes empty, remove it and trim the next sibling.
   * - If the node is an inline element, trim its first child.
   * - If the node is not an element or is already marked for removal, do nothing.
   *
   * Note: nodes that need removal are flagged as such but not removed so that
   * any potential for loop can continue to operate.
   */
  function trimNode(node, what) {
    if (!node) {
      return;
    }
    if (node._remove) {
      return trimNode(node.nextSibling, what);
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const trimmed = what === 'start' ?
        node.textContent.trimStart() :
        node.textContent.trimEnd();
      if (node.textContent !== trimmed) {
        node.textContent = trimmed;
        if (trimmed === '') {
          node._remove = true;
        }
        updatesMade += 1;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const nodeName = node.nodeName.toLowerCase();
    if (!inlineElements.includes(nodeName)) {
      return;
    }
    return trimNode(node.firstChild, what);
  }

  /**
   * Recursively walk a node to drop whitespaces.
   *
   * If all children end up being removed (or rather flagged for removal), the
   * block itself is flagged for removal.
   *
   * Note: the function does not remove the nodes flagged for removal.
   */
  function walk(node) {
    if (node._remove) {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent.replace(/\s+/g, ' ');
      if (node.textContent !== textContent) {
        node.textContent = textContent;
        updatesMade += 1;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const nodeName = node.nodeName.toLowerCase();
    if (inlineElements.includes(nodeName)) {
      walkInline(node);
    }
    else {
      // Preserve whitespaces when needed
      if (['pre', 'style', 'script'].includes(nodeName)) {
        return;
      }
      walkBlock(node);
    }

    for (const child of [...node.childNodes]) {
      walk(child);
    }

    if ([...node.childNodes].every(child => child._remove)) {
      if (!node._remove) {
        node._remove = true;
        updatesMade += 1;
      }
    }
  }

  /**
   * Process a block node
   *
   * A block node triggers the following actions:
   * 1. trimEnd of the previous sibling
   * 2. trimStart of the next sibling
   * 3. trimStart of the first child
   * 4. trimEnd of the last child
   */
  function walkBlock(node) {
    if (node.previousSibling) {
      trimNode(node.previousSibling, 'end');
    }
    if (node.nextSibling) {
      trimNode(node.nextSibling, 'start');
    }
    trimNode(node.firstChild, 'start');
    trimNode(node.lastChild, 'end');
  }

  /**
   * Process an inline node
   *
   * If the inline node ends with a space and its next sibling starts with a
   * space, trim the end of the inline node.
   */
  function walkInline(node) {
    if (node.textContent.match(/\s$/) &&
        node.nextSibling?.textContent.match(/^\s/)) {
      trimNode(node, 'end');
    }
  }

  /**
   * Recursively remove empty nodes
   */
  function removeEmptyNodes(node) {
    let currentNode;
    const iterator = node.ownerDocument.createNodeIterator(node);
    while (currentNode = iterator.nextNode()) {
      if (currentNode._remove) {
        currentNode.remove();
      }
    }
  }

  // Note: We may not need to do more than one pass in practice.
  while (true) {
    updatesMade = 0;
    walk(root);
    console.warn(`updates made: ${updatesMade}`);
    if (updatesMade === 0) {
      break;
    }
    removeEmptyNodes(root);
  }
}

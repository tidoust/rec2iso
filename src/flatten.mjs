const DEBUG = false;

/**
 * Flattens a DOM tree to a list of <p> elements with simplified semantics.
 * Follows rules from rules.md
 */
export function flattenDOM(element) {
  const document = element.ownerDocument;
  const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };

  function log(msg) {
    if (DEBUG) {
      console.warn(msg);
    }
  }

  /**
   * Create a span with text and data attributes
   * that apply to inline content
   */
  function createSpan(text, attrs = {}) {
    const span = document.createElement('span');
    span.textContent = text;
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined && value !== false) {
        span.setAttribute(key, '');
      }
    }
    return span;
  }

  const idsAlreadySet = [];
  function wrapWithId(els, id) {
    if (!id || id.startsWith('ref-for-')) {
      return els;
    }
    if (idsAlreadySet.includes(id)) {
      return els;
    }
    idsAlreadySet.push(id);

    const anchor = document.createElement('a');
    anchor.setAttribute('id', id);

    if (els.length > 1 && els.find(el => el.nodeName.toLowerCase() === 'p')) {
      // Multiple elements including at least one block content,
      // best we can do is to associate the ID with the first element
      if (els[0].nodeName.toLowerCase() === 'p') {
        // Dealing with a block, anchor needs to go inside it.
        for (const child of Array.from(els[0].childNodes)) {
          anchor.appendChild(child);
        }
        els[0].appendChild(anchor);
        return els;
      }
      else {
        // Dealing with a span (and/or another anchor),
        // wrap it into the new anchor
        anchor.appendChild(els[0]);
        els[0] = anchor;
        return els;
      }
    }
    else {
      // Seems we can wrap everything.
      if (els[0].nodeName.toLowerCase() === 'p') {
        // Dealing with a block, anchor needs to go inside it.
        for (const child of Array.from(els[0].childNodes)) {
          anchor.appendChild(child);
        }
        els[0].appendChild(anchor);
        return els;
      }
      else {
        // Dealing with spans (and/or other anchors),
        // wrap them into the new anchor
        for (const el of els) {
          anchor.appendChild(el);
        }
        return [anchor];
      }
    }
  }

  /**
   * Check if a node is empty (no text content and no children with content)
   */
  function isEmpty(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return !node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    
    // Check if element has any non-empty children
    for (const child of node.childNodes) {
      if (!isEmpty(child)) return false;
    }
    return true;
  }

  /**
   * Process a node recursively
   */
  function processNode(node, context = {}) {
    const {
      inAnchorWithHref = false,
      blockAttrs = {},
      inlineAttrs = {},
      nestedLevel = 0,
      listItemIndex = 0,
      listType = 'ul'
    } = context;

    // Handle text nodes - wrap in span
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!text) return [];
      log(`- text content: ${node.textContent.substring(0, 42)}`);
      return [createSpan(text, inlineAttrs)];
    }

    // Skip non-text, non-element nodes
    if (node.nodeType !== Node.ELEMENT_NODE) {
      log(`- skip element, type is: ${node.nodeType}`);
      return [];
    }

    // Skip hidden elements
    if (node.hasAttribute('hidden')) {
      log(`- skip hidden element`);
      return [];
    }

    // Skip style and script elements
    const nodeName = node.nodeName.toLowerCase();
    if (nodeName === 'style' || nodeName === 'script') {
      log(`- skip non content element`);
      return [];
    }

    // Handle empty elements with ID
    // (report them, we'll handle them when finalizing the structure)
    const elementId = node.hasAttribute('id') ? node.getAttribute('id') : null;
    if (elementId && isEmpty(node)) {
      if (elementId.startsWith('ref-for-')) {
        log(`- skip ref ID`);
        return [];
      }
      log(`- empty anchor ID: ${node.getAttribute('id')}`);
      return [{ type: 'EMPTY_ANCHOR_ID', id: node.getAttribute('id') }];
    }

    // Skip content that can be ignored
    const skippableTags = ['caption'];
    if (skippableTags.includes(nodeName)) {
      log(`- skip skippable tag ${nodeName}`);
      return [];
    }

    // Skip complex structures for now
    const complexTags = ['tfoot',
                         'img', 'svg', 'canvas', 'video', 'audio',
                         'iframe', 'object', 'embed', 'math'];
    if (complexTags.includes(nodeName)) {
      log(`- todo: ${nodeName}`);
      const p = document.createElement('p');
      p.appendChild(createSpan(`TODO: ${nodeName} content`, inlineAttrs));
      return wrapWithId([p], elementId);
    }

    // Skip empty elements
    if (isEmpty(node)) {
      log(`- skip empty element`);
      return [];
    }

    // Build new attribute context
    const newBlockAttrs = { ...blockAttrs };
    const newInlineAttrs = { ...inlineAttrs };
    let newNestedLevel = nestedLevel;
    let newListItemIndex = listItemIndex;
    let newListType = listType;

    // Apply formatting rules (12-16, 19-21)
    switch (nodeName) {
      case 'sub': newInlineAttrs['data-subscript'] = true; break;
      case 'sup': newInlineAttrs['data-superscript'] = true; break;
      case 'i':
      case 'em': newInlineAttrs['data-italics'] = true; break;
      case 'b':
      case 'strong':
      case 'dfn': newInlineAttrs['data-bold'] = true; break;
      case 'code': newInlineAttrs['data-code'] = true; break;
      case 'pre': newBlockAttrs['data-code'] = true; break;
      case 'dt': newBlockAttrs['data-dt'] = true; break;
      case 'dd': newBlockAttrs['data-dd'] = true; break;
      case 'figure': newBlockAttrs['data-figure'] = true; break;
      case 'figcaption': newBlockAttrs['data-figcaption'] = true; break;
    }

    if ([...node.classList].includes('example')) {
      newBlockAttrs['data-example'] = true;
    }
    if ([...node.classList].includes('note')) {
      newBlockAttrs['data-note'] = true;
    }

    // Check for heading
    const headingMatch = nodeName.match(/^h([1-6])$/);
    const headingLevel = headingMatch ? parseInt(headingMatch[1], 10) : null;

    function processAndAddChildren(childNodes, element) {
      const children = [];
      for (const child of childNodes) {
        children.push(...processNode(child, {
          inAnchorWithHref,
          blockAttrs: newBlockAttrs,
          inlineAttrs: newInlineAttrs,
          nestedLevel: newNestedLevel,
          listItemIndex: newListItemIndex,
          listType: newListType
        }));
      }
      const ids = children.filter(child => child.type === 'EMPTY_ANCHOR_ID');
      let result = children.filter(child => !child.type);
      for (const id of ids) {
        result = wrapWithId(result, id);
      }
      if (element) {
        for (const child of result) {
          element.appendChild(child);
        }
        return wrapWithId([element], elementId);
      }
      else {
        return wrapWithId(result, elementId);
      }
    }

    // Handle tables
    if (nodeName === 'table') {
      const table = document.createElement('table');
      return processAndAddChildren(node.childNodes, table);
    }
    if (nodeName === 'thead') {
      newBlockAttrs['data-header'] = true;
      return processAndAddChildren(node.childNodes, null);
    }
    if (nodeName === 'tbody') {
      return processAndAddChildren(node.childNodes, null);
    }
    if (nodeName === 'tr') {
      const row = document.createElement('tr');
      if (newBlockAttrs['data-header']) {
        row.setAttribute('data-header', '');
      }
      return processAndAddChildren(node.childNodes, row);
    }

    // Handle list items
    if (nodeName === 'li') {
      const parentList = node.parentElement;
      newNestedLevel += 1;
      newListType = parentList.nodeName.toLowerCase();
      newListItemIndex = Array.from(parentList.children).indexOf(node) + 1;
    }

    // Handle anchor elements
    if (nodeName === 'a') {
      const hasHref = node.hasAttribute('href') &&
        ![...node.classList].includes('self-link');
      if ((inAnchorWithHref && hasHref) || !hasHref) {
        // Nested anchor with href, or anchor that sets an ID
        // Ignore the link, process children instead
        log(`- skip nested/ID anchor`);
        const children = [];
        for (const child of node.childNodes) {
          children.push(...processNode(child, {
            ...context,
            blockAttrs: newBlockAttrs,
            inlineAttrs: newInlineAttrs,
            nestedLevel,
            listItemIndex,
            listType
          }));
        }
        const ids = children.filter(child => child.type === 'EMPTY_ANCHOR_ID');
        let result = children.filter(child => !child.type);
        for (const id of ids) {
          result = wrapWithId(result, id);
        }
        return wrapWithId(result, elementId);
      }

      log(`- link`);
      const a = document.createElement('a');
      a.setAttribute('href', node.getAttribute('href'));
      const children = [];
      for (const child of node.childNodes) {
        children.push(...processNode(child, {
          ...context,
          inAnchorWithHref: true,
          blockAttrs: newBlockAttrs,
          inlineAttrs: newInlineAttrs,
          nestedLevel,
          listItemIndex,
          listType
        }));
      }
      const ids = children.filter(child => child.type === 'EMPTY_ANCHOR_ID');
      let result = children.filter(child => !child.type);
      for (const id of ids) {
        result = wrapWithId(result, id);
      }
      for (const child of result) {
        a.appendChild(child);
      }
      return wrapWithId([a], elementId);
    }

    // Process children
    const result = processAndAddChildren(node.childNodes, null);

    // Determine if this should create a paragraph
    const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'pre',
                       'div', 'section', 'article', 'header', 'footer', 'aside', 'main',
                       'nav', 'blockquote', 'address', 'body', 'html',
                       'figure', 'figcaption', 'th', 'td'];
    const shouldCreateParagraph = blockTags.includes(nodeName);
    if (shouldCreateParagraph) {
      // Processed children may contain a bunch of <p> elements, mixed with
      // <span> and <a> elements. Any <p> should be surfaced as-is, while
      // continuous <span> need to be wrapped into a new <p>.
      const flatChildren = [];
      function addParagraph(p) {
        // Apply heading attribute
        if (headingLevel) {
          p.setAttribute('data-heading', headingLevel);
        }
        if (newListItemIndex) {
          if (p.hasAttribute('data-listindex')) {
            if (p.hasAttribute('data-hasbullet') &&
                p.getAttribute('data-level') === ('' + newNestedLevel)) {
              p.removeAttribute('data-hasbullet');
            }
          }
          else {
            p.setAttribute('data-listtype', newListType);
            p.setAttribute('data-level', newNestedLevel);
            p.setAttribute('data-listindex', newListItemIndex);
          }
        }
        for (const [key, value] of Object.entries(newBlockAttrs)) {
          if (value !== undefined && value !== false &&
              key !== 'data-header') {
            p.setAttribute(key, '');
          }
        }
        flatChildren.push(p);
      }

      let currentParagraph = null;
      for (const child of result) {
        const childName = child.nodeName.toLowerCase();
        if (['p', 'table', 'tr', 'td'].includes(childName)) {
          if (currentParagraph) {
            addParagraph(currentParagraph);
            currentParagraph = null;
          }
          addParagraph(child);
        }
        else {
          if (!currentParagraph) {
            currentParagraph = document.createElement('p');
          }
          currentParagraph.appendChild(child);
        }
      }
      if (currentParagraph) {
        addParagraph(currentParagraph);
        currentParagraph = null;
      }
      // Set the "data-hasbullet" attribute to the first paragraph in a list
      const listChildren = flatChildren.filter(child =>
        child.getAttribute('data-level') === ('' + newNestedLevel) &&
        child.hasAttribute('data-listindex'));
      let lastSeenIndex = '';
      for (const child of listChildren) {
        const index = child.getAttribute('data-listindex');
        if (index === lastSeenIndex) {
          continue;
        }
        lastSeenIndex = index;
        child.setAttribute('data-hasbullet', '');
      }
      log(`- paragraphs created`);

      if (nodeName === 'th' || nodeName === 'td') {
        log(`- wrap them in a table cell`);
        const cell = document.createElement('td');
        for (const child of flatChildren) {
          cell.appendChild(child);
        }
        return wrapWithId([cell], elementId);
      }
      return wrapWithId(flatChildren, elementId);
    }

    // Inline content got converted to <span> elements already,
    // no need to do more than potentially wrapping them in an
    // anchor with an ID.
    log(`- inline content created`);
    return wrapWithId(result, elementId);
  }

  // Process the root element
  const processed = processNode(element, {});
  return processed;
}

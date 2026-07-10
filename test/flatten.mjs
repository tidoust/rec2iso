import { describe, it } from 'node:test';
import assert from 'node:assert';
import { flattenDOM } from '../src/flatten.mjs';
import { JSDOM } from 'jsdom';

function run(html) {
  const dom = new JSDOM(html);
  const flat = flattenDOM(dom.window.document.body);
  return flat.map(el => el.outerHTML).join('\n');
}

function assertResult(html, expected) {
  const result = run(html);
  assert.deepStrictEqual(
    result,
    Array.isArray(expected) ? expected.join('\n') : expected
  );
}

describe('The flattening algorithm', () => {
  it('flattens a basic div with text', () => {
    const html = '<div>Hello world</div>';
    assertResult(html, '<p><span>Hello world</span></p>');
  });

  it('reports the heading level', () => {
    const html = '<h2>Hello world</h2>';
    assertResult(html, '<p data-heading="2"><span>Hello world</span></p>');
  });

  it('preserves bold and italic content', () => {
    const html = '<div><b>Hello</b> <i>world</i></div>';
    assertResult(html, '<p><span data-bold="">Hello</span><span> </span><span data-italics="">world</span></p>');
  });

  it('skips hidden elements', () => {
    const html = '<div><p>Visible</p><p hidden>Hidden</p><p>Visible again</p></div>';
    assertResult(html, ['<p><span>Visible</span></p>', '<p><span>Visible again</span></p>']);
  });

  it('skips style and script elements', () => {
    const html = '<div><style>.foo { display: none }</style><script>const toto=0;</script></div>';
    assertResult(html, '');
  });

  it('converts an ID to an anchor', () => {
    const html = '<p id="foo">bar</p>';
    assertResult(html, '<p><a id="foo"><span>bar</span></a></p>');
  });

  it('preserves links', () => {
    const html = '<p><a href="#bar">bar</a></p>';
    assertResult(html, '<p><a href="#bar"><span>bar</span></a></p>');
  });

  it('skips ref-for IDs', () => {
    const html = '<p><a id="ref-for-foo">bar</a></p>';
    assertResult(html, '<p><span>bar</span></p>');
  });

  it('creates an anchor and a link when both are combined', () => {
    const html = '<p><a id="foo" href="#bar">bar</a></p>';
    assertResult(html, '<p><a id="foo"><a href="#bar"><span>bar</span></a></a></p>');
  });

  it('does not nest spans', () => {
    const html = '<p><b><i>foo</i></b></p>';
    assertResult(html, '<p><span data-bold="" data-italics="">foo</span></p>');
  });

  it('reports sub/sup scripts', () => {
    const html = '<p><sub>foo</sub> <sup>bar</sup></p>';
    assertResult(html, '<p><span data-subscript="">foo</span><span> </span><span data-superscript="">bar</span></p>');
  });

  it('reports code and pre blocks', () => {
    const html = '<div><p>Some <code>code</code>.</p><pre>And a pre</pre></div>';
    assertResult(html, [
      '<p><span>Some </span><span data-code="">code</span><span>.</span></p>',
      '<p><span data-code="">And a pre</span></p>'
    ]);
  });

  it('reports definition terms and definitions', () => {
    const html = '<dl><dt>A term</dt><dd>A definition</dd></dl>';
    assertResult(html, [
      '<p><span data-dt="">A term</span></p>',
      '<p><span data-dd="">A definition</span></p>'
    ]);
  });

  it('formats dfns', () => {
    const html = '<p>The <dfn id="foo">foo</dfn> concept.</p>';
    assertResult(html, '<p><span>The </span><a id="foo"><span data-bold="">foo</span></a><span> concept.</span></p>')
  });

  it('flattens a simple unordered list', () => {
    const html = '<ul><li>first</li><li>second</li><li>third</li></ul>';
    assertResult(html, [
      '<p data-listtype="ul" data-level="1" data-listindex="1" data-hasbullet=""><span>first</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="2" data-hasbullet=""><span>second</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="3" data-hasbullet=""><span>third</span></p>'
    ]);
  });

  it('flattens a simple ordered list', () => {
    const html = '<ol><li>first</li><li>second</li><li>third</li></ol>';
    assertResult(html, [
      '<p data-listtype="ol" data-level="1" data-listindex="1" data-hasbullet=""><span>first</span></p>',
      '<p data-listtype="ol" data-level="1" data-listindex="2" data-hasbullet=""><span>second</span></p>',
      '<p data-listtype="ol" data-level="1" data-listindex="3" data-hasbullet=""><span>third</span></p>'
    ]);
  });

  it('flattens a nested unordered list', () => {
    const html = '<ul><li>first</li><li>' +
      '<ul><li>foo</li><li>bar</li></ul>' +
      '</li><li>third</li></ul>';
    assertResult(html, [
      '<p data-listtype="ul" data-level="1" data-listindex="1" data-hasbullet=""><span>first</span></p>',
      '<p data-listtype="ul" data-level="2" data-listindex="1" data-hasbullet=""><span>foo</span></p>',
      '<p data-listtype="ul" data-level="2" data-listindex="2" data-hasbullet=""><span>bar</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="3" data-hasbullet=""><span>third</span></p>'
    ]);
  });

  it('flattens a nested ordered list', () => {
    const html = '<ol><li>first</li><li>' +
      '<ol><li>foo</li><li>bar</li></ol>' +
      '</li><li>third</li></ol>';
    assertResult(html, [
      '<p data-listtype="ol" data-level="1" data-listindex="1" data-hasbullet=""><span>first</span></p>',
      '<p data-listtype="ol" data-level="2" data-listindex="1" data-hasbullet=""><span>foo</span></p>',
      '<p data-listtype="ol" data-level="2" data-listindex="2" data-hasbullet=""><span>bar</span></p>',
      '<p data-listtype="ol" data-level="1" data-listindex="3" data-hasbullet=""><span>third</span></p>'
    ]);
  });

  it('flattens a complex nested list', () => {
    const html = '<ul><li>first</li><li>' +
      '<ol><li>foo</li><li>bar</li></ol>' +
      '</li><li>third</li></ul>';
    assertResult(html, [
      '<p data-listtype="ul" data-level="1" data-listindex="1" data-hasbullet=""><span>first</span></p>',
      '<p data-listtype="ol" data-level="2" data-listindex="1" data-hasbullet=""><span>foo</span></p>',
      '<p data-listtype="ol" data-level="2" data-listindex="2" data-hasbullet=""><span>bar</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="3" data-hasbullet=""><span>third</span></p>'
    ]);
  });

  it('flattens a list item with a paragraph', () => {
    const html = '<ul><li><p>first paragraph</p></li></ul>';
    assertResult(html, [
      '<p data-listtype="ul" data-level="1" data-listindex="1" data-hasbullet=""><span>first paragraph</span></p>'
    ]);
  });

  it('flattens a list item with multiple paragraphs', () => {
    const html = '<ul><li><p>first paragraph</p><p>second paragraph</p></li></ul>';
    assertResult(html, [
      '<p data-listtype="ul" data-level="1" data-listindex="1" data-hasbullet=""><span>first paragraph</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="1"><span>second paragraph</span></p>'
    ]);
  });

  it('flattens a super complex list', () => {
    const html = '<ul><li>1.1<p>1.2</p><p>1.3</p></li><li><ol><li><p>2.1</p><p>2.2</p></li></ol></li><li>3.1</li></ul>';
    assertResult(html, [
      '<p data-listtype="ul" data-level="1" data-listindex="1" data-hasbullet=""><span>1.1</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="1"><span>1.2</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="1"><span>1.3</span></p>',
      '<p data-listtype="ol" data-level="2" data-listindex="1" data-hasbullet=""><span>2.1</span></p>',
      '<p data-listtype="ol" data-level="2" data-listindex="1"><span>2.2</span></p>',
      '<p data-listtype="ul" data-level="1" data-listindex="3" data-hasbullet=""><span>3.1</span></p>'
    ]);
  });
});
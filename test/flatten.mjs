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
    const html = '<p id="foo" href="#bar">bar</p>';
    assertResult(html, '<p><a id="foo"><a href="#bar"><span>bar</span></a></a></p>');
  });

  it('skips inner links', () => {
    const html = '<p><a href="#outer">The <a href="#inner">inner link</a> is ignored.</a></p>';
    assertResult(html, '<p><a href="#outer"><span>The inner link is ignored.</span></p>');
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
    assertResult(html, '<p><span>Some </span><span data-code="">code</span><span>.</span></p>\n<p><span data-code="">And a pre</span></p>');
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
});
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { dropNonSignificantWhitespaces } from '../src/drop-whitespaces.mjs';
import { JSDOM } from 'jsdom';

function parse(html) {
  const dom = new JSDOM(html);
  dropNonSignificantWhitespaces(dom.window.document.body);
  return dom.window.document.body.innerHTML;
}

function assertResult(html, expected) {
  const dom = new JSDOM(html);
  dropNonSignificantWhitespaces(dom.window.document.body);
  const result = dom.window.document.body?.innerHTML ?? '';
  assert.deepStrictEqual(result, expected);
}

describe('The non-significant whitespaces handler', () => {
  it('removes leading and trailing whitespace from text nodes', () => {
    const html = '<div>  Hello world   </div>';
    assertResult(html, '<div>Hello world</div>');
  });
  
  it('collapses multiple consecutive spaces to single space', () => {
    const html = '<div>Hello    world</div>';
    assertResult(html, '<div>Hello world</div>');
  });
  
  it('removes whitespace-only text nodes', () => {
    const html = '<div><p>Hello</p>   <p>world</p></div>';
    assertResult(html, '<div><p>Hello</p><p>world</p></div>')
  });
  
  it('collapses newlines and tabs to spaces', () => {
    const html = '<div> <span>Hello\n\nworld\t</span>\n\n</div>';
    assertResult(html, '<div><span>Hello world</span></div>');
  });
  
  it('preserves whitespace in pre elements', () => {
    const html = '<pre>  Hello\n    world\n</pre>';
    assertResult(html, html);
  });

  it('handles whitespaces between inline elements', () => {
    const html = '<p> <span>Hello</span><span>   </span><span>world</span> </p>';
    assertResult(html, '<p><span>Hello</span><span> </span><span>world</span></p>');
  });
    
  it('drops an simple empty element', () => {
    const html = '<div> </div>';
    assertResult(html, '');
  });

  it('drops nested empty elements', () => {
    const html = `<div>
        <p> </p>
        <span> </span>
        <p>  </p>
      </div>`;
    assertResult(html, '');
  });

  it('preserves non-empty content', () => {
    const html = `<div>
        <p> </p>
        <span> </span>
        <p> Hello world </p>
      </div>`;
    assertResult(html, '<div><p>Hello world</p></div>');
  });
});
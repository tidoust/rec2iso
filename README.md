# Convert a W3C Recommendation to an ISO compliant document

Node.js command-line interface to convert a [W3C Recommendation](https://www.w3.org/TR/?filter-tr-name=&status%5B%5D=standard) into a `.docx` document that is as close as possible to a document that may be submitted to ISO as part of a [PAS transposition process](https://www.w3.org/guide/process/pas-transposition-process.html).

> [!NOTE]
> This is an early hardly functional prototype!

## How to use

### Installation

1. Make sure you have a recent version of [Node.js](https://nodejs.org/en/).
2. Clone the repository
3. Install dependencies: `npm ci`

> [!NOTE]
> Installation of dependencies will also patch the docx library that the code depends on. The patch is needed to make it possible to define additional custom styles on top of the ISO styles that the Word template defines.


### Usage

Run:

```bash
node main.mjs [url] > [file].docx
```

... where `[url]` is the URL of a W3C Recommendation that you would like to convert. The command will fetch the Recommendation and convert it to an `output.docx` document in the same folder.

For example:

```bash
node main.mjs https://www.w3.org/TR/WCAG22/
```

## Implementation notes

### Format considerations

Difficulties that arise when converting the HTML document are due to the structural differences between the HTML and docx formats. In particular:

- HTML has sectioning (and assimilated) elements, including `<aside>`, `<div>`, `<section>`, and sections can be nested. The docx format has sections, but they are used to split page layouts (e.g., portrait/landscape). The docx format is just a flat list of paragraphs otherwise (instances of [`Paragraph`](https://docx.js.org/#/usage/paragraph) in the docx library).
- HTML is flexible when it comes to mixing *block* and *inline* content. For example, `<div>` and `<li>` may contain inline content and/or block content. The docx format is again just a flat list of paragraphs, each paragraph containing inline content (instances of [`TextRun`](https://docx.js.org/#/usage/text?id=text-runs), [`SymbolRun`](https://docx.js.org/#/usage/symbols?id=symbol-runs), or [`ImageRun`](https://docx.js.org/#/usage/images?id=images) for the raw content).
- HTML also supports nesting of inline content, such as wrapping `<code>` into a `<b>` element. The docx format has limited support for nesting. A `TextRun` cannot be nested into another `TextRun`. It still has a few classes to wrap inline content, including [`Hyperlink`](https://docx.js.org/#/usage/hyperlinks) and [`Bookmark`](https://docx.js.org/#/usage/bookmarks?id=bookmarks).
- HTML has non-significant whitespaces. All whitespaces are significant in the docx format.
- HTML supports setting more than one style class per element. The docx format does not, and separates between paragraph and character styles.

### How to update ISO styles

The `styles.xml` file is extracted from the [Word template for ISO standards](https://www.iso.org/iso-templates.html). To re-generate or update the file:

1. Download the [Word template for ISO standards](https://www.iso.org/iso-templates.html)
2. Rename the file to `[name].zip` (the docx format is a ZIP archive in practice).
3. Extract the `word/styles.xml` file from the resulting ZIP file.


## Relevant links

- [Word template for ISO standards](https://www.iso.org/iso-templates.html)
- [ISO/IEC Directives, Part 2](https://www.iso.org/sites/directives/current/part2/index.xhtml)
- [W3C's PAS transposition process](https://www.w3.org/guide/process/pas-transposition-process.html)
- the [docx Node.js library](https://docx.js.org/#/)

# Convert a W3C Recommendation to an ISO compliant document

Node.js command-line interface to convert a [W3C Recommendation](https://www.w3.org/TR/?filter-tr-name=&status%5B%5D=standard) into a `.docx` document that is as close as possible to a document that may be submitted to ISO as part of a [PAS transposition process](https://www.w3.org/guide/process/pas-transposition-process.html).

> [!NOTE]
> This is an early project, read [Known limitations](#known-limitations) for details.

## How to use

### Installation

1. Make sure you have a recent version of [Node.js](https://nodejs.org/en/).
2. Clone the repository
3. Install dependencies: `npm ci`

> [!NOTE]
> Installation of dependencies will also patch the docx library that the code depends on (by calling the `patch-docx.mjs` script). The patch is needed to make it possible to define additional custom styles on top of the ISO styles that the Word template defines; as well as to create nested Bookmarks.


### Usage

Run:

```bash
node main.mjs [shortname]
```

... where `[shortname]` is the URL of a W3C Recommendation that you would like to convert. The command will fetch the Recommendation and convert it to an docx document named after the shortname in the same folder.

For example:

```bash
node main.mjs WCAG22
node main.mjs vc-data-model-2.0
```

## In scope / Out of scope

### Features supported

In general, the conversion handles common constructs found in W3C Recommendations, including:

- Inline text, code, links, emphasis.
- Headings.
- Term definitions.
- Definition lists.
- Code blocks.
- Notes and examples, and sectioning content in general.
- Figures and figure captions. Conversion fetches images and inlines them, shrinking the image to fit the page. Common image formats are supported (SVG, JPEG, PNG, GIF).
- Simple tables.
- Unordered lists, including nested lists.

Conversion also preserves IDs and links.

> [!NOTE]
> Code will no doubt choke on more complex structures. Please report any issue that arises!

### Known limitations

Main known limitations are:

- **Ordered lists** are treated as unordered lists. List numbering is harder to handle in docx documents. It requires defining a hierarchy in styles, and the docx library used under the hoods does not yet provide a way to import the numbering styles defined in the ISO Word template.
- **ISO preamble pages** (Foreword, copyright) are not created. These pages can easily be added afterwards as they mostly contain boilerplate text.
- The **table of contents** is missing.
- **Page headers/footers** are not created.
- **Section numbers** are copied as-is and are not *real* section numbers. No attempt is being made at re-numbering sections either.
- **Indentations** are only roughly correct, in particular for nested content.

Various improvements may be made to the conversion process as well. For example, abbreviations are not currently handled in any specific way.

> [!NOTE]
> These limitations may be addressed in the future. Pull requests welcome!

By definition, conversion cannot handle interactive HTML content, which cannot be mapped to anything in a docx document.

### Known deviations from ISO requirements

- ISO forbids **hanging paragraphs** in sections. W3C specs use them extensively. No attempt is being made at creating a sub-heading to wrap them during the conversion.
- **References** in W3C specs appear as an appendix using a specific format. ISO lists references upfront using a different format. No attempt is being made at converting the list of references.
- **Terminology** sections do not have a specific structure in W3C specs. ISO has a more formal structure, including boilerplate text to reference ISO and IEC maintained terminology databases. No attempt is being made at creating a formal "Terms, definitions and abbreviated terms" section.

### Additional conversion notes

- The **Abstract** section is copied, but ISO will typically drop the abstract from the spec itself and report it as the description of the standard on the underlying ISO standard page.
- The **Status of this Document** section disappears during conversion. It contains W3C information that does not make sense in an ISO spec.
- The **front matter** disappears during conversion. Some of the links it contains do not make sense in an ISO spec. That said, this is where W3C specs report the list of editors. ISO specs do not list editors. At a minimum, the list of editors should be added manually after conversion, e.g., in an Acknowledgments section.


## Implementation notes

### Format considerations

Difficulties that arise when converting the HTML document of a W3C standard are due to the structural differences between the HTML and docx formats. In particular:

- HTML has sectioning (and assimilated) elements, including `<aside>`, `<div>`, `<section>`, and sections can be nested. The docx format has sections, but they are used to split page layouts (e.g., portrait/landscape). The docx format is just a flat list of paragraphs otherwise (instances of [`Paragraph`](https://docx.js.org/#/usage/paragraph) in the docx library).
- HTML is flexible when it comes to mixing *block* and *inline* content. For example, `<div>` and `<li>` may contain inline content and/or block content. The docx format is again just a flat list of paragraphs, each paragraph containing inline content (instances of [`TextRun`](https://docx.js.org/#/usage/text?id=text-runs), [`SymbolRun`](https://docx.js.org/#/usage/symbols?id=symbol-runs), or [`ImageRun`](https://docx.js.org/#/usage/images?id=images) for the raw content).
- HTML also supports nesting of inline content, such as wrapping `<code>` into a `<b>` element. The docx format has limited support for nesting. A `TextRun` cannot be nested into another `TextRun`. It still has a few classes to wrap inline content, including [`Hyperlink`](https://docx.js.org/#/usage/hyperlinks) and [`Bookmark`](https://docx.js.org/#/usage/bookmarks?id=bookmarks) to create links.
- HTML has non-significant whitespaces. All whitespaces are significant in the docx format (well, except line breaks in text such as preformatted blocks which need to be converted to explicit breaks).
- HTML supports setting more than one style class per element. The docx format does not, and separates between paragraph and character styles.

### Conversion workflow

Conversion steps are coded in the `main.mjs` file:

1. Fetch the W3C spec and load the spec with [jsdom](https://github.com/jsdom/jsdom).
2. Drop non-significant whitespaces from the DOM tree. See code in `src/drop-whitespaces.mjs`.
3. Prepare a template structure for the docx document. See code in `src/create-docx-parameters.mjs`.
4. Convert the resulting DOM tree. See code in `src/convert.mjs`.
5. Save the result to a docx file.

The conversion loops through main sections (Introduction, Table of contents, etc.). Actual conversion of these sections involves two main steps:

1. Flatten the DOM structure to a series of `<p>` blocks and `<span>` content (plus a few additional tags, such as `<a>`, `<img>`, and `<table>`-like elements). See code in `src/flatten.mjs`.
2. Convert the flat DOM to a series of `Paragraph` and `TextRun` instances (plus a few additional instances, such as `Hyperlink` or `ImageRun`). These classes are provided by the [docx library](https://docx.js.org/#/).

The most crucial step here is the flattening of the initial DOM structure, which converts the typical hierachical structure of the HTML document that mix block and inline content to a flat list of blocks that contain inline content, which can more readily be converted to a docx document.

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

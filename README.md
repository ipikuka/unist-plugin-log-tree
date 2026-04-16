**A robust Next.js newsletter `Next.js Weekly` is sponsoring me** 💖
[![NextjsWeekly banner](./assets/next-js-weekly.png)](https://nextjsweekly.com/)

### [Become a sponsor](https://github.com/sponsors/ipikuka) 🚀

If you find **`unified-log-tree`** useful in your projects, consider supporting my work.  
Your sponsorship means a lot 💖

My sponsors are going to be featured here and on [my sponsor wall](https://github.com/sponsors/ipikuka).

A warm thanks 🙌 to [@ErfanEbrahimnia](https://github.com/ErfanEbrahimnia), [@recepkyk](https://github.com/recepkyk), and [@LSeaburg](https://github.com/LSeaburg) for the support!

Thank you for supporting open source! 🙌

# unified-log-tree

[![npm version][badge-npm-version]][url-npm-package]
[![npm downloads][badge-npm-download]][url-npm-package]
[![publish to npm][badge-publish-to-npm]][url-publish-github-actions]
[![code-coverage][badge-codecov]][url-codecov]
[![type-coverage][badge-type-coverage]][url-github-package]
[![typescript][badge-typescript]][url-typescript]
[![license][badge-license]][url-license]

This package is a [**unified**][unified] ([**remark**][remark]) plugin **to log and optionally filter unist syntax trees for debugging purposes.** It is debugging plugin for the unified ecosystem that logs unist syntax trees without mutating.

[**unified**][unified] is a project that transforms content with abstract syntax trees (ASTs) using the new parser [**micromark**][micromark]. [**remark**][remark] adds support for markdown to unified. [**mdast**][mdast] is the Markdown Abstract Syntax Tree (AST) which is a specification for representing markdown in a syntax tree. **[rehype][rehype]** is a tool that transforms HTML with plugins. **[hast][hast]** stands for HTML Abstract Syntax Tree (HAST) that rehype uses. **[recma][recma]** adds support for producing a javascript code by transforming **[esast][esast]** which stands for Ecma Script Abstract Syntax Tree (AST) that is used in production of compiled source for the **[MDX][MDX]**.

**This plugin is a universal syntax tree (unist) plugin for mdast, hast, estree, and other unist-based trees. It does not mutate the tree; it only inspects and logs it for debugging.**

# unified-log-tree

A debugging plugin for the unified ecosystem that logs unist syntax trees without mutating them.

## When should I use this?

**`unified-log-tree`** is useful when you want to **inspect, debug, or snapshot syntax trees** during a unified processing pipeline.

It works with any unist-compatible tree:

- mdast (remark)
- hast (rehype)
- estree / recma
- any custom unist-based AST

This plugin:

- ✅ Logs the syntax tree to the console
- ✅ Optionally filters nodes using `test`
- ✅ Preserves parent chains when filtering
- ✅ Optionally preserves full subtrees
- ✅ Can hide `position` data
- ❌ Does **not** transform or mutate the original tree

It is purely a debugging utility.

## Installation

This package is ESM only.

In Node.js (version 16+), install with npm:

```bash
npm install unified-log-tree
```

or

```bash
yarn add unified-log-tree
```

## Usage

### ⚠️ Important: Factory Pattern Usage

This plugin follows a **factory pattern**.

Unlike typical unified plugins that are used like this:

```js
.use(plugin, options)
```

this plugin **must be used like this**:

```js
.use(plugin(options))
```

### Why?

The plugin is implemented as a factory so that it can be used multiple times in a single unified pipeline — for example, to log different stages (mdast, hast, etc.) independently.

Because of this structure, it returns a configured plugin instance immediately, which is why `.use(plugin(options))` is required.

### Basic usage (log full tree)

```js
import { read } from "to-vfile";
import { unified } from "unified";
import remarkParse from "remark-parse";
import logTree from "unified-log-tree";

const file = await unified()
  .use(remarkParse)
  .use(logTree()) // ← factory call
  .process(await read("example.md"));
```

Running this will print the full mdast to the console.

### With filtering

You can pass a `test` option (powered by `unist-util-is`) to log only specific nodes.

```js
.use(logTree({ test: "heading" }))
```

This will:

- Keep only `heading` nodes
- Preserve their parent chain
- Remove unrelated branches

### With label

```js
.use(logTree({ label: "Remark AST" }))
```

Console output:

```
[unist-log-tree] Remark AST
{ ...tree }
```

### In a full pipeline (remark → rehype)

```js
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import logTree from "unified-log-tree";

await unified()
  .use(remarkParse)
  .use(logTree({ label: "MDAST" }))
  .use(remarkRehype)
  .use(logTree({ label: "HAST" }))
  .use(rehypeStringify)
  .process("# Hello");
```

This logs both the mdast and hast trees.

## Options

All options are optional.

```ts
type UnistLogTreeOptions = {
  test?: Test;
  preserveSubtree?: boolean;
  excludeKeys?: string[];
  depth?: number | null;
  indentation?: number;
  label?: string;
  ref?: object;
  enabled?: boolean;
};
```

### `test`

Type: `Test` (from `unist-util-is`)  
Default: `undefined`

Filters the tree. Only matching nodes and their parent chain are kept.

Examples:

```js
test: "heading"
test: ["heading", "paragraph"]
test: (node) => node.type === "link"
```

If `test` is `undefined` or `null`, the full tree is logged.

### `preserveSubtree`

Type: `boolean`  
Default: `true`

Controls behavior when a node matches `test`.

- `true` → Keep the matched node and entire subtree.
- `false` → Recursively filter its children as well.

Example:

```js
.use(logTree({
  test: "heading",
  preserveSubtree: false
}))
```

```js
.use(logTree({
  test: { type: "CallExpression" }
  preserveSubtree: true
}))
```

### `excludeKeys`

Type: `string[]`  
Default: `[]` *empty array*

An array of property names to be recursively removed from the AST nodes before logging. This is useful for reducing noise by hiding metadata like `position`, `loc`, or `range`. Use this to filter out unwanted node data during logging.

```js
.use(logTree({ excludeKeys: ["position"] }))
```

Strips `position` from the AST output. Output of the tree will not contain `position` data.

### `depth`

Type: `number | null`  
Default: `null`

Passed to `console.dir` as the `depth` option.

```js
.use(logTree({ depth: 4 }))
```

### `indentation`

Type: `number`  
Default: `2`

Controls JSON indentation size before printing.

### `label`

Type: `string`  
Default: `undefined`

Adds a label before the logged tree.

```js
.use(logTree({ label: "Rehype AST" }))
```

### `ref`

Type: `object`  
Default: `undefined`

**An optional object reference that will be mutated to contain the resulting tree.** This is particularly useful in testing environments (like Vitest or Jest) where you need to perform assertions on the AST without relying on `console.log` captures.

> [!IMPORTANT]
> Because JavaScript uses call-by-sharing for objects, the plugin uses `Object.assign()` to update the reference you provide. This allows the tree data to "leak" back out to your test scope.

```js
const treeRef = {};

const processor = unified()
  .use(remarkParse)
  .use(logTree, { 
    ref: treeRef,
    excludeKeys: ["position"] 
  })
  .use(remarkStringify);

await processor.process("# Hello World");

// treeRef now contains the processed MDAST
console.log(treeRef.type); // "root"
```

### `enabled`

Type: `boolean`  
Default: `true`

Allows turning the logger off without removing it from the pipeline.

```js
.use(logTree({ enabled: false }))
```

Useful in CI or production builds.

## Filtering Behavior

When `test` is provided:

- Matching nodes are kept.
- Parent nodes are preserved if any descendant matches.
- Non-matching branches are removed.
- The original AST is never mutated.

The plugin internally clones the tree before pruning.

## Syntax Tree

This plugin does **not** transform or mutate the syntax tree. It:

- Clones the tree (when filtering)
- Optionally prunes branches
- Logs the result
- Leaves the original AST untouched

## Types

This package is fully typed with TypeScript. The options type is exported as:

```ts
UnistLogTreeOptions
```

## Compatibility

This plugin works with unified version `6+`, and any unist-compatible trees in a plugin chain of remark, rehype, recma.

## Security

This plugin does not generate HTML, execute user code, or manipulate output content. It only logs syntax trees to the console. There are no XSS or runtime security concerns.

## My Plugins

I like to contribute the Unified / Remark / MDX ecosystem, so I recommend you to have a look my plugins.

### My Remark Plugins

- [`remark-flexible-code-titles`](https://www.npmjs.com/package/remark-flexible-code-titles)
  – Remark plugin to add titles or/and containers for the code blocks with customizable properties
- [`remark-flexible-containers`](https://www.npmjs.com/package/remark-flexible-containers)
  – Remark plugin to add custom containers with customizable properties in markdown
- [`remark-ins`](https://www.npmjs.com/package/remark-ins)
  – Remark plugin to add `ins` element in markdown
- [`remark-flexible-paragraphs`](https://www.npmjs.com/package/remark-flexible-paragraphs)
  – Remark plugin to add custom paragraphs with customizable properties in markdown
- [`remark-flexible-markers`](https://www.npmjs.com/package/remark-flexible-markers)
  – Remark plugin to add custom `mark` element with customizable properties in markdown
- [`remark-flexible-toc`](https://www.npmjs.com/package/remark-flexible-toc)
  – Remark plugin to expose the table of contents via `vfile.data` or via an option reference
- [`remark-mdx-remove-esm`](https://www.npmjs.com/package/remark-mdx-remove-esm)
  – Remark plugin to remove import and/or export statements (mdxjsEsm)
- [`remark-mdx-remove-expressions`](https://www.npmjs.com/package/remark-mdx-remove-expressions)
  – Remark plugin to remove MDX expressions within curlybraces {} in MDX content

### My Rehype Plugins

- [`rehype-pre-language`](https://www.npmjs.com/package/rehype-pre-language)
  – Rehype plugin to add language information as a property to `pre` element
- [`rehype-highlight-code-lines`](https://www.npmjs.com/package/rehype-highlight-code-lines)
  – Rehype plugin to add line numbers to code blocks and allow highlighting of desired code lines
- [`rehype-code-meta`](https://www.npmjs.com/package/rehype-code-meta)
  – Rehype plugin to copy `code.data.meta` to `code.properties.metastring`
- [`rehype-image-toolkit`](https://www.npmjs.com/package/rehype-image-toolkit)
  – Rehype plugin to enhance Markdown image syntax `![]()` and Markdown/MDX media elements (`<img>`, `<audio>`, `<video>`) by auto-linking bracketed or parenthesized image URLs, wrapping them in `<figure>` with optional captions, unwrapping images/videos/audio from paragraph, parsing directives in title for styling and adding attributes, and dynamically converting images into `<video>` or `<audio>` elements based on file extension.

### My Recma Plugins

- [`recma-mdx-escape-missing-components`](https://www.npmjs.com/package/recma-mdx-escape-missing-components)
  – Recma plugin to set the default value `() => null` for the Components in MDX in case of missing or not provided so as not to throw an error
- [`recma-mdx-change-props`](https://www.npmjs.com/package/recma-mdx-change-props)
  – Recma plugin to change the `props` parameter into the `_props` in the `function _createMdxContent(props) {/* */}` in the compiled source in order to be able to use `{props.foo}` like expressions. It is useful for the `next-mdx-remote` or `next-mdx-remote-client` users in `nextjs` applications.
- [`recma-mdx-change-imports`](https://www.npmjs.com/package/recma-mdx-change-imports)
  – Recma plugin to convert import declarations for assets and media with relative links into variable declarations with string URLs, enabling direct asset URL resolution in compiled MDX.
- [`recma-mdx-import-media`](https://www.npmjs.com/package/recma-mdx-import-media)
  – Recma plugin to turn media relative paths into import declarations for both markdown and html syntax in MDX.
- [`recma-mdx-import-react`](https://www.npmjs.com/package/recma-mdx-import-react)
  – Recma plugin to ensure getting `React` instance from the arguments and to make the runtime props `{React, jsx, jsxs, jsxDev, Fragment}` is available in the dynamically imported components in the compiled source of MDX.
- [`recma-mdx-html-override`](https://www.npmjs.com/package/recma-mdx-html-override)
  – Recma plugin to allow selected raw HTML elements to be overridden via MDX components.
- [`recma-mdx-interpolate`](https://www.npmjs.com/package/recma-mdx-interpolate)
  – Recma plugin to enable interpolation of identifiers wrapped in curly braces within the `alt`, `src`, `href`, and `title` attributes of markdown link and image syntax in MDX.

### My Unist Utils and Plugins

I also build low-level utilities and plugins for the Unist ecosystem that can be used across Remark, Rehype, Recma, and other syntax trees.

- [`unist-util-find-between-all`](https://www.npmjs.com/package/unist-util-find-between-all)
  – Unist utility to find the nodes between two nodes.
- [`unified-log-tree`](https://www.npmjs.com/package/unified-log-tree)
  – Debugging plugin for the unified ecosystem that logs abstract syntax trees (ASTs) without mutating.

## License

[MIT License](./LICENSE) © ipikuka

[unified]: https://github.com/unifiedjs/unified
[micromark]: https://github.com/micromark/micromark
[remark]: https://github.com/remarkjs/remark
[mdast]: https://github.com/syntax-tree/mdast
[rehype]: https://github.com/rehypejs/rehype
[hast]: https://github.com/syntax-tree/hast
[recma]: https://mdxjs.com/docs/extending-mdx/#list-of-plugins
[esast]: https://github.com/syntax-tree/esast
[MDX]: https://mdxjs.com/

[badge-npm-version]: https://img.shields.io/npm/v/unified-log-tree
[badge-npm-download]:https://img.shields.io/npm/dt/unified-log-tree
[url-npm-package]: https://www.npmjs.com/package/unified-log-tree
[url-github-package]: https://github.com/ipikuka/unified-log-tree

[badge-license]: https://img.shields.io/github/license/ipikuka/unified-log-tree
[url-license]: https://github.com/ipikuka/unified-log-tree/blob/main/LICENSE

[badge-publish-to-npm]: https://github.com/ipikuka/unified-log-tree/actions/workflows/publish.yml/badge.svg
[url-publish-github-actions]: https://github.com/ipikuka/unified-log-tree/actions/workflows/publish.yml

[badge-typescript]: https://img.shields.io/npm/types/unified-log-tree
[url-typescript]: https://www.typescriptlang.org/

[badge-codecov]: https://codecov.io/gh/ipikuka/unified-log-tree/graph/badge.svg?token=bzXcCBzY4P
[url-codecov]: https://codecov.io/gh/ipikuka/unified-log-tree

[badge-type-coverage]: https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fipikuka%2Funified-log-tree%2Fmaster%2Fpackage.json


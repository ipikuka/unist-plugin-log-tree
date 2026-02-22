import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unified } from "unified";

import plugin, { type Node } from "../src/index";

/*
  <h3>heading1</h3>
  <p>Hi <em>italic</em> <strong>bold</strong>.</p>

  <h3>heading2</h3>
  <p>Hi <a href="#link">click</a> and <img src="#image" alt="alt" />.</p>
*/
function createTree(): Node {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "h3",
        properties: {},
        children: [{ type: "text", value: "heading1" }],
      },
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [
          {
            type: "text",
            value: "Hi ",
          },
          {
            type: "element",
            tagName: "em",
            properties: {},
            children: [{ type: "text", value: "italic" }],
          },
          { type: "text", value: " " },
          {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [{ type: "text", value: "bold" }],
          },
          { type: "text", value: "." },
        ],
      },
      {
        type: "element",
        tagName: "h3",
        properties: {},
        children: [{ type: "text", value: "heading2" }],
      },
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [
          { type: "text", value: "Hi " },
          {
            type: "element",
            tagName: "a",
            properties: { href: "#link", title: null },
            children: [{ type: "text", value: "click" }],
          },
          { type: "text", value: " and " },
          {
            type: "element",
            tagName: "img",
            properties: { src: "#image", alt: "alt", title: null },
            children: [],
          },
          { type: "text", value: "." },
        ],
      },
    ],
  } as Node;
}

function hasAnyPosition(node: Node): boolean {
  if (!node || typeof node !== "object") return false;
  if ("position" in node) return true;
  if (Array.isArray(node.children)) {
    return node.children.some(hasAnyPosition);
  }
  return false;
}

describe("unist-log-tree (hast)", () => {
  let dirSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dirSpy = vi.spyOn(console, "dir").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function output() {
    return dirSpy.mock.calls[0]?.[0];
  }

  it("default: logs full tree", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ preservePositions: true }))
      .run(tree);

    expect(output().children.length).toBe(4);
    expect(output()).toEqual(tree);
  });

  it("enabled=false: early return", async () => {
    const tree = createTree();

    const result = await unified()
      .use(plugin({ enabled: false }))
      .run(tree);

    expect(dirSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(result).toBe(tree);
  });

  it("label branch", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ label: "X" }))
      .run(tree);

    expect(logSpy).toHaveBeenCalledWith("[unist-log-tree] X");
  });

  it("preservePositions=false removes all positions", async () => {
    const tree = createTree();

    tree.position = {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 3, offset: 3 },
    };

    await unified()
      .use(plugin({ preservePositions: false }))
      .run(tree);

    expect(hasAnyPosition(output())).toBe(false);
  });

  it("preservePositions=true keeps positions", async () => {
    const tree = createTree();

    tree.position = {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 3, offset: 3 },
    };

    await unified()
      .use(plugin({ preservePositions: true }))
      .run(tree);

    expect(output().position).toBeDefined();
  });

  it("test undefined => full tree", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: undefined }))
      .run(tree);

    expect(output()).toEqual(tree);
  });

  it("test null => full tree", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: null }))
      .run(tree);

    expect(output()).toEqual(tree);
  });

  it("string test filters elements", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "element" }))
      .run(tree);

    expect(output().children.length).toBe(4);
  });

  it("props test filters specific heading via text node", async () => {
    const tree = createTree();

    await unified()
      .use(
        plugin({
          test: {
            type: "text",
            value: "heading2",
          },
        }),
      )
      .run(tree);

    const out = output();

    expect(out.children.length).toBe(1);
    expect(out.children[0].tagName).toBe("h3");
    expect(out.children[0].children[0]).toMatchObject({
      type: "text",
      value: "heading2",
    });
  });

  it("nested match preserves parent chain", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: { tagName: "a" } }))
      .run(tree);

    const out = output();
    expect(out.children.length).toBe(1);
    expect(out.children[0].tagName).toBe("p");
  });

  it("preserveSubtree=false prunes children", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: { tagName: "h3" }, preserveSubtree: false }))
      .run(tree);

    expect(output().children[0].children.length).toBe(0);
  });

  it("no match => root with empty children", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "table" }))
      .run(tree);

    expect(output().children).toEqual([]);
  });

  it("depth forwarded to console.dir", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ depth: 1 }))
      .run(tree);

    expect(dirSpy).toHaveBeenCalledWith(expect.anything(), { depth: 1 });
  });

  it("does not mutate original tree", async () => {
    const tree = createTree();
    const clone = structuredClone(tree);

    await unified()
      .use(plugin({ test: "h3" }))
      .run(tree);

    expect(tree).toEqual(clone);
  });

  it("supports multiple usages (factory pattern)", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ label: "A" }))
      .use(plugin({ label: "B" }))
      .run(tree);

    expect(logSpy).toHaveBeenNthCalledWith(1, "[unist-log-tree] A");
    expect(logSpy).toHaveBeenNthCalledWith(2, "[unist-log-tree] B");
  });
});

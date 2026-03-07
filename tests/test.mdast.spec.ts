import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unified } from "unified";
import type { Parent } from "unist";

import plugin, { type Node } from "../src/index";

/*
  ### heading1
  Hi *italic* **bold**.

  ### heading2
  Hi [click](#link) and ![alt](#image).
*/
function createTree(): Node {
  return {
    type: "root",
    children: [
      {
        type: "heading",
        depth: 3,
        children: [{ type: "text", value: "heading1" }],
      },
      {
        type: "paragraph",
        children: [
          { type: "text", value: "Hi " },
          {
            type: "emphasis",
            children: [{ type: "text", value: "italic" }],
          },
          { type: "text", value: " " },
          {
            type: "strong",
            children: [{ type: "text", value: "bold" }],
          },
          { type: "text", value: "." },
        ],
      },
      {
        type: "heading",
        depth: 3,
        children: [{ type: "text", value: "heading2" }],
      },
      {
        type: "paragraph",
        children: [
          { type: "text", value: "Hi " },
          {
            type: "link",
            title: null,
            url: "#link",
            children: [{ type: "text", value: "click" }],
          },
          { type: "text", value: " and " },
          {
            type: "image",
            title: null,
            url: "#image",
            alt: "alt",
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

describe("unist-log-tree", () => {
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

    await unified().use(plugin()).run(tree);

    const out = output();

    expect(out.children.length).toBe(4);
    expect(out).toEqual(tree);
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

  it("excludeKeys=['position'] removes rootposition", async () => {
    const tree = createTree();

    tree.position = {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 3, offset: 3 },
    };

    await unified()
      .use(plugin({ excludeKeys: ["position"] }))
      .run(tree);

    expect(output().position).toBeUndefined();
  });

  it("excludeKeys=['position'] removes all positions", async () => {
    const tree = createTree();

    tree.position = {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 3, offset: 3 },
    };

    ((tree as unknown as Parent).children[0] as Parent).position = {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 3, offset: 3 },
    };

    await unified()
      .use(plugin({ excludeKeys: ["position"] }))
      .run(tree);

    const out = dirSpy.mock.calls[0][0];

    expect(hasAnyPosition(out)).toBe(false);
  });

  it("Undefined excludeKeys keeps positions", async () => {
    const tree = createTree();

    tree.position = {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 3, offset: 3 },
    };

    await unified().use(plugin()).run(tree);

    expect(output().position).toBeDefined();
  });

  it("test undefined => full tree", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: undefined }))
      .run(tree);

    const out = output();

    expect(out.children.length).toBe(4);
    expect(out).toEqual(tree);
  });

  it("test null => full tree", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: null }))
      .run(tree);

    const out = output();

    expect(out.children.length).toBe(4);
    expect(out).toEqual(tree);
  });

  it("string test filters headings", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "heading" }))
      .run(tree);

    expect(output().children.length).toBe(2);
  });

  it("function test filters specific heading", async () => {
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
    const heading = out.children[0];

    expect(out.children.length).toBe(1);
    expect(heading.type).toBe("heading");
    expect(heading.children.length).toBe(1);
    expect(heading.children[0]).toMatchObject({
      type: "text",
      value: "heading2",
    });
  });

  it("nested match preserves parent chain", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "link" }))
      .run(tree);

    const out = output();

    expect(out.children.length).toBe(1);
    expect(out.children[0].type).toBe("paragraph");
  });

  it("preserveSubtree=false prunes children", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "heading", preserveSubtree: false }))
      .run(tree);

    expect(output().children[0].children.length).toBe(0);
  });

  it("no match => root with empty children (fallback branch)", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "blockquote" }))
      .run(tree);

    const out = output();

    expect(out.type).toBe("root");
    expect(out.children).toEqual([]);
  });

  it("depth forwarded to console.dir", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ depth: 1 }))
      .run(tree);

    expect(dirSpy).toHaveBeenCalledWith(expect.anything(), { depth: 1 });
  });

  it("indentation path executes", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ indentation: 4 }))
      .run(tree);

    expect(dirSpy).toHaveBeenCalled();
  });

  it("does not mutate original tree", async () => {
    const tree = createTree();
    const clone = structuredClone(tree);

    await unified()
      .use(plugin({ test: "heading" }))
      .run(tree);

    expect(tree).toEqual(clone);
  });

  it("supports multiple usages (factory pattern)", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ label: "A" }))
      .use(plugin({ label: "B" }))
      .run(tree);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1, "[unist-log-tree] A");
    expect(logSpy).toHaveBeenNthCalledWith(2, "[unist-log-tree] B");
  });

  it("ref option sets the reference", async () => {
    const tree = createTree();
    const ref = {};

    await unified().use(plugin({ ref })).run(tree);

    expect((ref as Node).type).toBe("root");
  });
});

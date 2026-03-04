import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unified } from "unified";

import plugin, { type Node } from "../src/index";

/*
function test() {
  console.log("hello");
}

const x = 42;
*/
function createTree(): Node {
  return {
    type: "Program",
    body: [
      {
        type: "FunctionDeclaration",
        id: { type: "Identifier", name: "test" },
        params: [],
        body: {
          type: "BlockStatement",
          body: [
            {
              type: "ExpressionStatement",
              expression: {
                type: "CallExpression",
                range: [10, 25],
                callee: {
                  type: "MemberExpression",
                  object: { type: "Identifier", name: "console" },
                  property: { type: "Identifier", name: "log" },
                  computed: false,
                },
                arguments: [{ type: "Literal", value: "hello" }],
              },
            },
          ],
        },
      },
      {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: { type: "Identifier", name: "x" },
            init: { type: "Literal", value: 42 },
          },
        ],
      },
    ],
  } as Node;
}

describe("unist-log-tree (esast)", () => {
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

    expect(output().body.length).toBe(2);
  });

  it("string test filters VariableDeclaration", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "VariableDeclaration" }))
      .run(tree);

    const out = output();

    expect(out.body.length).toBe(1);
    expect(out.body[0].type).toBe("VariableDeclaration");
  });

  it("props test filters specific literal", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: { type: "Literal", value: 42 } }))
      .run(tree);

    const out = output();

    expect(out.body.length).toBe(1);
    expect(out.body[0].type).toBe("VariableDeclaration");
  });

  it("nested match preserves parent chain", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: { type: "Identifier", name: "console" } }))
      .run(tree);

    const out = output();

    expect(out.body.length).toBe(1);
    expect(out.body[0].type).toBe("FunctionDeclaration");
  });

  it("preserveSubtree=false prunes children", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "FunctionDeclaration", preserveSubtree: false }))
      .run(tree);

    const out = output();

    expect(out.body.length).toBe(1);
    expect(out.body[0].body).toBeUndefined();
  });

  it("no match => empty root", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ test: "ImportDeclaration" }))
      .run(tree);

    expect(output().body).toEqual([]);
  });

  it("factory pattern works", async () => {
    const tree = createTree();

    await unified()
      .use(plugin({ label: "A" }))
      .use(plugin({ label: "B" }))
      .run(tree);

    expect(logSpy).toHaveBeenNthCalledWith(1, "[unist-log-tree] A");
    expect(logSpy).toHaveBeenNthCalledWith(2, "[unist-log-tree] B");
  });

  it("no match prunes both array and single-node fields in ESTree", async () => {
    const tree = {
      type: "Program",
      sourceType: "module",
      body: [
        {
          type: "ExpressionStatement",
          expression: {
            type: "Literal",
            value: 123,
          },
          position: {
            start: { line: 1, column: 0, offset: 0 },
            end: { line: 1, column: 3, offset: 3 },
          },
        },
        {
          type: "ReturnStatement",
          argument: {
            type: "Literal",
            value: 5,
          },
          position: {
            start: { line: 1, column: 0, offset: 0 },
            end: { line: 1, column: 3, offset: 3 },
          },
        },
      ],
    };

    await unified()
      .use(plugin({ test: "ImportDeclaration" })) // don't match anything
      .run(tree);

    const out = output();

    expect(out.body).toEqual([]);
    expect(out.body.length).toBe(0);
  });

  it("CallExpression test: validates parent chain and preserveSubtree toggle", async () => {
    const tree = createTree();

    await unified()
      .use(
        plugin({
          test: { type: "CallExpression" },
          preserveSubtree: true,
          excludeKeys: ["range"],
        }),
      )
      .run(tree);

    const outTrue = output();
    const callExprTrue = outTrue.body[0].body.body[0].expression;

    expect(callExprTrue.type).toBe("CallExpression");
    expect(callExprTrue.arguments).toBeDefined();
    expect(callExprTrue.arguments.length).toBe(1);
    expect(callExprTrue.callee.object.name).toBe("console");

    dirSpy.mockClear();

    await unified()
      .use(
        plugin({
          test: { type: "CallExpression" },
          preserveSubtree: false,
          excludeKeys: ["range"],
        }),
      )
      .run(tree);

    const outFalse = output();
    const callExprFalse = outFalse.body[0].body.body[0].expression;

    expect(callExprFalse.type).toBe("CallExpression");
    expect(callExprFalse.callee).toBeUndefined();
    expect(callExprFalse.arguments).toEqual([]);
  });
});

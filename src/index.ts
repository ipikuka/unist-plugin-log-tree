import type { Plugin } from "unified";
import type { Node as UnistNode } from "unist";
import type { Test } from "unist-util-is";
import { is } from "unist-util-is";

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type PartiallyRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export interface Node extends UnistNode {
  [key: string]: unknown;
}

export type LogTreeOptions = {
  depth?: number | null;
  enabled?: boolean;
  excludeKeys?: string[];
  indentation?: number;
  label?: string;
  ref?: object;
  preserveSubtree?: boolean;
  test?: Test;
};

const DEFAULT_SETTINGS: LogTreeOptions = {
  depth: null,
  enabled: true,
  excludeKeys: [],
  indentation: 2,
  label: undefined,
  ref: undefined,
  preserveSubtree: true,
  test: undefined,
};

type PartiallyRequiredOptions = Prettify<
  PartiallyRequired<
    LogTreeOptions,
    "depth" | "enabled" | "excludeKeys" | "indentation" | "preserveSubtree"
  >
>;

/**
 * Debug utility plugin for unified processors.
 *
 * Logs the current abstract syntax tree (AST) (mdast, hast, esast, etc.)
 * with optional filtering and formatting controls.
 *
 * If `test` is provided, only matching nodes and their
 * parent chain are preserved in the output.
 *
 * The original tree is never mutated.
 */
export default function plugin(options?: LogTreeOptions): Plugin<[], Node> {
  return function attacher() {
    const settings = Object.assign({}, DEFAULT_SETTINGS, options) as PartiallyRequiredOptions;

    // early exit
    if (!settings.enabled) {
      return function transformer(tree: Node) {
        return tree;
      };
    }

    /*
     * Type guard to check if an array of Node
     */
    function isNodeArray(value: unknown): value is Node[] {
      return (
        Array.isArray(value) &&
        (value as unknown[]).every((item) => item && typeof item === "object" && "type" in item)
      );
    }

    /*
     * Type guard to check if a node is a unist Node
     */
    function isNode(value: unknown): value is Node {
      return !!value && typeof value === "object" && "type" in value;
    }

    /**
     * Builds a minimal subtree that keeps only nodes matching the test and their parent chain.
     * It uses prune algoritm that works on children key, so with mdast and hast okey but with esast doesn't work
     */
    // function buildFilteredTreeEx(root: Node, test: Test): Node {
    //   const cloned = structuredClone(root);

    //   function prune(node: Node): boolean {
    //     const matched = is(node, test);

    //     if (isParent(node)) {
    //       if (matched && settings.preserveSubtree !== false) {
    //         return true; // don't touch subtree
    //       }

    //       node.children = node.children.filter((child) => prune(child));
    //     }

    //     if (matched) return true;

    //     if (isParent(node)) {
    //       return node.children.length > 0;
    //     }

    //     return false;
    //   }

    //   const keepRoot = prune(cloned);

    //   if (!keepRoot && isParent(cloned)) {
    //     cloned.children = [];
    //   }

    //   return cloned;
    // }

    /**
     * Builds a minimal subtree that keeps only nodes matching the test and their parent chain.
     * It is a universal travel algoritim works with any AST like mdast, hast, esast and others
     */
    function buildFilteredTree(root: Node, test: Test): Node {
      const cloned = structuredClone(root);
      prune(cloned);
      return cloned;

      function prune(node: Node): boolean {
        const matched = is(node, test);

        if (matched && settings.preserveSubtree !== false) {
          return true; // don't touch subtree
        }

        let hasChildMatch = false;

        for (const key in node) {
          if (settings.excludeKeys.includes(key)) continue;

          const value = node[key];

          if (!value) continue;

          if (isNodeArray(value)) {
            let containsNode = false;

            for (let i = value.length - 1; i >= 0; i--) {
              const item = value[i];

              /* v8 ignore next -- @preserve */
              if (isNode(item)) {
                containsNode = true;

                const keep = prune(item);

                if (!keep) {
                  value.splice(i, 1);
                } else {
                  hasChildMatch = true;
                }
              }
            }

            if (containsNode && value.length === 0) {
              node[key] = [];
            }
          } else if (isNode(value)) {
            const keep = prune(value);

            if (!keep) {
              delete node[key];
            } else {
              hasChildMatch = true;
            }
          }
        }

        return matched || hasChildMatch;
      }
    }

    return function transformer(tree: Node) {
      const targetTree = settings.test != null ? buildFilteredTree(tree, settings.test) : tree;

      if (settings.label) {
        console.log(`[unified-log-tree] ${settings.label}`);
      }

      const output: Node = JSON.parse(
        JSON.stringify(targetTree, (key: string, value: unknown) => {
          if (settings.excludeKeys.includes(key)) {
            return undefined;
          }
          return value;
        }),
      );

      if (options?.ref !== undefined) {
        Object.assign(options.ref, structuredClone(output));
      }

      console.dir(output, { depth: settings.depth });
    };
  };
}

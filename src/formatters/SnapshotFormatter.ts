/**
 * Formats DOM snapshot trees for MCP response output.
 */

import type {SnapshotNode} from '../types.js';

export function formatSnapshot(node: SnapshotNode, verbose?: boolean): string {
  const lines: string[] = [];
  formatNode(node, 0, lines, verbose);
  return lines.join('\n');
}

function formatNode(
  node: SnapshotNode,
  depth: number,
  lines: string[],
  verbose?: boolean,
): void {
  const indent = '  '.repeat(depth);
  let line = `${indent}[${node.uid}] ${node.role}`;

  if (node.name) {
    line += ` "${node.name}"`;
  }

  if (node.value !== undefined) {
    line += ` value="${node.value}"`;
  }

  if (verbose && node.tagName) {
    line += ` <${node.tagName}>`;
  }

  if (verbose && node.attributes) {
    const attrs = Object.entries(node.attributes)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    if (attrs) {
      line += ` [${attrs}]`;
    }
  }

  lines.push(line);

  for (const child of node.children) {
    formatNode(child, depth + 1, lines, verbose);
  }
}

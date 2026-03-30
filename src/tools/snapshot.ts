/**
 * DOM snapshot and wait tools.
 * Mirrors chrome-devtools-mcp tool names: take_snapshot, wait_for
 */

import {z} from 'zod';
import {writeFile} from 'fs/promises';
import {formatSnapshot} from '../formatters/SnapshotFormatter.js';
import type {ToolHandler} from './types.js';

export const takeSnapshotSchema = {
  verbose: z
    .boolean()
    .optional()
    .describe(
      'Whether to include all possible information (tag names, attributes). Default is true.',
    ),
  filePath: z
    .string()
    .optional()
    .describe(
      'The absolute path, or a path relative to the current working directory, to save the snapshot to instead of attaching it to the response.',
    ),
};

export const takeSnapshot: ToolHandler = async (params, driver) => {
  const verbose = params.verbose !== false; // default true
  const tree = await driver.takeSnapshot(verbose);
  const text = formatSnapshot(tree, verbose);

  if (params.filePath) {
    await writeFile(params.filePath as string, text, 'utf-8');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Snapshot saved to ${params.filePath}.`,
        },
      ],
    };
  }

  return {
    content: [{type: 'text' as const, text}],
  };
};

export const waitForSchema = {
  text: z
    .array(z.string())
    .min(1)
    .describe(
      'Non-empty list of texts. Resolves when any value appears on the page.',
    ),
  timeout: z
    .number()
    .optional()
    .describe('Timeout in milliseconds. Default is 30000.'),
};

export const waitFor: ToolHandler = async (params, driver) => {
  const texts = params.text as string[];
  const timeout = params.timeout as number | undefined;

  try {
    const found = await driver.waitForText(texts, timeout);
    // Take a snapshot after waiting
    const tree = await driver.takeSnapshot();
    const snapshotText = formatSnapshot(tree);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Element matching "${found}" found.\n\n${snapshotText}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    };
  }
};

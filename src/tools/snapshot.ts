/**
 * DOM snapshot and wait tools.
 * Mirrors chrome-devtools-mcp tool names: take_snapshot, wait_for
 */

import {z} from 'zod';
import {writeFile} from 'fs/promises';
import {formatSnapshot} from '../formatters/SnapshotFormatter.js';
import {defineTool} from './types.js';

export const tools = [
  defineTool({
    name: 'take_snapshot',
    description:
      'Take a text snapshot of the currently selected page based on the DOM/a11y tree. The snapshot lists page elements along with a unique identifier (uid). Always use the latest snapshot. Prefer taking a snapshot over taking a screenshot.',
    slimDescription: 'Snapshot the page DOM/a11y tree with element UIDs.',
    schema: {
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
    },
    handler: async (params, driver) => {
      const verbose = params.verbose !== false; // default true
      const tree = await driver.takeSnapshot(verbose);
      const text = formatSnapshot(tree, verbose);

      if (params.filePath) {
        await writeFile(params.filePath, text, 'utf-8');
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
    },
  }),

  defineTool({
    name: 'wait_for',
    description:
      'Wait for a condition on the page: text content, a CSS selector, or a JS predicate. Returns a snapshot once the condition is met. At least one condition (text, selector, or predicate) must be provided.',
    slimDescription: 'Wait for text, selector, or JS condition.',
    schema: {
      text: z
        .array(z.string())
        .min(1)
        .optional()
        .describe(
          'List of texts. Resolves when any value appears in the page body.',
        ),
      selector: z
        .string()
        .optional()
        .describe(
          'CSS selector. Resolves when a matching element exists in the DOM.',
        ),
      visible: z
        .boolean()
        .optional()
        .describe(
          'When true and selector is set, waits for the element to be visible (not just present in DOM). Default is false.',
        ),
      predicate: z
        .string()
        .optional()
        .describe(
          'A JavaScript expression that must return a truthy value. Example: "document.querySelectorAll(\'.item\').length >= 5"',
        ),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in milliseconds. Default is 30000.'),
    },
    handler: async (params, driver) => {
      const hasText = params.text && params.text.length > 0;
      const hasSelector = !!params.selector;
      const hasPredicate = !!params.predicate;

      if (!hasText && !hasSelector && !hasPredicate) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'At least one condition must be provided: text, selector, or predicate.',
            },
          ],
          isError: true,
        };
      }

      try {
        let matched = '';

        if (hasText) {
          const found = await driver.waitForText(params.text!, params.timeout);
          matched = `Text "${found}" found.`;
        } else if (hasSelector) {
          await driver.waitForSelector(params.selector!, {
            visible: params.visible,
            timeout: params.timeout,
          });
          matched = params.visible
            ? `Selector "${params.selector}" is visible.`
            : `Selector "${params.selector}" found.`;
        } else if (hasPredicate) {
          await driver.waitForFunction(params.predicate!, params.timeout);
          matched = 'Predicate condition met.';
        }

        const tree = await driver.takeSnapshot();
        const snapshotText = formatSnapshot(tree);

        return {
          content: [
            {
              type: 'text' as const,
              text: `${matched}\n\n${snapshotText}`,
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
    },
  }),
];

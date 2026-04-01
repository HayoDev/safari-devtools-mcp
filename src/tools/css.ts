/**
 * CSS inspection tools.
 */

import {z} from 'zod';
import {defineTool} from './types.js';

const DEFAULT_PROPERTIES = [
  'display',
  'position',
  'width',
  'height',
  'margin',
  'padding',
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'text-align',
  'border',
  'border-radius',
  'overflow',
  'opacity',
  'visibility',
  'z-index',
  'flex-direction',
  'justify-content',
  'align-items',
  'gap',
  'grid-template-columns',
  'grid-template-rows',
  'box-sizing',
];

export const tools = [
  defineTool({
    name: 'get_computed_style',
    description:
      'Get computed CSS styles for an element by its UID from a snapshot. Returns commonly useful properties by default, or specify exact properties.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of an element on the page from the page content snapshot.',
        ),
      properties: z
        .array(z.string())
        .optional()
        .describe(
          'Specific CSS properties to return (e.g. ["color", "font-size", "display"]). When omitted, returns a curated set of commonly useful properties.',
        ),
    },
    handler: async (params, driver) => {
      const properties = params.properties ?? DEFAULT_PROPERTIES;
      const styles = await driver.getComputedStyle(params.uid, properties);

      if (!styles) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Element with uid="${params.uid}" not found. Take a snapshot first.`,
            },
          ],
        };
      }

      const lines = Object.entries(styles)
        .filter(
          ([, v]) => v !== '' && v !== 'none' && v !== 'normal' && v !== 'auto',
        )
        .map(([k, v]) => `  ${k}: ${v}`);

      if (lines.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No notable computed styles for uid="${params.uid}".`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Computed styles for uid="${params.uid}":\n\n${lines.join('\n')}`,
          },
        ],
      };
    },
  }),
];

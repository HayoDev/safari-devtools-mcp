/**
 * Scroll tools.
 * Provides scroll by direction and scroll-to-element capabilities.
 */

import {z} from 'zod';
import {defineTool} from './types.js';

export const tools = [
  defineTool({
    name: 'scroll',
    description: 'Scroll the page in a direction by a given amount of pixels.',
    slimDescription: 'Scroll the page.',
    schema: {
      direction: z
        .enum(['up', 'down', 'left', 'right'])
        .describe('The direction to scroll.'),
      amount: z
        .number()
        .optional()
        .describe('The number of pixels to scroll. Default is 500.'),
    },
    handler: async (params, driver) => {
      const amount = params.amount ?? 500;
      await driver.scroll(params.direction, amount);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Scrolled ${params.direction} by ${amount}px.`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'scroll_to_element',
    description: 'Scroll an element into view by its UID from a snapshot.',
    slimDescription: 'Scroll element into view.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of an element on the page from the page content snapshot.',
        ),
    },
    handler: async (params, driver) => {
      await driver.scrollToElement(params.uid);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Scrolled element ${params.uid} into view.`,
          },
        ],
      };
    },
  }),
];

/**
 * Scroll tools.
 * Provides scroll by direction and scroll-to-element capabilities.
 */

import {z} from 'zod';
import type {ToolHandler} from './types.js';

// ---- scroll ----

export const scrollSchema = {
  direction: z
    .enum(['up', 'down', 'left', 'right'])
    .describe('The direction to scroll.'),
  amount: z
    .number()
    .optional()
    .describe('The number of pixels to scroll. Default is 500.'),
};

export const scroll: ToolHandler = async (params, driver) => {
  const direction = params.direction as string;
  const amount = (params.amount as number | undefined) ?? 500;
  await driver.scroll(direction, amount);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Scrolled ${direction} by ${amount}px.`,
      },
    ],
  };
};

// ---- scroll_to_element ----

export const scrollToElementSchema = {
  uid: z
    .string()
    .describe(
      'The uid of an element on the page from the page content snapshot.',
    ),
};

export const scrollToElement: ToolHandler = async (params, driver) => {
  await driver.scrollToElement(params.uid as string);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Scrolled element ${params.uid} into view.`,
      },
    ],
  };
};

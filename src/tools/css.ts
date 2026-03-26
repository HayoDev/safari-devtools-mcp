/**
 * CSS inspection tools.
 */

import {z} from 'zod';
import type {ToolHandler} from './types.js';

export const getComputedStyleSchema = {
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
};

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

export const getComputedStyle: ToolHandler = async (params, driver) => {
  const uid = params.uid as string;
  const properties =
    (params.properties as string[] | undefined) ?? DEFAULT_PROPERTIES;

  const styles = await driver.getComputedStyle(uid, properties);

  if (!styles) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Element with uid="${uid}" not found. Take a snapshot first.`,
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
          text: `No notable computed styles for uid="${uid}".`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `Computed styles for uid="${uid}":\n\n${lines.join('\n')}`,
      },
    ],
  };
};

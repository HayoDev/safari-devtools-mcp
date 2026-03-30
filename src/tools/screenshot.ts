/**
 * Screenshot tool.
 * Mirrors chrome-devtools-mcp tool name: take_screenshot
 *
 * Note: Safari WebDriver only supports PNG format and does not support
 * fullPage screenshots natively. Element screenshots are supported via UIDs.
 */

import {z} from 'zod';
import {writeFile} from 'fs/promises';
import type {ToolHandler} from './types.js';

export const takeScreenshotSchema = {
  uid: z
    .string()
    .optional()
    .describe(
      'The uid of an element on the page from the page content snapshot. If omitted takes a page screenshot.',
    ),
  filePath: z
    .string()
    .optional()
    .describe(
      'The absolute path, or a path relative to the current working directory, to save the screenshot to instead of attaching it to the response.',
    ),
};

export const takeScreenshot: ToolHandler = async (params, driver) => {
  let base64Data: string;
  let description: string;

  if (params.uid) {
    base64Data = await driver.takeElementScreenshot(params.uid as string);
    description = `Took a screenshot of element with uid "${params.uid}".`;
  } else {
    base64Data = await driver.takeScreenshot();
    description = "Took a screenshot of the current page's viewport.";
  }

  if (params.filePath) {
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(params.filePath as string, buffer);
    return {
      content: [
        {
          type: 'text' as const,
          text: `${description}\nSaved screenshot to ${params.filePath}.`,
        },
      ],
    };
  }

  // Check size — if too large for inline base64, save to temp file
  if (base64Data.length >= 2_000_000) {
    const {tmpdir} = await import('os');
    const {join} = await import('path');
    const tempPath = join(tmpdir(), `safari-screenshot-${Date.now()}.png`);
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(tempPath, buffer);
    const sizeMB = (buffer.length / 1_048_576).toFixed(1);
    return {
      content: [
        {
          type: 'text' as const,
          text: [
            description,
            `\nScreenshot (${sizeMB} MB) exceeded the 1.5 MB inline limit and was saved to: ${tempPath}`,
            'Tip: Use the filePath parameter to save directly to a preferred location, or use resize_page to reduce viewport size before capturing.',
          ].join('\n'),
        },
      ],
    };
  }

  return {
    content: [
      {type: 'text' as const, text: description},
      {
        type: 'image' as const,
        data: base64Data,
        mimeType: 'image/png',
      },
    ],
  };
};

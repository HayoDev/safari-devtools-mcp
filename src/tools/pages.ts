/**
 * Page/tab management tools via AppleScript.
 * Mirrors chrome-devtools-mcp tool names: list_pages, select_page, close_page, new_page, navigate_page, resize_page
 */

import {z} from 'zod';
import type {ToolHandler} from './types.js';

// ---- list_pages ----

export const listPagesSchema = {};

export const listPages: ToolHandler = async (_params, driver) => {
  const pages = await driver.listPages();
  const lines = pages.map(
    p =>
      `  pageId=${p.pageId} ${p.isSelected ? '* ' : '  '}${p.title} (${p.url})`,
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: `Open pages (* = selected):\n${lines.join('\n')}`,
      },
    ],
  };
};

// ---- select_page ----

export const selectPageSchema = {
  pageId: z
    .number()
    .describe(
      'The ID of the page to select. Call list_pages to get available pages.',
    ),
};

export const selectPage: ToolHandler = async (params, driver) => {
  await driver.selectPage(params.pageId as number);
  const pages = await driver.listPages();
  const lines = pages.map(
    p =>
      `  pageId=${p.pageId} ${p.isSelected ? '* ' : '  '}${p.title} (${p.url})`,
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: `Selected page ${params.pageId}.\n\nOpen pages (* = selected):\n${lines.join('\n')}`,
      },
    ],
  };
};

// ---- close_page ----

export const closePageSchema = {
  pageId: z
    .number()
    .describe('The ID of the page to close. Call list_pages to list pages.'),
};

export const closePage: ToolHandler = async (params, driver) => {
  try {
    await driver.closePage(params.pageId as number);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Closed page ${params.pageId}.`,
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

// ---- new_page ----

export const newPageSchema = {
  url: z.string().describe('URL to load in a new page.'),
};

export const newPage: ToolHandler = async (params, driver) => {
  await driver.newPage(params.url as string);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Opened new page with URL: ${params.url}`,
      },
    ],
  };
};

// ---- navigate_page ----

export const navigatePageSchema = {
  type: z
    .enum(['url', 'back', 'forward', 'reload'])
    .optional()
    .describe(
      'Navigate the page by URL, back or forward in history, or reload.',
    ),
  url: z.string().optional().describe('Target URL (only type=url)'),
};

export const navigatePage: ToolHandler = async (params, driver) => {
  const type = (params.type as string) || (params.url ? 'url' : undefined);

  if (!type && !params.url) {
    return {
      content: [
        {type: 'text' as const, text: 'Either URL or a type is required.'},
      ],
      isError: true,
    };
  }

  try {
    switch (type || 'url') {
      case 'url':
        if (!params.url) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'A URL is required for navigation of type=url.',
              },
            ],
            isError: true,
          };
        }
        await driver.navigate(params.url as string);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Successfully navigated to ${params.url}.`,
            },
          ],
        };

      case 'back':
        await driver.goBack();
        return {
          content: [
            {
              type: 'text' as const,
              text: `Successfully navigated back to ${await driver.getCurrentUrl()}.`,
            },
          ],
        };

      case 'forward':
        await driver.goForward();
        return {
          content: [
            {
              type: 'text' as const,
              text: `Successfully navigated forward to ${await driver.getCurrentUrl()}.`,
            },
          ],
        };

      case 'reload':
        await driver.reload();
        return {
          content: [
            {type: 'text' as const, text: 'Successfully reloaded the page.'},
          ],
        };

      default:
        return {
          content: [
            {type: 'text' as const, text: `Unknown navigation type: ${type}`},
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

// ---- resize_page ----

export const resizePageSchema = {
  width: z.number().describe('Page width'),
  height: z.number().describe('Page height'),
};

export const resizePage: ToolHandler = async (params, driver) => {
  await driver.resizePage(params.width as number, params.height as number);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Resized page to ${params.width}x${params.height}.`,
      },
    ],
  };
};

// ---- handle_dialog ----

export const handleDialogSchema = {
  action: z
    .enum(['accept', 'dismiss'])
    .describe('Whether to dismiss or accept the dialog'),
  promptText: z
    .string()
    .optional()
    .describe('Optional prompt text to enter into the dialog.'),
};

export const handleDialog: ToolHandler = async (params, driver) => {
  // Safari WebDriver handles alerts via the driver's switchTo().alert() API
  try {
    const d = await driver.ensureDriver();
    const alert = await d.switchTo().alert();

    if (params.promptText) {
      await alert.sendKeys(params.promptText as string);
    }

    if (params.action === 'accept') {
      await alert.accept();
      return {
        content: [
          {type: 'text' as const, text: 'Successfully accepted the dialog.'},
        ],
      };
    } else {
      await alert.dismiss();
      return {
        content: [
          {type: 'text' as const, text: 'Successfully dismissed the dialog.'},
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No open dialog found or error handling dialog: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * Page/tab management tools via AppleScript.
 * Mirrors chrome-devtools-mcp tool names: list_pages, select_page, close_page, new_page, navigate_page, resize_page
 */

import {z} from 'zod';
import {defineTool} from './types.js';

export const tools = [
  defineTool({
    name: 'list_pages',
    description: 'Get a list of pages (tabs) open in Safari.',
    slimDescription: 'List open pages.',
    schema: {},
    handler: async (_params, driver) => {
      const pages = await driver.listPages();
      const lines = pages.map(
        p =>
          `  pageId=${p.pageId} ${p.isSelected ? '* ' : '  '}${p.title} (${p.url})`,
      );

      let text = `Open pages (* = selected):\n${lines.join('\n')}`;
      const warnings = pages.filter(p => p.warning).map(p => p.warning);
      if (warnings.length > 0) {
        text += `\n\n⚠️ ${warnings.join('\n')}`;
      }

      return {
        content: [{type: 'text' as const, text}],
      };
    },
  }),

  defineTool({
    name: 'select_page',
    description: 'Select a page as context for future tool calls.',
    slimDescription: 'Select a page.',
    schema: {
      pageId: z
        .number()
        .describe(
          'The ID of the page to select. Call list_pages to get available pages.',
        ),
    },
    handler: async (params, driver) => {
      await driver.selectPage(params.pageId);
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
    },
  }),

  defineTool({
    name: 'close_page',
    description:
      'Closes a page by its ID. The last open page cannot be closed.',
    slimDescription: 'Close a page.',
    schema: {
      pageId: z
        .number()
        .describe(
          'The ID of the page to close. Call list_pages to list pages.',
        ),
    },
    handler: async (params, driver) => {
      try {
        await driver.closePage(params.pageId);
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
    },
  }),

  defineTool({
    name: 'new_page',
    description: 'Open a new tab and load a URL.',
    slimDescription: 'Open new tab with URL.',
    schema: {
      url: z.string().describe('URL to load in a new page.'),
    },
    handler: async (params, driver) => {
      const result = await driver.newPage(params.url);
      let text = `Opened new page with URL: ${params.url}`;
      if (result.warning) {
        text += `\n\n⚠️ ${result.warning}`;
      }
      return {
        content: [{type: 'text' as const, text}],
      };
    },
  }),

  defineTool({
    name: 'navigate_page',
    description: 'Go to a URL, or back, forward, or reload.',
    slimDescription: 'Navigate to URL or back/forward/reload.',
    schema: {
      type: z
        .enum(['url', 'back', 'forward', 'reload'])
        .optional()
        .describe(
          'Navigate the page by URL, back or forward in history, or reload.',
        ),
      url: z.string().optional().describe('Target URL (only type=url)'),
    },
    handler: async (params, driver) => {
      const type = params.type || (params.url ? 'url' : undefined);

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
            await driver.navigate(params.url);
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
                {
                  type: 'text' as const,
                  text: 'Successfully reloaded the page.',
                },
              ],
            };

          default:
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Unknown navigation type: ${type}`,
                },
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
    },
  }),

  defineTool({
    name: 'resize_page',
    description:
      "Resizes the selected page's window so that the page has specified dimensions.",
    slimDescription: 'Resize page viewport.',
    schema: {
      width: z.number().describe('Page width'),
      height: z.number().describe('Page height'),
    },
    handler: async (params, driver) => {
      await driver.resizePage(params.width, params.height);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Resized page to ${params.width}x${params.height}.`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'handle_dialog',
    description:
      'If a browser dialog was opened, use this command to handle it.',
    slimDescription: 'Accept or dismiss a dialog.',
    schema: {
      action: z
        .enum(['accept', 'dismiss'])
        .describe('Whether to dismiss or accept the dialog'),
      promptText: z
        .string()
        .optional()
        .describe('Optional prompt text to enter into the dialog.'),
    },
    handler: async (params, driver) => {
      try {
        const d = await driver.ensureDriver();
        const alert = await d.switchTo().alert();

        if (params.promptText) {
          await alert.sendKeys(params.promptText);
        }

        if (params.action === 'accept') {
          await alert.accept();
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Successfully accepted the dialog.',
              },
            ],
          };
        } else {
          await alert.dismiss();
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Successfully dismissed the dialog.',
              },
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
    },
  }),
];

/**
 * Console debugging tools.
 * Mirrors chrome-devtools-mcp tool names: list_console_messages, get_console_message
 */

import {z} from 'zod';
import {
  formatConsoleMessage,
  formatConsoleMessages,
} from '../formatters/ConsoleFormatter.js';
import {defineTool} from './types.js';

const FILTERABLE_LEVELS = [
  'log',
  'debug',
  'info',
  'error',
  'warn',
  'trace',
  'assert',
  'dir',
  'table',
  'clear',
  'count',
  'timeEnd',
] as const;

export const tools = [
  defineTool({
    name: 'list_console_messages',
    description:
      'List all console messages for the currently selected page since the last navigation.',
    schema: {
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Maximum number of messages to return. When omitted, returns all messages.',
        ),
      pageIdx: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'Page number to return (0-based). When omitted, returns the first page.',
        ),
      types: z
        .array(z.enum(FILTERABLE_LEVELS))
        .optional()
        .describe(
          'Filter messages to only return messages of the specified types. When omitted or empty, returns all messages.',
        ),
    },
    handler: async (params, driver) => {
      const allLogs = await driver.getConsoleLogs();
      const filtered = await driver.getConsoleLogs({
        types: params.types,
        pageSize: params.pageSize,
        pageIdx: params.pageIdx,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatConsoleMessages(filtered, allLogs.length),
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'get_console_message',
    description:
      'Gets a console message by its ID. You can get all messages by calling list_console_messages.',
    schema: {
      msgid: z
        .number()
        .describe(
          'The msgid of a console message on the page from the listed console messages',
        ),
    },
    handler: async (params, driver) => {
      const log = await driver.getConsoleMessage(params.msgid);
      if (!log) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Console message with msgid=${params.msgid} not found.`,
            },
          ],
        };
      }

      return {
        content: [{type: 'text' as const, text: formatConsoleMessage(log)}],
      };
    },
  }),

  defineTool({
    name: 'clear_console',
    description: 'Clear all captured console messages.',
    schema: {},
    handler: async (_params, driver) => {
      await driver.clearConsoleLogs();
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Console messages cleared.',
          },
        ],
      };
    },
  }),
];

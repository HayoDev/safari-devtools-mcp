/**
 * Console debugging tools.
 * Mirrors chrome-devtools-mcp tool names: list_console_messages, get_console_message
 */

import {z} from 'zod';
import {
  formatConsoleMessage,
  formatConsoleMessages,
} from '../formatters/ConsoleFormatter.js';
import type {ToolHandler} from './types.js';

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

export const listConsoleMessagesSchema = {
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
};

export const listConsoleMessages: ToolHandler = async (params, driver) => {
  const allLogs = await driver.getConsoleLogs();
  const filtered = await driver.getConsoleLogs({
    types: params.types as string[] | undefined,
    pageSize: params.pageSize as number | undefined,
    pageIdx: params.pageIdx as number | undefined,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: formatConsoleMessages(filtered, allLogs.length),
      },
    ],
  };
};

export const clearConsoleSchema = {};

export const clearConsole: ToolHandler = async (_params, driver) => {
  await driver.clearConsoleLogs();
  return {
    content: [
      {
        type: 'text' as const,
        text: 'Console messages cleared.',
      },
    ],
  };
};

export const getConsoleMessageSchema = {
  msgid: z
    .number()
    .describe(
      'The msgid of a console message on the page from the listed console messages',
    ),
};

export const getConsoleMessage: ToolHandler = async (params, driver) => {
  const log = await driver.getConsoleMessage(params.msgid as number);
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
};

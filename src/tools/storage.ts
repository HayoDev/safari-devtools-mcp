/**
 * Browser storage tools (localStorage and sessionStorage).
 */

import {z} from 'zod';
import {defineTool} from './types.js';

const STORAGE_TYPES = ['localStorage', 'sessionStorage'] as const;

export const tools = [
  defineTool({
    name: 'get_storage',
    description:
      'Read from localStorage or sessionStorage. Returns all entries or a specific key.',
    slimDescription: 'Read browser storage.',
    schema: {
      storageType: z
        .enum(STORAGE_TYPES)
        .optional()
        .describe('Which storage to read. Defaults to "localStorage".'),
      key: z
        .string()
        .optional()
        .describe(
          'Specific key to retrieve. When omitted, returns all key-value pairs.',
        ),
    },
    handler: async (params, driver) => {
      const type = params.storageType ?? 'localStorage';
      const key = params.key;

      const result = await driver.getStorage(type, key);

      if (key) {
        if (result === null) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Key "${key}" not found in ${type}.`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `${type}["${key}"] = ${result}`,
            },
          ],
        };
      }

      const entries = result as Record<string, string>;
      const keys = Object.keys(entries);
      if (keys.length === 0) {
        return {
          content: [{type: 'text' as const, text: `${type} is empty.`}],
        };
      }

      const lines = keys.map(k => `  ${k} = ${entries[k]}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `${type} (${keys.length} entries):\n\n${lines.join('\n')}`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'set_storage',
    description: 'Write a key-value pair to localStorage or sessionStorage.',
    slimDescription: 'Write to browser storage.',
    schema: {
      storageType: z
        .enum(STORAGE_TYPES)
        .optional()
        .describe('Which storage to write to. Defaults to "localStorage".'),
      key: z.string().describe('Storage key.'),
      value: z.string().describe('Value to store.'),
    },
    handler: async (params, driver) => {
      const type = params.storageType ?? 'localStorage';
      await driver.setStorage(type, params.key, params.value);

      return {
        content: [
          {
            type: 'text' as const,
            text: `${type}["${params.key}"] set successfully.`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'delete_storage',
    description:
      'Delete a key from localStorage or sessionStorage, or clear all entries.',
    slimDescription: 'Delete from browser storage.',
    schema: {
      storageType: z
        .enum(STORAGE_TYPES)
        .optional()
        .describe('Which storage to delete from. Defaults to "localStorage".'),
      key: z
        .string()
        .optional()
        .describe('Key to delete. When omitted, clears all entries.'),
    },
    handler: async (params, driver) => {
      const type = params.storageType ?? 'localStorage';
      const key = params.key;

      if (key) {
        await driver.deleteStorage(type, key);
        return {
          content: [
            {
              type: 'text' as const,
              text: `${type}["${key}"] deleted.`,
            },
          ],
        };
      }

      await driver.clearStorage(type);
      return {
        content: [
          {
            type: 'text' as const,
            text: `${type} cleared.`,
          },
        ],
      };
    },
  }),
];

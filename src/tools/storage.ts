/**
 * Browser storage tools (localStorage and sessionStorage).
 */

import {z} from 'zod';
import type {ToolHandler} from './types.js';

const STORAGE_TYPES = ['localStorage', 'sessionStorage'] as const;

export const getStorageSchema = {
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
};

export const getStorage: ToolHandler = async (params, driver) => {
  const type = (params.storageType as string) ?? 'localStorage';
  const key = params.key as string | undefined;

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
};

export const setStorageSchema = {
  storageType: z
    .enum(STORAGE_TYPES)
    .optional()
    .describe('Which storage to write to. Defaults to "localStorage".'),
  key: z.string().describe('Storage key.'),
  value: z.string().describe('Value to store.'),
};

export const setStorage: ToolHandler = async (params, driver) => {
  const type = (params.storageType as string) ?? 'localStorage';
  await driver.setStorage(type, params.key as string, params.value as string);

  return {
    content: [
      {
        type: 'text' as const,
        text: `${type}["${params.key}"] set successfully.`,
      },
    ],
  };
};

export const deleteStorageSchema = {
  storageType: z
    .enum(STORAGE_TYPES)
    .optional()
    .describe('Which storage to delete from. Defaults to "localStorage".'),
  key: z
    .string()
    .optional()
    .describe('Key to delete. When omitted, clears all entries.'),
};

export const deleteStorage: ToolHandler = async (params, driver) => {
  const type = (params.storageType as string) ?? 'localStorage';
  const key = params.key as string | undefined;

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
};

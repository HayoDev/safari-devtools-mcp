/**
 * Network monitoring tools.
 * Mirrors chrome-devtools-mcp tool names: list_network_requests, get_network_request
 */

import {z} from 'zod';
import {
  formatNetworkRequest,
  formatNetworkRequests,
} from '../formatters/NetworkFormatter.js';
import type {ToolHandler} from './types.js';

const FILTERABLE_RESOURCE_TYPES = [
  'document',
  'stylesheet',
  'image',
  'media',
  'font',
  'script',
  'xhr',
  'fetch',
  'websocket',
  'other',
] as const;

export const listNetworkRequestsSchema = {
  pageSize: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Maximum number of requests to return. When omitted, returns all requests.',
    ),
  pageIdx: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Page number to return (0-based). When omitted, returns the first page.',
    ),
  resourceTypes: z
    .array(z.enum(FILTERABLE_RESOURCE_TYPES))
    .optional()
    .describe(
      'Filter requests to only return requests of the specified resource types. When omitted or empty, returns all requests.',
    ),
};

export const listNetworkRequests: ToolHandler = async (params, driver) => {
  const allLogs = await driver.getNetworkLogs();
  const filtered = await driver.getNetworkLogs({
    resourceTypes: params.resourceTypes as string[] | undefined,
    pageSize: params.pageSize as number | undefined,
    pageIdx: params.pageIdx as number | undefined,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: formatNetworkRequests(filtered, allLogs.length),
      },
    ],
  };
};

export const clearNetworkSchema = {};

export const clearNetwork: ToolHandler = async (_params, driver) => {
  await driver.clearNetworkLogs();
  return {
    content: [
      {
        type: 'text' as const,
        text: 'Network logs cleared.',
      },
    ],
  };
};

export const getNetworkRequestSchema = {
  reqid: z
    .number()
    .describe('The reqid of the network request from the listed requests.'),
};

export const getNetworkRequest: ToolHandler = async (params, driver) => {
  const log = await driver.getNetworkRequest(params.reqid as number);
  if (!log) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Network request with reqid=${params.reqid} not found.`,
        },
      ],
    };
  }

  return {
    content: [{type: 'text' as const, text: formatNetworkRequest(log)}],
  };
};

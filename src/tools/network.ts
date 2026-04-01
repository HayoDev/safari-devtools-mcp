/**
 * Network monitoring tools.
 * Mirrors chrome-devtools-mcp tool names: list_network_requests, get_network_request
 */

import {z} from 'zod';
import {
  formatNetworkRequest,
  formatNetworkRequests,
} from '../formatters/NetworkFormatter.js';
import {defineTool} from './types.js';

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

export const tools = [
  defineTool({
    name: 'list_network_requests',
    description:
      'List all network requests for the currently selected page since the last navigation. Includes historical requests made before monitoring started (with limited detail).',
    schema: {
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
    },
    handler: async (params, driver) => {
      const allLogs = await driver.getNetworkLogs();
      const filtered = await driver.getNetworkLogs({
        resourceTypes: params.resourceTypes,
        pageSize: params.pageSize,
        pageIdx: params.pageIdx,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatNetworkRequests(filtered, allLogs.length),
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'get_network_request',
    description:
      'Gets a network request by its reqid from the listed requests.',
    schema: {
      reqid: z
        .number()
        .describe('The reqid of the network request from the listed requests.'),
    },
    handler: async (params, driver) => {
      const log = await driver.getNetworkRequest(params.reqid);
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
    },
  }),

  defineTool({
    name: 'clear_network',
    description: 'Clear all captured network requests.',
    schema: {},
    handler: async (_params, driver) => {
      await driver.clearNetworkLogs();
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Network logs cleared.',
          },
        ],
      };
    },
  }),
];

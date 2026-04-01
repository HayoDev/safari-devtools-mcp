/**
 * Cookie management tools.
 */

import {z} from 'zod';
import {defineTool} from './types.js';

export const tools = [
  defineTool({
    name: 'get_cookies',
    description:
      'Get browser cookies for the current page. Optionally filter by name or domain.',
    schema: {
      name: z
        .string()
        .optional()
        .describe('Filter by cookie name. When omitted, returns all cookies.'),
      domain: z
        .string()
        .optional()
        .describe(
          'Filter by domain. When omitted, returns cookies for all domains.',
        ),
    },
    handler: async (params, driver) => {
      const cookies = await driver.getCookies();
      let filtered = cookies;

      if (params.name) {
        filtered = filtered.filter(c => c.name === params.name);
      }
      if (params.domain) {
        filtered = filtered.filter(c => c.domain?.includes(params.domain!));
      }

      if (filtered.length === 0) {
        return {
          content: [{type: 'text' as const, text: 'No cookies found.'}],
        };
      }

      const lines = filtered.map(c => {
        const parts = [`${c.name}=${c.value}`];
        if (c.domain) parts.push(`domain=${c.domain}`);
        if (c.path) parts.push(`path=${c.path}`);
        if (c.secure) parts.push('secure');
        if (c.httpOnly) parts.push('httpOnly');
        if (c.expiry) {
          parts.push(`expires=${new Date(c.expiry * 1000).toISOString()}`);
        }
        return parts.join('; ');
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Cookies (${filtered.length}):\n\n${lines.join('\n')}`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'set_cookie',
    description:
      'Set a browser cookie with the given name, value, and optional attributes.',
    schema: {
      name: z.string().describe('Cookie name.'),
      value: z.string().describe('Cookie value.'),
      domain: z
        .string()
        .optional()
        .describe('Cookie domain. Defaults to current page domain.'),
      path: z.string().optional().describe('Cookie path. Defaults to "/".'),
      secure: z
        .boolean()
        .optional()
        .describe('Whether the cookie is secure (HTTPS only).'),
      httpOnly: z
        .boolean()
        .optional()
        .describe(
          'Whether the cookie is HTTP-only (not accessible via JavaScript).',
        ),
      expiry: z
        .number()
        .optional()
        .describe(
          'Cookie expiry as a Unix timestamp in seconds. Omit for session cookie.',
        ),
    },
    handler: async (params, driver) => {
      await driver.setCookie({
        name: params.name,
        value: params.value,
        domain: params.domain,
        path: params.path ?? '/',
        secure: params.secure,
        httpOnly: params.httpOnly,
        expiry: params.expiry,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Cookie "${params.name}" set successfully.`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'delete_cookie',
    description:
      'Delete a cookie by name, or delete all cookies when no name is provided.',
    schema: {
      name: z
        .string()
        .optional()
        .describe('Cookie name to delete. When omitted, deletes all cookies.'),
    },
    handler: async (params, driver) => {
      if (params.name) {
        await driver.deleteCookie(params.name);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Cookie "${params.name}" deleted.`,
            },
          ],
        };
      }

      await driver.deleteAllCookies();
      return {
        content: [{type: 'text' as const, text: 'All cookies deleted.'}],
      };
    },
  }),
];

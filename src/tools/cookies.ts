/**
 * Cookie management tools.
 */

import {z} from 'zod';
import type {ToolHandler} from './types.js';

export const getCookiesSchema = {
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
};

export const getCookies: ToolHandler = async (params, driver) => {
  const cookies = await driver.getCookies();
  let filtered = cookies;

  if (params.name) {
    filtered = filtered.filter(c => c.name === params.name);
  }
  if (params.domain) {
    filtered = filtered.filter(c =>
      c.domain?.includes(params.domain as string),
    );
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
};

export const setCookieSchema = {
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
};

export const setCookie: ToolHandler = async (params, driver) => {
  await driver.setCookie({
    name: params.name as string,
    value: params.value as string,
    domain: params.domain as string | undefined,
    path: (params.path as string | undefined) ?? '/',
    secure: params.secure as boolean | undefined,
    httpOnly: params.httpOnly as boolean | undefined,
    expiry: params.expiry as number | undefined,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: `Cookie "${params.name}" set successfully.`,
      },
    ],
  };
};

export const deleteCookieSchema = {
  name: z
    .string()
    .optional()
    .describe('Cookie name to delete. When omitted, deletes all cookies.'),
};

export const deleteCookie: ToolHandler = async (params, driver) => {
  if (params.name) {
    await driver.deleteCookie(params.name as string);
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
};

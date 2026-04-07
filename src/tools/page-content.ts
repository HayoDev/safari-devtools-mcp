/**
 * Page content extraction tools.
 * Get page text, HTML source, links, and meta tags.
 */

import {z} from 'zod';
import {writeFile} from 'fs/promises';
import {defineTool} from './types.js';

export const tools = [
  defineTool({
    name: 'get_page_content',
    description: 'Get the page title, URL, and visible text content.',
    slimDescription: 'Get page title, URL, and text.',
    schema: {},
    handler: async (_params, driver) => {
      const result = await driver.getPageContent();
      const lines = [
        `Title: ${result.title}`,
        `URL: ${result.url}`,
        '',
        result.text,
      ];

      return {
        content: [{type: 'text' as const, text: lines.join('\n')}],
      };
    },
  }),

  defineTool({
    name: 'get_html_source',
    description: 'Get the full HTML source of the current page.',
    slimDescription: 'Get HTML source.',
    schema: {
      filePath: z
        .string()
        .optional()
        .describe(
          'Absolute or relative path to save the HTML source' +
            ' to instead of returning it.',
        ),
    },
    handler: async (params, driver) => {
      const html = await driver.getHtmlSource();

      if (params.filePath) {
        await writeFile(params.filePath, html, 'utf-8');
        return {
          content: [
            {
              type: 'text' as const,
              text: `HTML source saved to ${params.filePath}.`,
            },
          ],
        };
      }

      return {
        content: [{type: 'text' as const, text: html}],
      };
    },
  }),

  defineTool({
    name: 'extract_links',
    description:
      'Extract all links from the current page with their text and href.',
    slimDescription: 'Extract page links.',
    schema: {},
    handler: async (_params, driver) => {
      const links = await driver.extractLinks();

      if (links.length === 0) {
        return {
          content: [
            {type: 'text' as const, text: 'No links found on the page.'},
          ],
        };
      }

      const lines = links.map(
        l =>
          `  ${l.text || '(no text)'} -> ${l.href}` +
          (l.rel ? ` [rel=${l.rel}]` : ''),
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${links.length} link(s):\n${lines.join('\n')}`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'extract_meta',
    description:
      'Extract meta tags from the current page (og:, twitter:, description, etc.).',
    slimDescription: 'Extract meta tags.',
    schema: {},
    handler: async (_params, driver) => {
      const meta = await driver.extractMeta();

      if (meta.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No meta tags found on the page.',
            },
          ],
        };
      }

      const lines = meta.map(m => `  ${m.name}: ${m.content}`);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${meta.length} meta tag(s):\n` + lines.join('\n'),
          },
        ],
      };
    },
  }),
];

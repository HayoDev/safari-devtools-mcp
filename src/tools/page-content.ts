/**
 * Page content extraction tools.
 * Get page text, HTML source, links, and meta tags.
 */

import {z} from 'zod';
import {writeFile} from 'fs/promises';
import type {ToolHandler} from './types.js';

// ---- get_page_content ----

export const getPageContentSchema = {};

export const getPageContent: ToolHandler = async (_params, driver) => {
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
};

// ---- get_html_source ----

export const getHtmlSourceSchema = {
  filePath: z
    .string()
    .optional()
    .describe(
      'Absolute or relative path to save the HTML source' +
        ' to instead of returning it.',
    ),
};

export const getHtmlSource: ToolHandler = async (params, driver) => {
  const html = await driver.getHtmlSource();

  if (params.filePath) {
    await writeFile(String(params.filePath), html, 'utf-8');
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
};

// ---- extract_links ----

export const extractLinksSchema = {};

export const extractLinks: ToolHandler = async (_params, driver) => {
  const links = await driver.extractLinks();

  if (links.length === 0) {
    return {
      content: [{type: 'text' as const, text: 'No links found on the page.'}],
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
};

// ---- extract_meta ----

export const extractMetaSchema = {};

export const extractMeta: ToolHandler = async (_params, driver) => {
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
};

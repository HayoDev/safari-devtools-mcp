/**
 * JavaScript evaluation tool.
 * Mirrors chrome-devtools-mcp tool name: evaluate_script
 */

import {z} from 'zod';
import type {ToolHandler} from './types.js';

export const evaluateScriptSchema = {
  function: z.string().describe(
    `A JavaScript function declaration to be executed in the currently selected page.
Example without arguments: \`() => {
  return document.title
}\` or \`async () => {
  return await fetch("example.com")
}\`.
Example with arguments: \`(el) => {
  return el.innerText;
}\`
`,
  ),
  args: z
    .array(
      z
        .string()
        .describe(
          'The uid of an element on the page from the page content snapshot',
        ),
    )
    .optional()
    .describe('An optional list of element UIDs to pass as arguments.'),
};

export const evaluateScript: ToolHandler = async (params, driver) => {
  try {
    const result = await driver.evaluateScript(
      params.function as string,
      params.args as string[] | undefined,
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: `Script ran on page and returned:\n\`\`\`json\n${result}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Script evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

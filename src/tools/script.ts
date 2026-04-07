/**
 * JavaScript evaluation tool.
 * Mirrors chrome-devtools-mcp tool name: evaluate_script
 */

import {z} from 'zod';
import {defineTool} from './types.js';

export const tools = [
  defineTool({
    name: 'evaluate_script',
    description:
      'Evaluate a JavaScript function inside the currently selected page. Returns the response as JSON, so returned values have to be JSON-serializable.',
    slimDescription: 'Evaluate JavaScript in page. Returns JSON.',
    schema: {
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
    },
    handler: async (params, driver) => {
      try {
        const result = await driver.evaluateScript(
          params.function,
          params.args,
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
    },
  }),
];

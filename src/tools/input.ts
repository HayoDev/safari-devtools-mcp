/**
 * Input automation tools.
 * Mirrors chrome-devtools-mcp tool names: click, hover, fill, fill_form, type_text, drag, press_key, upload_file
 */

import {z} from 'zod';
import {defineTool} from './types.js';

export const tools = [
  defineTool({
    name: 'click',
    description: 'Clicks on the provided element.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of an element on the page from the page content snapshot',
        ),
      dblClick: z
        .boolean()
        .optional()
        .describe('Set to true for double clicks. Default is false.'),
    },
    handler: async (params, driver) => {
      try {
        await driver.clickElement(params.uid, params.dblClick);
        return {
          content: [
            {
              type: 'text' as const,
              text: params.dblClick
                ? 'Successfully double clicked on the element.'
                : 'Successfully clicked on the element.',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to interact with element uid ${params.uid}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  }),

  defineTool({
    name: 'click_at',
    description: 'Clicks at the provided coordinates.',
    schema: {
      x: z.number().describe('The x coordinate'),
      y: z.number().describe('The y coordinate'),
      dblClick: z
        .boolean()
        .optional()
        .describe('Set to true for double clicks. Default is false.'),
    },
    handler: async (params, driver) => {
      await driver.clickAtCoordinates(params.x, params.y, params.dblClick);
      return {
        content: [
          {
            type: 'text' as const,
            text: params.dblClick
              ? 'Successfully double clicked at the coordinates.'
              : 'Successfully clicked at the coordinates.',
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'right_click',
    description: 'Right-click (context click) on the provided element.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of an element on the page from the page content snapshot',
        ),
    },
    handler: async (params, driver) => {
      await driver.rightClick(params.uid);
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Successfully right-clicked on the element.',
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'select_option',
    description:
      'Select an option from a <select> dropdown by value or visible label.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of a <select> element from the page content snapshot.',
        ),
      value: z.string().optional().describe('The option value to select.'),
      label: z
        .string()
        .optional()
        .describe('The visible text of the option to select.'),
    },
    handler: async (params, driver) => {
      await driver.selectOption(params.uid, params.value, params.label);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Selected option${params.label ? ` "${params.label}"` : ''}${params.value ? ` (value: ${params.value})` : ''}.`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'hover',
    description: 'Hover over the provided element.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of an element on the page from the page content snapshot',
        ),
    },
    handler: async (params, driver) => {
      try {
        await driver.hoverElement(params.uid);
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Successfully hovered over the element.',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to hover over element uid ${params.uid}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  }),

  defineTool({
    name: 'fill',
    description:
      'Type text into an input, text area or select an option from a <select> element.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of an element on the page from the page content snapshot',
        ),
      value: z.string().describe('The value to fill in'),
    },
    handler: async (params, driver) => {
      try {
        await driver.fillElement(params.uid, params.value);
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Successfully filled out the element.',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to fill element uid ${params.uid}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  }),

  defineTool({
    name: 'fill_form',
    description: 'Fill out multiple form elements at once.',
    schema: {
      elements: z
        .array(
          z.object({
            uid: z.string().describe('The uid of the element to fill out'),
            value: z.string().describe('Value for the element'),
          }),
        )
        .describe('Elements from snapshot to fill out.'),
    },
    handler: async (params, driver) => {
      for (const el of params.elements) {
        await driver.fillElement(el.uid, el.value);
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Successfully filled out the form.',
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'type_text',
    description: 'Type text using keyboard into a previously focused input.',
    schema: {
      text: z.string().describe('The text to type'),
      submitKey: z
        .string()
        .optional()
        .describe(
          'Optional key to press after typing. E.g., "Enter", "Tab", "Escape"',
        ),
    },
    handler: async (params, driver) => {
      await driver.typeText(params.text, params.submitKey);
      const suffix = params.submitKey ? ` + ${params.submitKey}` : '';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Typed text "${params.text}${suffix}"`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'drag',
    description: 'Drag an element onto another element.',
    schema: {
      from_uid: z.string().describe('The uid of the element to drag'),
      to_uid: z.string().describe('The uid of the element to drop into'),
    },
    handler: async (params, driver) => {
      await driver.dragElement(params.from_uid, params.to_uid);
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Successfully dragged the element.',
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'press_key',
    description:
      'Press a key or key combination. Use this when other input methods like fill() cannot be used.',
    schema: {
      key: z
        .string()
        .describe(
          'A key or a combination (e.g., "Enter", "Control+A", "Meta+Shift+R"). Modifiers: Control, Shift, Alt, Meta',
        ),
    },
    handler: async (params, driver) => {
      await driver.pressKey(params.key);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully pressed key: ${params.key}`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'upload_file',
    description: 'Upload a file through a provided file input element.',
    schema: {
      uid: z
        .string()
        .describe(
          'The uid of the file input element on the page from the page content snapshot',
        ),
      filePath: z.string().describe('The local path of the file to upload'),
    },
    handler: async (params, driver) => {
      try {
        await driver.uploadFile(params.uid, params.filePath);
        return {
          content: [
            {
              type: 'text' as const,
              text: `File uploaded from ${params.filePath}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  }),
];

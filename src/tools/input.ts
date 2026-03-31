/**
 * Input automation tools.
 * Mirrors chrome-devtools-mcp tool names: click, hover, fill, fill_form, type_text, drag, press_key, upload_file
 */

import {z} from 'zod';
import type {ToolHandler} from './types.js';

// ---- click ----

export const clickSchema = {
  uid: z
    .string()
    .describe(
      'The uid of an element on the page from the page content snapshot',
    ),
  dblClick: z
    .boolean()
    .optional()
    .describe('Set to true for double clicks. Default is false.'),
};

export const click: ToolHandler = async (params, driver) => {
  try {
    await driver.clickElement(
      params.uid as string,
      params.dblClick as boolean | undefined,
    );
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
};

// ---- click_at ----

export const clickAtSchema = {
  x: z.number().describe('The x coordinate'),
  y: z.number().describe('The y coordinate'),
  dblClick: z
    .boolean()
    .optional()
    .describe('Set to true for double clicks. Default is false.'),
};

export const clickAt: ToolHandler = async (params, driver) => {
  await driver.clickAtCoordinates(
    params.x as number,
    params.y as number,
    params.dblClick as boolean | undefined,
  );
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
};

// ---- right_click ----

export const rightClickSchema = {
  uid: z
    .string()
    .describe(
      'The uid of an element on the page from the page content snapshot',
    ),
};

export const rightClick: ToolHandler = async (params, driver) => {
  await driver.rightClick(params.uid as string);
  return {
    content: [
      {
        type: 'text' as const,
        text: 'Successfully right-clicked on the element.',
      },
    ],
  };
};

// ---- select_option ----

export const selectOptionSchema = {
  uid: z
    .string()
    .describe('The uid of a <select> element from the page content snapshot.'),
  value: z.string().optional().describe('The option value to select.'),
  label: z
    .string()
    .optional()
    .describe('The visible text of the option to select.'),
};

export const selectOption: ToolHandler = async (params, driver) => {
  await driver.selectOption(
    params.uid as string,
    params.value as string | undefined,
    params.label as string | undefined,
  );
  return {
    content: [
      {
        type: 'text' as const,
        text: `Selected option${params.label ? ` "${params.label}"` : ''}${params.value ? ` (value: ${params.value})` : ''}.`,
      },
    ],
  };
};

// ---- hover ----

export const hoverSchema = {
  uid: z
    .string()
    .describe(
      'The uid of an element on the page from the page content snapshot',
    ),
};

export const hover: ToolHandler = async (params, driver) => {
  try {
    await driver.hoverElement(params.uid as string);
    return {
      content: [
        {type: 'text' as const, text: 'Successfully hovered over the element.'},
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
};

// ---- fill ----

export const fillSchema = {
  uid: z
    .string()
    .describe(
      'The uid of an element on the page from the page content snapshot',
    ),
  value: z.string().describe('The value to fill in'),
};

export const fill: ToolHandler = async (params, driver) => {
  try {
    await driver.fillElement(params.uid as string, params.value as string);
    return {
      content: [
        {type: 'text' as const, text: 'Successfully filled out the element.'},
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
};

// ---- fill_form ----

export const fillFormSchema = {
  elements: z
    .array(
      z.object({
        uid: z.string().describe('The uid of the element to fill out'),
        value: z.string().describe('Value for the element'),
      }),
    )
    .describe('Elements from snapshot to fill out.'),
};

export const fillForm: ToolHandler = async (params, driver) => {
  const elements = params.elements as {uid: string; value: string}[];
  for (const el of elements) {
    await driver.fillElement(el.uid, el.value);
  }
  return {
    content: [
      {type: 'text' as const, text: 'Successfully filled out the form.'},
    ],
  };
};

// ---- type_text ----

export const typeTextSchema = {
  text: z.string().describe('The text to type'),
  submitKey: z
    .string()
    .optional()
    .describe(
      'Optional key to press after typing. E.g., "Enter", "Tab", "Escape"',
    ),
};

export const typeText: ToolHandler = async (params, driver) => {
  await driver.typeText(
    params.text as string,
    params.submitKey as string | undefined,
  );
  const suffix = params.submitKey ? ` + ${params.submitKey}` : '';
  return {
    content: [
      {
        type: 'text' as const,
        text: `Typed text "${params.text}${suffix}"`,
      },
    ],
  };
};

// ---- drag ----

export const dragSchema = {
  from_uid: z.string().describe('The uid of the element to drag'),
  to_uid: z.string().describe('The uid of the element to drop into'),
};

export const drag: ToolHandler = async (params, driver) => {
  await driver.dragElement(params.from_uid as string, params.to_uid as string);
  return {
    content: [
      {type: 'text' as const, text: 'Successfully dragged the element.'},
    ],
  };
};

// ---- press_key ----

export const pressKeySchema = {
  key: z
    .string()
    .describe(
      'A key or a combination (e.g., "Enter", "Control+A", "Meta+Shift+R"). Modifiers: Control, Shift, Alt, Meta',
    ),
};

export const pressKey: ToolHandler = async (params, driver) => {
  await driver.pressKey(params.key as string);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Successfully pressed key: ${params.key}`,
      },
    ],
  };
};

// ---- upload_file ----

export const uploadFileSchema = {
  uid: z
    .string()
    .describe(
      'The uid of the file input element on the page from the page content snapshot',
    ),
  filePath: z.string().describe('The local path of the file to upload'),
};

export const uploadFile: ToolHandler = async (params, driver) => {
  try {
    await driver.uploadFile(params.uid as string, params.filePath as string);
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
};

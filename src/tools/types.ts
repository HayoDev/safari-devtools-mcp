/**
 * Shared tool types.
 */

import type {z, ZodRawShape, ZodObject} from 'zod';
import type {SafariDriver} from '../SafariDriver.js';

export interface ToolResult {
  [key: string]: unknown;
  content: (
    | {type: 'text'; text: string}
    | {type: 'image'; data: string; mimeType: string}
  )[];
  isError?: boolean;
}

export interface ToolDef<S extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  schema: S;
  handler: (
    params: z.infer<ZodObject<S>>,
    driver: SafariDriver,
  ) => Promise<ToolResult>;
}

export function defineTool<S extends ZodRawShape>(def: ToolDef<S>): ToolDef {
  return def as unknown as ToolDef;
}

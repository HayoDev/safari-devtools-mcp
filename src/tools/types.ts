/**
 * Shared tool types.
 */

import type {SafariDriver} from '../SafariDriver.js';

export interface ToolResult {
  content: (
    | {type: 'text'; text: string}
    | {type: 'image'; data: string; mimeType: string}
  )[];
  isError?: boolean;
}

export type ToolHandler = (
  params: Record<string, unknown>,
  driver: SafariDriver,
) => Promise<ToolResult>;

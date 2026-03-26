/**
 * Core type definitions for Safari DevTools MCP.
 */

export interface ConsoleLogEntry {
  msgid: number;
  level: ConsoleLevel;
  message: string;
  timestamp: number;
  source?: string;
  stackTrace?: string;
  args?: string[];
}

export type ConsoleLevel =
  | 'log'
  | 'debug'
  | 'info'
  | 'error'
  | 'warn'
  | 'trace'
  | 'assert'
  | 'dir'
  | 'table'
  | 'clear'
  | 'count'
  | 'timeEnd';

export interface NetworkLogEntry {
  reqid: number;
  url: string;
  method: string;
  status: number;
  statusText: string;
  resourceType: ResourceType;
  startTime: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  /** Whether this entry was captured from Performance API (pre-injection) */
  historical: boolean;
  error?: string;
  /** Request body (for intercepted requests) */
  requestBody?: string;
  /** Response body (for intercepted requests) */
  responseBody?: string;
  /** MIME type of the response */
  mimeType?: string;
}

export type ResourceType =
  | 'document'
  | 'stylesheet'
  | 'image'
  | 'media'
  | 'font'
  | 'script'
  | 'xhr'
  | 'fetch'
  | 'websocket'
  | 'other';

export interface SnapshotNode {
  uid: string;
  role: string;
  name: string;
  value?: string;
  description?: string;
  children: SnapshotNode[];
  tagName?: string;
  attributes?: Record<string, string>;
}

export interface PageInfo {
  pageId: number;
  url: string;
  title: string;
  isSelected: boolean;
  warning?: string;
}

export interface SafariSessionOptions {
  headless?: boolean;
  enableInspection?: boolean;
  enableProfiling?: boolean;
}

export interface ToolCategory {
  DEBUGGING: 'debugging';
  NAVIGATION: 'navigation';
  INPUT: 'input';
  NETWORK: 'network';
  EMULATION: 'emulation';
}

export const ToolCategories = {
  DEBUGGING: 'debugging',
  NAVIGATION: 'navigation',
  INPUT: 'input',
  NETWORK: 'network',
  EMULATION: 'emulation',
} as const;

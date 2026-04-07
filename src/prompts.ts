/**
 * MCP prompt (skill) definitions.
 *
 * Each prompt surfaces a guided debugging workflow that LLM clients can
 * invoke via the MCP prompts/list and prompts/get protocol. The content
 * is loaded from the matching SKILL.md at build time and returned as a
 * single user message so the LLM receives the full playbook in context.
 */

import {readFileSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', '..', 'skills');

interface SkillDef {
  /** Prompt name (kebab-case). */
  name: string;
  /** Short description shown in prompts/list. */
  description: string;
  /** Subdirectory under skills/ containing SKILL.md. */
  dir: string;
}

const skills: SkillDef[] = [
  {
    name: 'safari-devtools',
    description:
      'Getting started with Safari DevTools MCP — tool overview, workflows, and Safari-specific notes.',
    dir: 'safari-devtools',
  },
  {
    name: 'a11y-debugging',
    description:
      'Accessibility auditing workflow — inspect the a11y tree, find WCAG issues, and run automated checks.',
    dir: 'a11y-debugging',
  },
  {
    name: 'safari-specific-debugging',
    description:
      'Debug Safari/WebKit quirks — CSS prefixes, JS feature gaps, CORS/ITP issues, and cross-browser differences.',
    dir: 'safari-specific-debugging',
  },
  {
    name: 'performance-debugging',
    description:
      'Performance analysis — Core Web Vitals, Navigation Timing, resource waterfalls, and Safari-specific optimizations.',
    dir: 'performance-debugging',
  },
];

function loadSkillContent(dir: string): string {
  const filePath = join(SKILLS_DIR, dir, 'SKILL.md');
  return readFileSync(filePath, 'utf-8');
}

export function registerPrompts(server: McpServer): void {
  for (const skill of skills) {
    const content = loadSkillContent(skill.dir);

    server.prompt(skill.name, skill.description, () => ({
      messages: [
        {
          role: 'user' as const,
          content: {type: 'text' as const, text: content},
        },
      ],
    }));
  }
}

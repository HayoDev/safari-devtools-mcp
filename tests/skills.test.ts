import {describe, it} from 'node:test';
import assert from 'node:assert';
import {readFileSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', '..', 'skills');

const EXPECTED_SKILLS = [
  'safari-devtools',
  'a11y-debugging',
  'safari-specific-debugging',
  'performance-debugging',
];

describe('Skills', () => {
  for (const skill of EXPECTED_SKILLS) {
    it(`${skill}/SKILL.md exists and is non-empty`, () => {
      const filePath = join(SKILLS_DIR, skill, 'SKILL.md');
      assert.ok(existsSync(filePath), `${filePath} should exist`);
      const content = readFileSync(filePath, 'utf-8');
      assert.ok(
        content.length > 100,
        'SKILL.md should have meaningful content',
      );
    });
  }

  it('all skill files start with a markdown heading', () => {
    for (const skill of EXPECTED_SKILLS) {
      const content = readFileSync(
        join(SKILLS_DIR, skill, 'SKILL.md'),
        'utf-8',
      );
      assert.ok(
        content.startsWith('#'),
        `${skill}/SKILL.md should start with a heading`,
      );
    }
  });
});

import {describe, it} from 'node:test';
import assert from 'node:assert';
import {tools} from '../src/tools/ios-validation.js';

describe('iOS validation tools', () => {
  const EXPECTED_TOOLS = [
    'inspect_viewport_meta',
    'get_safe_area_insets',
    'check_ios_web_app_readiness',
  ];

  it('exports all expected tools', () => {
    const names = tools.map(t => t.name);
    for (const expected of EXPECTED_TOOLS) {
      assert.ok(names.includes(expected), `should have ${expected}`);
    }
  });

  it('all tools have slim descriptions', () => {
    for (const tool of tools) {
      assert.ok(
        tool.slimDescription,
        `${tool.name} should have a slimDescription`,
      );
    }
  });

  it('all tools have empty schemas (no required params)', () => {
    for (const tool of tools) {
      assert.deepStrictEqual(
        Object.keys(tool.schema),
        [],
        `${tool.name} should have no params`,
      );
    }
  });
});

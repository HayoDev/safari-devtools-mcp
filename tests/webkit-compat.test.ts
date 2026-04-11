import {describe, it} from 'node:test';
import assert from 'node:assert';
import {tools} from '../src/tools/webkit-compat.js';

describe('WebKit compatibility tools', () => {
  it('exports check_webkit_compatibility tool', () => {
    const names = tools.map(t => t.name);
    assert.ok(
      names.includes('check_webkit_compatibility'),
      'should have check_webkit_compatibility',
    );
  });

  it('has a slim description', () => {
    for (const tool of tools) {
      assert.ok(
        tool.slimDescription,
        `${tool.name} should have a slimDescription`,
      );
    }
  });

  it('check_webkit_compatibility has an empty schema', () => {
    const tool = tools.find(t => t.name === 'check_webkit_compatibility')!;
    assert.deepStrictEqual(Object.keys(tool.schema), []);
  });
});

import {describe, it} from 'node:test';
import assert from 'node:assert';
import {z} from 'zod';
import {tools} from '../src/tools/emulation.js';

describe('Emulation tools', () => {
  it('exports set_color_scheme and get_color_scheme tools', () => {
    const names = tools.map(t => t.name);
    assert.ok(
      names.includes('set_color_scheme'),
      'should have set_color_scheme',
    );
    assert.ok(
      names.includes('get_color_scheme'),
      'should have get_color_scheme',
    );
  });

  it('set_color_scheme accepts light, dark, and reset', () => {
    const tool = tools.find(t => t.name === 'set_color_scheme')!;
    const schema = tool.schema.colorScheme as z.ZodEnum<[string, ...string[]]>;
    // Zod enum — verify the options are present via the public API
    const options = [...schema.options];
    assert.deepStrictEqual(options.sort(), ['dark', 'light', 'reset']);
  });

  it('get_color_scheme has an empty schema', () => {
    const tool = tools.find(t => t.name === 'get_color_scheme')!;
    assert.deepStrictEqual(Object.keys(tool.schema), []);
  });

  it('both tools have slim descriptions', () => {
    for (const tool of tools) {
      assert.ok(
        tool.slimDescription,
        `${tool.name} should have a slimDescription`,
      );
    }
  });
});

import {describe, it} from 'node:test';
import assert from 'node:assert';
import {z} from 'zod';
import {tools, deviceTools} from '../src/tools/emulation.js';

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

  it('all color scheme tools have slim descriptions', () => {
    for (const tool of tools) {
      assert.ok(
        tool.slimDescription,
        `${tool.name} should have a slimDescription`,
      );
    }
  });
});

describe('Device emulation tools', () => {
  it('exports set_device_emulation and reset_device_emulation', () => {
    const names = deviceTools.map(t => t.name);
    assert.ok(
      names.includes('set_device_emulation'),
      'should have set_device_emulation',
    );
    assert.ok(
      names.includes('reset_device_emulation'),
      'should have reset_device_emulation',
    );
  });

  it('set_device_emulation device enum includes Apple presets', () => {
    const tool = deviceTools.find(t => t.name === 'set_device_emulation')!;
    const deviceSchema = tool.schema.device;
    // Unwrap the optional to get the inner ZodEnum
    const innerEnum = (
      deviceSchema as z.ZodOptional<z.ZodEnum<[string, ...string[]]>>
    ).unwrap();
    const options = [...innerEnum.options];
    assert.ok(options.includes('iPhone SE'), 'should include iPhone SE');
    assert.ok(
      options.includes('iPhone 15 Pro'),
      'should include iPhone 15 Pro',
    );
    assert.ok(options.includes('iPad Air'), 'should include iPad Air');
    assert.ok(options.includes('iPad Pro 13'), 'should include iPad Pro 13');
    assert.ok(
      options.length >= 8,
      `should have at least 8 presets, got ${options.length}`,
    );
  });

  it('set_device_emulation accepts custom width/height', () => {
    const tool = deviceTools.find(t => t.name === 'set_device_emulation')!;
    assert.ok(tool.schema.width, 'should have width param');
    assert.ok(tool.schema.height, 'should have height param');
    assert.ok(
      tool.schema.devicePixelRatio,
      'should have devicePixelRatio param',
    );
    assert.ok(tool.schema.userAgent, 'should have userAgent param');
  });

  it('reset_device_emulation has an empty schema', () => {
    const tool = deviceTools.find(t => t.name === 'reset_device_emulation')!;
    assert.deepStrictEqual(Object.keys(tool.schema), []);
  });

  it('all device tools have slim descriptions', () => {
    for (const tool of deviceTools) {
      assert.ok(
        tool.slimDescription,
        `${tool.name} should have a slimDescription`,
      );
    }
  });
});

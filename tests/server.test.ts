import {describe, it} from 'node:test';
import assert from 'node:assert';
import {createSafariMcpServer} from '../src/index.js';

describe('Safari DevTools MCP Server', () => {
  it('creates a server and driver', () => {
    const {server, driver} = createSafariMcpServer();
    assert.ok(server, 'server should be defined');
    assert.ok(driver, 'driver should be defined');
  });

  it('creates a server in slim mode', () => {
    const {server, driver} = createSafariMcpServer({slim: true});
    assert.ok(server, 'server should be defined');
    assert.ok(driver, 'driver should be defined');
  });

  it('accepts empty options', () => {
    const {server} = createSafariMcpServer({});
    assert.ok(server, 'server should be defined');
  });

  it('runs on macOS only', () => {
    assert.strictEqual(
      process.platform,
      'darwin',
      'Safari DevTools MCP only runs on macOS',
    );
  });
});

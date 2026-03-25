import {describe, it} from 'node:test';
import assert from 'node:assert';
import {
  formatNetworkRequests,
  formatNetworkRequest,
} from '../../src/formatters/NetworkFormatter.js';
import type {NetworkLogEntry} from '../../src/types.js';

describe('NetworkFormatter', () => {
  describe('formatNetworkRequests', () => {
    it('returns empty message when no logs', () => {
      const result = formatNetworkRequests([], 0);
      assert.strictEqual(result, 'No network requests captured.');
    });

    it('formats a list of network requests', () => {
      const logs: NetworkLogEntry[] = [
        {
          reqid: 0,
          url: 'https://api.example.com/data',
          method: 'GET',
          status: 200,
          statusText: 'OK',
          resourceType: 'fetch',
          startTime: 100,
          duration: 250,
          transferSize: 1024,
          encodedBodySize: 1000,
          decodedBodySize: 2000,
          historical: false,
        },
        {
          reqid: 1,
          url: 'https://cdn.example.com/style.css',
          method: 'GET',
          status: 304,
          statusText: 'Not Modified',
          resourceType: 'stylesheet',
          startTime: 50,
          duration: 30,
          transferSize: 0,
          encodedBodySize: 0,
          decodedBodySize: 0,
          historical: true,
        },
      ];
      const result = formatNetworkRequests(logs, 10);
      assert.ok(result.includes('Network requests (2 of 10 total):'));
      assert.ok(result.includes('200'));
      assert.ok(result.includes('api.example.com/data'));
      assert.ok(result.includes('[historical]'));
    });
  });

  describe('formatNetworkRequest', () => {
    it('formats a full network request', () => {
      const log: NetworkLogEntry = {
        reqid: 0,
        url: 'https://api.example.com/users',
        method: 'POST',
        status: 201,
        statusText: 'Created',
        resourceType: 'fetch',
        startTime: 100,
        duration: 350,
        transferSize: 512,
        encodedBodySize: 500,
        decodedBodySize: 1000,
        historical: false,
        requestHeaders: {'Content-Type': 'application/json'},
        responseHeaders: {'Content-Type': 'application/json'},
        requestBody: '{"name":"test"}',
        responseBody: '{"id":1,"name":"test"}',
        mimeType: 'application/json',
      };
      const result = formatNetworkRequest(log);
      assert.ok(result.includes('POST'));
      assert.ok(result.includes('201'));
      assert.ok(result.includes('api.example.com/users'));
      assert.ok(result.includes('Request Headers:'));
      assert.ok(result.includes('Response Headers:'));
      assert.ok(result.includes('Request Body:'));
    });
  });
});

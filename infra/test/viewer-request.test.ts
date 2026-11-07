import { describe, expect, it } from 'vitest';
import { VIEWER_REQUEST_CODE } from '../lib/viewer-request';

type Result = { uri?: string; statusCode?: number; headers?: { location: { value: string } } };
const handler = new Function(`${VIEWER_REQUEST_CODE}; return handler;`)() as (e: {
  request: { uri: string };
}) => Result;
const run = (uri: string) => handler({ request: { uri } });

describe('viewer-request function', () => {
  it('serves index.html for app routes', () => {
    expect(run('/').uri).toBe('/index.html');
    expect(run('/funhouse/attic').uri).toBe('/index.html');
    expect(run('/projects').uri).toBe('/index.html');
  });

  it('leaves real files alone', () => {
    expect(run('/assets/index-abc.js').uri).toBe('/assets/index-abc.js');
    expect(run('/favicon.svg').uri).toBe('/favicon.svg');
  });

  it('serves an exhibit folder’s index.html', () => {
    expect(run('/exhibits/bam-cube/').uri).toBe('/exhibits/bam-cube/index.html');
    expect(run('/exhibits/bam-cube/cube.css').uri).toBe('/exhibits/bam-cube/cube.css');
  });

  it('adds the trailing slash to exhibit folders', () => {
    const r = run('/exhibits/bam-cube');
    expect(r.statusCode).toBe(301);
    expect(r.headers?.location.value).toBe('/exhibits/bam-cube/');
  });
});

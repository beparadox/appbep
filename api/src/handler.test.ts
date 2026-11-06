import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler, matchRoute } from './handler';

describe('matchRoute', () => {
  it('matches score routes for known games', () => {
    expect(matchRoute('GET', '/api/scores/wtfblaster')).toEqual({
      kind: 'scores',
      method: 'GET',
      game: 'wtfblaster',
    });
    expect(matchRoute('POST', '/api/scores/npuzzle')).toMatchObject({
      kind: 'scores',
      method: 'POST',
    });
  });
  it('rejects unknown games and methods', () => {
    expect(matchRoute('GET', '/api/scores/nope')).toBeNull();
    expect(matchRoute('DELETE', '/api/scores/wtfblaster')).toBeNull();
  });
  it('matches quiz routes with valid dates only', () => {
    expect(matchRoute('GET', '/api/quiz/apf/2009-09-14/tally')).toEqual({
      kind: 'tally',
      quiz: 'apf',
      date: '2009-09-14',
    });
    expect(matchRoute('POST', '/api/quiz/schportz/2011-07-18/vote')).toMatchObject({
      kind: 'vote',
    });
    expect(matchRoute('POST', '/api/quiz/apf/9-14-09/vote')).toBeNull();
    expect(matchRoute('GET', '/api/quiz/apf/2009-09-14/vote')).toBeNull();
  });
});

describe('handler', () => {
  const ev = (method: string, rawPath: string) =>
    ({ rawPath, requestContext: { http: { method } } }) as unknown as APIGatewayProxyEventV2;

  it('404s unknown paths', async () => {
    expect(await handler(ev('GET', '/api/nope'))).toMatchObject({ statusCode: 404 });
  });
  it('501s known-but-unimplemented routes', async () => {
    expect(await handler(ev('GET', '/api/scores/wtfblaster'))).toMatchObject({ statusCode: 501 });
  });
});

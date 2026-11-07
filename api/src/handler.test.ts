import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handle, handler, matchRoute } from './handler';
import type { Deps } from './npuzzle/service';
import { MemoryStore } from './npuzzle/store';

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

// ---- N-Puzzle leaderboard tutorial (docs/tutorials/npuzzle-leaderboard.md) ----

describe.skip('npuzzle step 3: the challenge route', () => {
  it('matches POST /api/scores/npuzzle/challenge only', () => {
    expect(matchRoute('POST', '/api/scores/npuzzle/challenge')).toEqual({ kind: 'challenge' });
    expect(matchRoute('GET', '/api/scores/npuzzle/challenge')).toBeNull();
    expect(matchRoute('POST', '/api/scores/wtfblaster/challenge')).toBeNull();
    expect(matchRoute('POST', '/api/scores/npuzzle/challenge/extra')).toBeNull();
  });
  it('still matches the plain score routes', () => {
    expect(matchRoute('POST', '/api/scores/npuzzle')).toMatchObject({
      kind: 'scores',
      game: 'npuzzle',
    });
  });
});

describe.skip('npuzzle step 7: handle', () => {
  const store = new MemoryStore();
  const deps: Deps = {
    store,
    now: Date.now,
    newId: () => 'c1',
    random: Math.random,
    blocked: [],
  };
  const request = (method: string, rawPath: string, extra: Partial<APIGatewayProxyEventV2> = {}) =>
    ({
      rawPath,
      requestContext: { http: { method } },
      ...extra,
    }) as unknown as APIGatewayProxyEventV2;
  const parse = (res: unknown) => {
    const r = res as { statusCode: number; headers: Record<string, string>; body: string };
    return {
      status: r.statusCode,
      type: r.headers['content-type'],
      body: JSON.parse(r.body) as unknown,
    };
  };

  it('issues a challenge, accepts its solution, and shows it on the board', async () => {
    const issued = parse(await handle(request('POST', '/api/scores/npuzzle/challenge'), deps));
    expect(issued).toMatchObject({ status: 201, type: 'application/json', body: { id: 'c1' } });

    // Replace the random board with one that's a single move from solved.
    await store.putChallenge({
      id: 'c1',
      state: [1, 2, 3, 4, 5, 6, 7, 9, 8],
      issuedAt: Date.now(),
    });
    const body = JSON.stringify({ challengeId: 'c1', name: 'bam', actions: [1] });
    const submitted = parse(await handle(request('POST', '/api/scores/npuzzle', { body }), deps));
    expect(submitted).toMatchObject({ status: 201, body: { moves: 1 } });

    const query = { board: 'alltime', by: 'moves' };
    const board = parse(
      await handle(request('GET', '/api/scores/npuzzle', { queryStringParameters: query }), deps),
    );
    expect(board).toMatchObject({ status: 200, body: { entries: [{ rank: 1, name: 'bam' }] } });
  });

  it('decodes a base64 body (API Gateway does that for some content types)', async () => {
    await store.putChallenge({
      id: 'b64',
      state: [1, 2, 3, 4, 5, 6, 7, 9, 8],
      issuedAt: Date.now(),
    });
    const body = Buffer.from(
      JSON.stringify({ challengeId: 'b64', name: 'bam', actions: [1] }),
    ).toString('base64');
    const res = parse(
      await handle(request('POST', '/api/scores/npuzzle', { body, isBase64Encoded: true }), deps),
    );
    expect(res.status).toBe(201);
  });

  it('keeps answering 404 and 501 for everything else', async () => {
    expect(parse(await handle(request('GET', '/api/nope'), deps)).status).toBe(404);
    expect(parse(await handle(request('GET', '/api/scores/wtfblaster'), deps)).status).toBe(501);
  });
});

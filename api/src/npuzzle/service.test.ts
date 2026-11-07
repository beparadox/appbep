/**
 * Tests for service.ts, run against the in-memory store with a fake clock. Unskip a step,
 * watch it fail, make it pass:
 *   npm test -w api -- --watch service
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHALLENGE_TTL_SECONDS,
  GOAL,
  MAX_ACTIONS,
  type BoardResponse,
  type ChallengeResponse,
} from './contract';
import { getBoard, issueChallenge, submitScore, type Deps } from './service';
import { MemoryStore } from './store';

// 2026-11-07T23:59:00Z: one minute before midnight UTC, so tests can cross into the next day.
const START = Date.UTC(2026, 10, 7, 23, 59, 0);

let clock: number;
let ids: number;
let store: MemoryStore;
let deps: Deps;

beforeEach(() => {
  clock = START;
  ids = 0;
  store = new MemoryStore(() => clock);
  deps = {
    store,
    now: () => clock,
    newId: () => `id-${(ids += 1)}`,
    random: Math.random,
    blocked: ['badword'],
  };
});

/** A challenge that's one slide from solved: the blank moves right once ([1]). */
async function oneMoveChallenge(id = 'c1', issuedAt = clock) {
  await store.putChallenge({ id, state: [1, 2, 3, 4, 5, 6, 7, 9, 8], issuedAt });
  return id;
}

const submit = (body: unknown) => submitScore(deps, JSON.stringify(body));

describe.skip('step 4: issueChallenge', () => {
  it('returns 201 with a new id and a solvable, unsolved board', async () => {
    const reply = await issueChallenge(deps);
    expect(reply.status).toBe(201);
    const body = reply.body as ChallengeResponse;
    expect(body.id).toBe('id-1');
    expect([...body.state].sort()).toEqual(GOAL);
    expect(body.state).not.toEqual(GOAL);
  });
  it('remembers the board and when it was issued', async () => {
    const body = (await issueChallenge(deps)).body as ChallengeResponse;
    expect(store.challenges.get(body.id)).toEqual({
      id: body.id,
      state: body.state,
      issuedAt: START,
    });
  });
});

describe.skip('step 5: submitScore', () => {
  it('accepts a solution: moves from the replay, time from the server clock', async () => {
    const id = await oneMoveChallenge();
    clock += 4321;
    const reply = await submit({ challengeId: id, name: 'bam_2013', actions: [1] });
    expect(reply).toEqual({ status: 201, body: { moves: 1, timeMs: 4321 } });
    expect(store.scores).toEqual([
      {
        id,
        name: 'bam_2013',
        moves: 1,
        timeMs: 4321,
        at: '2026-11-07T23:59:04.321Z',
        day: '2026-11-07',
      },
    ]);
  });

  it('lets each challenge be used once', async () => {
    const id = await oneMoveChallenge();
    await submit({ challengeId: id, name: 'bam', actions: [1] });
    expect(await submit({ challengeId: id, name: 'bam', actions: [1] })).toEqual({
      status: 404,
      body: { error: 'unknown_challenge' },
    });
  });

  it('refuses unknown and expired challenges', async () => {
    expect((await submit({ challengeId: 'nope', name: 'bam', actions: [1] })).body).toEqual({
      error: 'unknown_challenge',
    });
    const id = await oneMoveChallenge('old', START - CHALLENGE_TTL_SECONDS * 1000 - 1);
    expect((await submit({ challengeId: id, name: 'bam', actions: [1] })).status).toBe(404);
  });

  it('400s a body that is missing, not JSON, or the wrong shape', async () => {
    const bad = { status: 400, body: { error: 'invalid_request' } };
    expect(await submitScore(deps, undefined)).toEqual(bad);
    expect(await submitScore(deps, '{not json')).toEqual(bad);
    expect(await submitScore(deps, 'null')).toEqual(bad);
    expect(await submit([])).toEqual(bad);
    expect(await submit({ name: 'bam', actions: [1] })).toEqual(bad);
    expect(await submit({ challengeId: 'c1', name: 42, actions: [1] })).toEqual(bad);
    expect(await submit({ challengeId: 'c1', name: 'bam', actions: '1' })).toEqual(bad);
  });

  it('400s bad names WITHOUT using up the challenge, so the player can fix it and retry', async () => {
    const id = await oneMoveChallenge();
    expect(await submit({ challengeId: id, name: 'no!', actions: [1] })).toEqual({
      status: 400,
      body: { error: 'invalid_name' },
    });
    expect((await submit({ challengeId: id, name: 'B4D_W0RD', actions: [1] })).body).toEqual({
      error: 'invalid_name',
    });
    expect((await submit({ challengeId: id, name: 'bam', actions: [1] })).status).toBe(201);
  });

  it('400s actions that are not actions, or too many of them', async () => {
    const id = await oneMoveChallenge();
    const invalid = { status: 400, body: { error: 'invalid_actions' } };
    expect(await submit({ challengeId: id, name: 'bam', actions: [3] })).toEqual(invalid);
    expect(await submit({ challengeId: id, name: 'bam', actions: ['1'] })).toEqual(invalid);
    expect(
      await submit({ challengeId: id, name: 'bam', actions: new Array(MAX_ACTIONS + 1).fill(1) }),
    ).toEqual(invalid);
    expect((await submit({ challengeId: id, name: 'bam', actions: [1] })).status).toBe(201);
  });

  it('400s moves off the board and moves that leave it unsolved, and saves nothing', async () => {
    await oneMoveChallenge('a');
    expect(await submit({ challengeId: 'a', name: 'bam', actions: [1, 1] })).toEqual({
      status: 400,
      body: { error: 'invalid_actions' },
    });
    await oneMoveChallenge('b');
    expect(await submit({ challengeId: 'b', name: 'bam', actions: [-1] })).toEqual({
      status: 400,
      body: { error: 'not_solved' },
    });
    expect(store.scores).toEqual([]);
  });
});

describe.skip('step 6: getBoard', () => {
  async function play(id: string, name: string, actions: number[], seconds: number) {
    await store.putChallenge({ id, state: [1, 2, 3, 4, 5, 6, 7, 9, 8], issuedAt: clock });
    clock += seconds * 1000;
    expect((await submit({ challengeId: id, name, actions })).status).toBe(201);
  }
  const board = async (q: Record<string, string>) =>
    (await getBoard(deps, q)).body as BoardResponse;

  it('ranks by moves (then time) and by time (then moves)', async () => {
    clock = Date.UTC(2026, 10, 8, 12, 0, 0);
    await play('a', 'slowpoke', [1], 30); // 1 move, 30 s
    await play('b', 'speedy', [-1, 1, 1], 2); // 3 moves, 2 s
    await play('c', 'steady', [1], 10); // 1 move, 10 s

    const byMoves = await board({ board: 'alltime', by: 'moves' });
    expect(byMoves.entries.map((e) => e.name)).toEqual(['steady', 'slowpoke', 'speedy']);
    expect(byMoves.entries[0]).toEqual({
      rank: 1,
      name: 'steady',
      moves: 1,
      timeMs: 10_000,
      at: '2026-11-08T12:00:42.000Z',
    });
    expect(byMoves.entries.map((e) => e.rank)).toEqual([1, 2, 3]);

    const byTime = await board({ board: 'alltime', by: 'time' });
    expect(byTime.entries.map((e) => e.name)).toEqual(['speedy', 'steady', 'slowpoke']);
    expect(byTime).toMatchObject({ board: 'alltime', by: 'time', day: '2026-11-08' });
  });

  it('"today" means the current UTC day; all-time keeps everything', async () => {
    await play('a', 'yesterday', [1], 0); // 2026-11-07 23:59
    clock += 2 * 60 * 1000; // now 2026-11-08 00:01
    await play('b', 'today', [1], 5);

    const today = await board({ board: 'today', by: 'moves' });
    expect(today.day).toBe('2026-11-08');
    expect(today.entries.map((e) => e.name)).toEqual(['today']);
    expect((await board({ board: 'alltime', by: 'moves' })).entries).toHaveLength(2);
  });

  it('returns at most BOARD_SIZE entries, and an empty list when nobody has played', async () => {
    expect((await board({ board: 'today', by: 'time' })).entries).toEqual([]);
    for (let i = 0; i < 12; i += 1) await play(`p${i}`, `player${i}`, [1], i + 1);
    const top = await board({ board: 'alltime', by: 'time' });
    expect(top.entries).toHaveLength(10);
    expect(top.entries[9]).toMatchObject({ rank: 10, name: 'player9' });
  });

  it('400s a missing or unknown board or ranking', async () => {
    const bad = { status: 400, body: { error: 'invalid_request' } };
    expect(await getBoard(deps, undefined)).toEqual(bad);
    expect(await getBoard(deps, { board: 'today' })).toEqual(bad);
    expect(await getBoard(deps, { board: 'weekly', by: 'moves' })).toEqual(bad);
    expect(await getBoard(deps, { board: 'today', by: 'score' })).toEqual(bad);
    expect((await getBoard(deps, { board: 'today', by: 'moves' })).status).toBe(200);
  });
});

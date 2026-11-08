import { beforeEach, describe, expect, it } from 'vitest';
import { isQuestion } from './questions';
import { castVote, getTally, type QuizDeps } from './service';

/** In-memory QuizStore. */
function memoryStore() {
  const counts = new Map<string, number[]>();
  const voters = new Set<string>();
  return {
    counts: async (quiz: string, id: string) => counts.get(`${quiz}|${id}`) ?? [0, 0, 0, 0, 0],
    vote: async (quiz: string, id: string, voter: string, choice: number) => {
      const key = `${quiz}|${id}|${voter}`;
      if (voters.has(key)) return false;
      voters.add(key);
      const c = [...(counts.get(`${quiz}|${id}`) ?? [0, 0, 0, 0, 0])];
      c[choice] = (c[choice] ?? 0) + 1;
      counts.set(`${quiz}|${id}`, c);
      return true;
    },
  };
}

let deps: QuizDeps;
beforeEach(() => {
  deps = {
    store: memoryStore(),
    isQuestion,
    voterKey: async (ip, quiz, id) => `h(${ip}|${quiz}|${id})`,
  };
});

const Q = '2011-07-18'; // "Who was NL home run leader in 2003?"
const vote = (choice: unknown, ip = '203.0.113.7', id = Q) =>
  castVote(deps, 'schportz', id, JSON.stringify({ choice }), ip);

describe('questions', () => {
  it('knows the recovered Schportz questions and nothing else', () => {
    expect(isQuestion('schportz', '2011-07-18')).toBe(true);
    expect(isQuestion('schportz', '2010-08-26')).toBe(true);
    expect(isQuestion('schportz', '2011-01-01')).toBe(false);
    expect(isQuestion('apf', '2011-07-18')).toBe(false);
  });
});

describe('castVote / getTally', () => {
  it('counts a vote and returns the tally', async () => {
    expect(await vote(4)).toEqual({
      status: 201,
      body: { quiz: 'schportz', id: Q, counts: [0, 0, 0, 0, 1], total: 1 },
    });
    await vote(0, '198.51.100.1');
    expect(await getTally(deps, 'schportz', Q)).toEqual({
      status: 200,
      body: { quiz: 'schportz', id: Q, counts: [1, 0, 0, 0, 1], total: 2 },
    });
  });

  it('allows one vote per visitor per question, and says what the tally is', async () => {
    await vote(4);
    expect(await vote(2)).toEqual({
      status: 409,
      body: {
        error: 'already_voted',
        tally: { quiz: 'schportz', id: Q, counts: [0, 0, 0, 0, 1], total: 1 },
      },
    });
    expect((await vote(2, '203.0.113.7', '2011-07-19')).status).toBe(201);
  });

  it('404s unknown quizzes and questions', async () => {
    expect((await getTally(deps, 'schportz', '1999-01-01')).status).toBe(404);
    expect((await castVote(deps, 'apf', Q, '{"choice":1}', 'ip')).body).toEqual({
      error: 'unknown_question',
    });
  });

  it('400s anything but a choice of 0-4', async () => {
    for (const choice of [-1, 5, 1.5, '1', null, undefined]) {
      expect(await vote(choice)).toEqual({ status: 400, body: { error: 'invalid_request' } });
    }
    expect((await castVote(deps, 'schportz', Q, 'nope', 'ip')).status).toBe(400);
    expect((await castVote(deps, 'schportz', Q, undefined, 'ip')).status).toBe(400);
  });

  it('503s votes while the hashing key is missing (tallies still work)', async () => {
    deps.voterKey = async () => null;
    expect(await vote(1)).toEqual({ status: 503, body: { error: 'not_configured' } });
    expect((await getTally(deps, 'schportz', Q)).status).toBe(200);
  });
});

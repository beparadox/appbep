/**
 * Where challenges and scores are kept. This file is GIVEN (tutorial step 0).
 *
 * `NpuzzleStore` is the interface the service talks to. There are two implementations:
 *   - `MemoryStore` (below, given): keeps everything in arrays. The tests use it.
 *   - `DynamoStore` (dynamo-store.ts, YOU write it in step 7): the real one, in DynamoDB.
 * The service never knows which one it has, which is what makes it testable without AWS.
 */
import { CHALLENGE_TTL_SECONDS, type RankBy, type State } from './contract';

export interface ChallengeRecord {
  id: string;
  state: State;
  /** When the challenge was issued, in epoch milliseconds. */
  issuedAt: number;
}

export interface ScoreRecord {
  /** Unique per score (the challenge id works). */
  id: string;
  name: string;
  moves: number;
  timeMs: number;
  /** When the score was submitted, ISO 8601. */
  at: string;
  /** The UTC day it was submitted, yyyy-mm-dd: which "today" board it belongs to. */
  day: string;
}

export interface NpuzzleStore {
  putChallenge(challenge: ChallengeRecord): Promise<void>;
  /**
   * Remove the challenge and return it, in ONE step, so two submissions racing for the same
   * challenge can't both get it. Returns null if it doesn't exist, was already taken, or is
   * older than CHALLENGE_TTL_SECONDS.
   */
  takeChallenge(id: string): Promise<ChallengeRecord | null>;
  putScore(score: ScoreRecord): Promise<void>;
  /**
   * The best `limit` scores, best first. `day` = null means all-time; otherwise only scores
   * from that UTC day. Ranking: by moves, ties broken by time; by time, ties broken by moves;
   * then the earlier score wins.
   */
  topScores(by: RankBy, day: string | null, limit: number): Promise<ScoreRecord[]>;
}

/** Compares two scores for a board ranked `by` (negative = a ranks higher). */
export function compareScores(by: RankBy, a: ScoreRecord, b: ScoreRecord): number {
  const [a1, a2, b1, b2] =
    by === 'moves'
      ? [a.moves, a.timeMs, b.moves, b.timeMs]
      : [a.timeMs, a.moves, b.timeMs, b.moves];
  return a1 - b1 || a2 - b2 || a.at.localeCompare(b.at);
}

/** An in-memory NpuzzleStore for tests (and anything else that shouldn't need AWS). */
export class MemoryStore implements NpuzzleStore {
  readonly challenges = new Map<string, ChallengeRecord>();
  readonly scores: ScoreRecord[] = [];
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async putChallenge(challenge: ChallengeRecord): Promise<void> {
    this.challenges.set(challenge.id, { ...challenge, state: [...challenge.state] });
  }

  async takeChallenge(id: string): Promise<ChallengeRecord | null> {
    const found = this.challenges.get(id);
    this.challenges.delete(id);
    if (!found || this.now() - found.issuedAt > CHALLENGE_TTL_SECONDS * 1000) return null;
    return found;
  }

  async putScore(score: ScoreRecord): Promise<void> {
    this.scores.push({ ...score });
  }

  async topScores(by: RankBy, day: string | null, limit: number): Promise<ScoreRecord[]> {
    return this.scores
      .filter((s) => day === null || s.day === day)
      .sort((a, b) => compareScores(by, a, b))
      .slice(0, limit);
  }
}

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { Deps } from './npuzzle/service';
import { createContactDeps, viewerIp } from './contact/aws';
import { submitContact, type ContactDeps } from './contact/service';

/**
 * Single Lambda behind API Gateway (HTTP API). Routes (see docs/PLAN.md):
 *   GET  /api/scores/{game}             leaderboards
 *   POST /api/scores/{game}             submit a score
 *   GET  /api/quiz/{quiz}/{date}/tally  vote counts
 *   POST /api/quiz/{quiz}/{date}/vote   cast a vote
 *   POST /api/contact                   contact form (contact/)
 * Scores and quizzes land in Phases 4–5; for now they answer 501.
 */
export const GAMES = ['wtfblaster', 'npuzzle'] as const;
export const QUIZZES = ['schportz', 'apf'] as const;

type Route =
  | { kind: 'scores'; method: 'GET' | 'POST'; game: string }
  | { kind: 'tally'; quiz: string; date: string }
  | { kind: 'vote'; quiz: string; date: string }
  | { kind: 'contact' };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function matchRoute(method: string, path: string): Route | null {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] !== 'api') return null;
  const [, area, a, b, c] = parts;
  if (area === 'contact' && parts.length === 2 && method === 'POST') return { kind: 'contact' };
  if (area === 'scores' && a && parts.length === 3 && (GAMES as readonly string[]).includes(a)) {
    if (method === 'GET' || method === 'POST') return { kind: 'scores', method, game: a };
  }
  if (
    area === 'quiz' &&
    a &&
    b &&
    parts.length === 5 &&
    (QUIZZES as readonly string[]).includes(a) &&
    DATE.test(b)
  ) {
    if (c === 'tally' && method === 'GET') return { kind: 'tally', quiz: a, date: b };
    if (c === 'vote' && method === 'POST') return { kind: 'vote', quiz: a, date: b };
  }
  return null;
}

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

/**
 * N-Puzzle tutorial step 7 (docs/tutorials/npuzzle-leaderboard.md): YOU implement this.
 * Route the three N-Puzzle requests to the service functions with the given deps, and turn
 * their Reply into a response with `json`. Everything else: the same 404/501 as `handler`.
 * Then make `handler` call `handle(event, <the real deps>)`.
 */
export async function handle(
  event: APIGatewayProxyEventV2,
  deps: Deps,
): Promise<APIGatewayProxyResultV2> {
  throw new Error(
    `TODO step 7: handle (called with ${event.requestContext.http.method} ${event.rawPath}, ${Object.keys(deps)})`,
  );
}

/** The raw body as text (API Gateway base64-encodes some content types). */
function bodyText(event: APIGatewayProxyEventV2): string | undefined {
  if (event.body && event.isBase64Encoded)
    return Buffer.from(event.body, 'base64').toString('utf8');
  return event.body;
}

/** POST /api/contact with the given deps. */
export async function handleContact(
  event: APIGatewayProxyEventV2,
  deps: ContactDeps,
): Promise<APIGatewayProxyResultV2> {
  const ip = viewerIp(event.headers ?? {}, event.requestContext.http.sourceIp);
  try {
    const reply = await submitContact(deps, bodyText(event), ip);
    return json(reply.status, reply.body);
  } catch (err) {
    console.error('contact: unexpected error', err);
    return json(500, { error: 'internal' });
  }
}

// Created on first use and kept while the Lambda stays warm.
let contactDeps: ContactDeps | undefined;

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const route = matchRoute(event.requestContext.http.method, event.rawPath);
  if (route?.kind === 'contact') {
    contactDeps ??= createContactDeps(process.env);
    return handleContact(event, contactDeps);
  }
  if (!route) return json(404, { error: 'not_found' });
  return json(501, { error: 'not_implemented', route });
}

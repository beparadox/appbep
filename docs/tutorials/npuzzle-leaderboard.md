# Tutorial: a cheat-resistant leaderboard for NPuzzizzle

**You write the code; this guide tells you what to build, in what order, and how to know it works.**
The game page is already restored and already talks to the API described below. Until your API
exists it plays "offline" ("The leaderboard isn't open yet"). When you deploy, the leaderboard
switches on by itself.

| What's already here (given)                                                                                | What you build                                           |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`api/src/npuzzle/contract.ts`](../../api/src/npuzzle/contract.ts): every request and response             | `puzzle.ts`: the 8-puzzle rules (steps 1, 4a)            |
| [`api/src/npuzzle/store.ts`](../../api/src/npuzzle/store.ts): the storage interface + an in-memory version | `names.ts`: the name filter (step 2)                     |
| `puzzle.ts`, `names.ts`, `service.ts`: stubs with signatures + examples                                    | `handler.ts`: one new route (step 3) and the wiring (7)  |
| `*.test.ts`: 37 tests, skipped per step                                                                    | `service.ts`: challenge, submit, boards (steps 4-6)      |
| The game page: [`web/public/exhibits/npuzzizzle/`](../../web/public/exhibits/npuzzizzle/)                  | `dynamo-store.ts`: the real storage (step 8), admin (10) |
| The AWS side: table, Lambda, API, CloudFront route (all deployed already; no CDK changes)                  | Deploy and test it live (step 9)                         |

Rough effort: steps 1-7 an evening or two (all pure TypeScript, no AWS), step 8 an evening,
steps 9-10 an hour. Every step ends in a working, committable state.

---

## Background: why the server picks the puzzle

The 2013 game trusted the browser: it sent `{ name, time, moves }` and the server saved it.
Anyone could open the browser console and send `{ moves: 1, time: 0.1 }`. So this version
never trusts a number the browser reports. It works like a referee:

```
 browser                                      server (your Lambda)
 ───────                                      ─────────────────────
 press Play ──── POST /challenge ───────────▶ make a random solvable board
                                              save { id, board, issuedAt }
            ◀─── 201 { id, state } ────────── (expires in an hour)
 player slides tiles, the page records
 each move: [1, 2, -1, ...]
 solved! ─────── POST { id, name, moves } ──▶ take the challenge (gone now: single use)
                                              replay the moves on ITS copy of the board
                                              moves = how many it replayed
                                              time  = now - issuedAt   (server's clock)
            ◀─── 201 { moves, timeMs } ────── save the score on 4 boards
```

What this stops: made-up scores, impossible scores, replaying one great game many times, and
choosing an easy board. What it doesn't stop: someone who writes a bot that asks for a
challenge, solves it with A\* (the game's own Solve button does exactly that) and submits in
half a second. That's fine for a funhouse leaderboard; if it ever happens, step 10 deletes the
scores, and the "stretch goals" list ways to fight back.

**Concepts you'll practice:** pure functions vs. side effects, dependency injection (the
`Deps` object), validating untrusted input, atomic operations, and DynamoDB "single-table"
key design.

---

## How to work through this

1. **Branch first.** `git switch -c npuzzle-leaderboard`
2. **Run the tests in watch mode:** `npm test -w api -- --watch`
3. For each step, find that step's `describe.skip(` in the test file, change it to
   `describe(`, watch the tests go red, write code until they go green. Commit.
4. When a file is done, delete the `todo()` helper at its top.
5. At the end, push the branch and **open a pull request**. CI runs on the PR. Merging to
   `main` deploys it.

`npm run check` (from the repo root) must pass before every commit, the same as always.

---

## Step 0: read the contract

Read [`contract.ts`](../../api/src/npuzzle/contract.ts) top to bottom. It's short, and every
later step refers to it. Two things to notice:

- A board is 9 numbers read left to right, top to bottom, and **9 is the blank**.
- A move says where the **blank** goes: `2` up, `-2` down, `-1` left, `1` right. (Odd, but
  it's how the 2013 game encodes it, and the game page sends exactly that.)

Then skim [`store.ts`](../../api/src/npuzzle/store.ts). `NpuzzleStore` is an interface: the
service talks to "a store" without knowing whether it's arrays in memory (tests) or DynamoDB
(production). You'll write the DynamoDB one last, after everything else already works.

## Step 1: the rules (`puzzle.ts`)

Four small pure functions; tests are in `puzzle.test.ts`, steps 1a-1d.

- **1a `isBoard`**: exactly 9 numbers, the integers 1-9, each once. A `Set` helps.
- **1b `isGoal`**: compare to `GOAL`.
- **1c `isSolvable`**: count inversions, ignoring the 9. The [Wikipedia 15-puzzle
  page](https://en.wikipedia.org/wiki/15_puzzle#Solvability) explains why parity works; for a
  board of odd width it's simply "even number of inversions".
- **1d `applyActions`**: find the blank, then for each action check it can move that way and
  swap. Work out the blank's row and column (`Math.floor(i / 3)`, `i % 3`) and check those:
  "index minus 1" alone would let the blank wrap from the start of one row to the end of the
  row above. There's a test for that.

**Done when:** the step 1 tests pass (12 tests).

## Step 2: names (`names.ts`)

`isAllowedName(name, blocked)`: first the shape rule (`/^[A-Za-z0-9_]{3,12}$/`, and note
`\w` would do the same here but is less obvious to a reader), then the blocked-word check on a
"plain" version of the name: lowercase, underscores removed, look-alike digits replaced.

**The real word list is your call.** Put it in a new file, `api/src/npuzzle/blocked-words.ts`,
exporting `BLOCKED_WORDS: readonly string[]`. Options:

- Write a short list yourself (20-50 words catches nearly everything people actually try).
- Start from a published list such as LDNOOBW's "List of Dirty, Naughty, Obscene, and Otherwise
  Bad Words" on GitHub. Check its license (it's CC BY 4.0, so credit it in a comment).

Either way, beware the **Scunthorpe problem**: substring matching blocks innocent names that
happen to contain a short bad word. Prefer longer words in the list; drop any that cause false
positives. (Step 10 is the backstop for anything that slips through.)

**Done when:** `names.test.ts` passes (5 tests).

## Step 3: the challenge route (`handler.ts`)

`matchRoute` only knows `/api/scores/{game}` today. Add a `{ kind: 'challenge' }` route to the
`Route` type and match `POST /api/scores/npuzzle/challenge` (exactly four path parts).

**Done when:** "npuzzle step 3" in `handler.test.ts` passes (2 tests), and the old tests still do.

## Step 4: issuing a challenge (`puzzle.ts` 4a, `service.ts` 4)

- **4a `randomBoard(random)`**: shuffle `GOAL` with a **Fisher-Yates** shuffle using `random`
  instead of `Math.random`, and try again if the result is unsolvable or already solved. (Half
  of shuffles are unsolvable, so this takes two tries on average. Swapping any two non-blank
  tiles would also fix the parity; either is fine.)
- **4 `issueChallenge(deps)`**: build `{ id: deps.newId(), state, issuedAt: deps.now() }`, save
  it with `deps.store.putChallenge`, return `{ status: 201, body: { id, state } }`.

Why `deps`? Because tests can't control `Date.now()` or `Math.random()`, but they can hand you
a fake clock. That's **dependency injection**, and it's why the service tests run in milliseconds
with no AWS at all.

**Done when:** "step 4a" in `puzzle.test.ts` and "step 4" in `service.test.ts` pass.

## Step 5: submitting a score (`service.ts`)

The biggest step. The body is untrusted text from the internet, so check everything, **in
this order** (the tests check the order matters):

1. Parse JSON (`JSON.parse` throws on bad input: catch it). It must be a plain object with a
   string `challengeId`, a string `name` and an array `actions`. Else 400 `invalid_request`.
2. `isAllowedName(name, deps.blocked)`. Else 400 `invalid_name`.
   **Before** touching the challenge, so a player who typed a bad name can fix it and retry.
3. At most `MAX_ACTIONS`, and every item is one of `2, -2, -1, 1`. Else 400 `invalid_actions`.
   (After this check, TypeScript still thinks `actions` is `unknown[]`; a small type guard
   function `isAction(x: unknown): x is Action` makes the cast honest.)
4. `deps.store.takeChallenge(challengeId)`. Null means 404 `unknown_challenge`.
   From here on the challenge is used up, whatever happens.
5. `applyActions` on the challenge's board. Null (fell off the board) is 400 `invalid_actions`;
   not at the goal is 400 `not_solved`.
6. Save a `ScoreRecord`: `moves` is `actions.length`, `timeMs` is `deps.now() - issuedAt`,
   `at` is `new Date(now).toISOString()`, `day` is the first 10 characters of `at`.
7. Return 201 `{ moves, timeMs }`.

A tiny helper like `const fail = (status, error) => ({ status, body: { error } })` keeps this
readable.

**Done when:** "step 5" passes (7 tests).

## Step 6: the boards (`service.ts`)

Validate `query.board` (`today` / `alltime`) and `query.by` (`moves` / `time`), else 400
`invalid_request`. Today's `day` is today's UTC date from `deps.now()`. Ask the store for
`topScores(by, board === 'today' ? day : null, BOARD_SIZE)` and number them from 1. Return only
the `BoardEntry` fields (no `id` or `day` in each entry).

**Done when:** "step 6" passes (4 tests).

## Step 7: wire it into the Lambda (`handler.ts`)

Implement `handle(event, deps)`: match the route, call the right service function, and turn its
`Reply` into a response with the existing `json()` helper. Notes:

- The query string is `event.queryStringParameters`; the body is `event.body`.
- If `event.isBase64Encoded` is true, the body is base64:
  `Buffer.from(event.body, 'base64').toString('utf8')`.
- Leave every non-npuzzle route as it is (404 / 501).

Then make `handler` call `handle(event, deps)` with the real thing. Build the deps **once, at
module level** (outside the function), so warm Lambda invocations reuse them:
`store: new DynamoStore(process.env.TABLE_NAME)`, `now: Date.now`,
`newId: () => crypto.randomUUID()`, `random: Math.random`, `blocked: BLOCKED_WORDS`.
`DynamoStore` doesn't exist yet: until step 8, use `new MemoryStore()` there so everything
compiles. (Don't deploy that; it would forget scores whenever Lambda recycles.)

The older handler tests (wtfblaster routes) should pass unchanged. They import `handler.ts`, so
creating your deps at module level must not throw when `TABLE_NAME` isn't set.

**Done when:** "npuzzle step 7" passes (3 tests), and all 42 tests are green. Delete the
`todo()` helpers. Commit.

## Step 8: DynamoDB (`dynamo-store.ts`)

Write `class DynamoStore implements NpuzzleStore`. The table already exists (created by
`infra/lib/site-stack.ts`): string keys `pk` and `sk`, pay-per-request, and a TTL attribute
named `ttl` (epoch **seconds**; DynamoDB deletes the item some time after that).

**Packages:** `npm install -w api @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb`. The Lambda
runtime already includes the AWS SDK, so the bundler leaves it out of the upload; installing
gives you the types and lets tests import it. Use `DynamoDBDocumentClient` from `lib-dynamodb`:
it converts plain JS objects for you.

**Suggested keys** (one table holds everything, told apart by prefixes):

| What              | `pk`                                   | `sk`                                       | Other attributes                         |
| ----------------- | -------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| a challenge       | `NPUZZLE#CHALLENGE#<id>`               | `CHALLENGE`                                | `state`, `issuedAt`, `ttl` = issue + 1 h |
| all-time by moves | `SCORE#npuzzle#ALL#moves`              | `<moves, 6 digits>#<timeMs, 10>#<at>#<id>` | `name`, `moves`, `timeMs`, `at`, `id`    |
| all-time by time  | `SCORE#npuzzle#ALL#time`               | `<timeMs, 10>#<moves, 6>#<at>#<id>`        | same                                     |
| today by moves    | `SCORE#npuzzle#DAY#<yyyy-mm-dd>#moves` | like all-time                              | same + `ttl` = a few days later          |
| today by time     | `SCORE#npuzzle#DAY#<yyyy-mm-dd>#time`  | like all-time                              | same + `ttl`                             |

The trick: DynamoDB sorts items within a `pk` by `sk` **as text**, so zero-padding the numbers
(`String(n).padStart(6, '0')`) makes text order equal ranking order, ties included, exactly
like `compareScores` in `store.ts`. Then `topScores` is one `QueryCommand` on the right `pk`
with `Limit: limit` (ascending is the default). `putScore` writes four items, one per board:
use a `TransactWriteCommand` (all four or none) or a `BatchWriteCommand`.

**`takeChallenge` must be atomic:** use `DeleteCommand` with `ReturnValues: 'ALL_OLD'`. If two
requests race, only one gets the old item back; the other gets nothing. Then also check
`issuedAt` yourself: TTL deletion can lag by a day or more, so an expired challenge may still
be in the table.

**Testing it** is optional before deploying (the service tests already cover the logic). If you
want one, the `aws-sdk-client-mock` package can fake the client. Otherwise, step 9 is the test.

## Step 9: deploy and try it live

`npm run check`, commit, push the branch, open a PR, watch CI, merge. The Deploy workflow
ships it. Then, from your terminal:

```bash
B=https://appbep.com/api/scores/npuzzle
curl -s -X POST $B/challenge                 # {"id":"…","state":[…]}
curl -s "$B?board=today&by=moves"            # {"board":"today",…,"entries":[]}
curl -s -X POST $B -d '{"challengeId":"nope","name":"bam","actions":[1]}'   # unknown_challenge
```

Then play a game on your phone, put your name on the board, and check it appears under both
Today and All-time. Look at the items in the DynamoDB console (Explore items) to see your key
design for real. If something fails, the Lambda's logs are in CloudWatch, log group
`ApiLogs…` in the appbep account.

## Step 10: the admin delete script

Write `scripts/npuzzle-delete.sh` (or a `.ts` file run with `npx tsx`) that removes every
board entry for a given name, using your `appbep` AWS profile. Hints:

- The table name is the stack's `TableName` output:
  `aws cloudformation describe-stacks --stack-name … --query …`
- Query each of the board partitions (`ALL#moves`, `ALL#time`, and the recent `DAY#…` ones)
  with a `FilterExpression` on `name`, then `delete-item` each match. Print what you'll
  delete and ask for a `y` before doing it.
- It runs on your laptop with your credentials, never in the Lambda: there's no delete
  endpoint on the public API, on purpose.

---

## Definition of done

- [ ] All 42 api tests pass, no `todo()` left, `npm run check` green
- [ ] A game played on appbep.com shows up on both boards
- [ ] A submitted bad name gets "That name isn't allowed" and the player can retry
- [ ] Submitting the same challenge twice gets 404
- [ ] The delete script removed a test entry

## Stretch goals

- **One entry per name per board**: keep only a player's best (the store needs a
  "best for this name" item and a conditional update).
- **Bots**: reject times under ~2 s, or add Cloudflare Turnstile to the challenge request
  (the contact form will have it anyway, Phase 4).
- **15-puzzle**: `DIMENSION = 4`. The parity rule changes on an even-width board (the
  blank's row counts too). The game page would need a 4x4 mode.
- **WTF Blaster** could use the same idea, but a shooter can't be replayed on the server as
  cheaply. Worth thinking about why.

# appbep.com — Architecture Plan

_Draft 1 · 2026-11-05_

## 1. What we're building

| Zone           | URL                     | Feel                                                                                                         | Content                                                                                                |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Front page** | `appbep.com/`           | Minimal, elegant                                                                                             | Bio, photo, resume/CV, contact, interests, links (GitHub, LinkedIn, X, Substack). Copy written by you. |
| **Funhouse**   | `appbep.com/funhouse/…` | "Enter at your own risk." 1998 web, distorted visuals, sounds, jump-outs, Winchester Mystery House dead ends | Old projects shown as "exhibits"                                                                       |

### Funhouse exhibits (keep-list)

| Exhibit                  | Source                          | Tech today                                | Needs backend?                           |
| ------------------------ | ------------------------------- | ----------------------------------------- | ---------------------------------------- |
| WTF Blaster              | wtfblaster `/`                  | Canvas + jQuery + SoundJS (1.8k lines JS) | Yes: high scores                         |
| Pop Fishies              | wtfblaster `/popfishies`        | Canvas, vanilla JS                        | No                                       |
| Towers of Hanoi          | wtfblaster `js/towers_of_hanoi` | Canvas, vanilla JS                        | No                                       |
| N-Puzzizzle              | npuzzizzle `/npuzzle`           | RequireJS + Backbone + Handlebars         | Yes: leaderboard (time / moves)          |
| Puzzle Timer             | npuzzizzle `/timer`             | RequireJS                                 | No                                       |
| Sorting Animations       | old appbep `/sortinganimations` | Canvas, vanilla JS                        | No                                       |
| Schportz Quiz of the Day | schportz                        | jQuery + PHP/MySQL                        | Yes: vote tallies (questions are static) |
| Angry Packers Fan        | apf                             | 2009 PHP site                             | Yes: Quiz O' the Day tallies             |

## 2. Guiding decisions

1. **Static first.** Everything that can be a file is a file. The backend handles only what _must_ be written by visitors: scores and quiz votes.
2. **Exhibits stay mostly vintage.** The old JS games are kept close to how they were written and served as standalone static pages. Rewriting them in React would cost a lot and lose the period charm, which is the point of the funhouse. We fix only what's broken: dead CDNs, reCAPTCHA v1, server calls, and vendored libraries.
3. **New code is TypeScript.** That covers the front page, the funhouse shell (rooms, doors, effects), the API, and the infrastructure.
4. **Quiz questions live in the repo as JSON**, not in a database. They are versioned, reviewable, and free to serve. Only vote counts go to the database.
5. **No secrets in git, ever.** Nothing from the old configs is copied, and AWS access goes through GitHub OIDC (no stored keys).

## 3. Architecture

```
                      ┌──────────────── Route 53: appbep.com ────────────────┐
                      ▼                                                      │
                 CloudFront (HTTPS, ACM cert)                                │
          ┌───────────┴───────────────┐                                      │
          ▼                           ▼                                      │
   S3 bucket (static)           /api/*  →  API Gateway (HTTP API)            │
   ├─ /            React app     │          throttled, CORS-locked           │
   ├─ /funhouse/*  React shell   │                 ▼                         │
   └─ /exhibits/*  vintage pages │          Lambda (TypeScript, 1 function)  │
                                 │                 ▼                         │
                                 └────────► DynamoDB (1 table, on-demand)    │
```

### Frontend

- **Vite + React + TypeScript**, single build, React Router.
  - `/` is the front page.
  - `/funhouse` is the entrance ("Are you sure?").
  - `/funhouse/*` holds the rooms and hallways: the Winchester-style navigation, fake doors, stairs to nowhere, 1998 landing pages, sounds, and effects.
- **Exhibits** live in `public/exhibits/<name>/` as standalone HTML/JS, copied in and cleaned up. The funhouse links or "doors" into them, and each exhibit gets a small injected "escape hatch" link back to the funhouse.
- CloudFront Function: SPA fallback for `/funhouse/*` deep links. Exhibits are served as-is.

### Backend (one small API)

| Endpoint                                       | Purpose                                    |
| ---------------------------------------------- | ------------------------------------------ |
| `GET  /api/scores/{game}?board=today\|alltime` | Leaderboards (wtfblaster, npuzzle)         |
| `POST /api/scores/{game}`                      | Submit score (validated server-side)       |
| `GET  /api/quiz/{quiz}/{date}/tally`           | Vote counts (schportz, apf)                |
| `POST /api/quiz/{quiz}/{date}/vote`            | Cast a vote (one per visitor per question) |
| `POST /api/contact`                            | Contact form → email to you (see below)    |

**DynamoDB single table** (`pk` / `sk`):

| Item              | pk                    | sk                               | attrs                    |
| ----------------- | --------------------- | -------------------------------- | ------------------------ |
| Score             | `SCORE#wtfblaster`    | `2026-11-05#<score padded>#<id>` | name, stats…             |
| Daily-board index | GSI on `day` + score  |                                  |                          |
| Vote tally        | `QUIZ#apf#2009-09-14` | `TALLY`                          | c0..c4 (atomic counters) |
| Voter marker      | `QUIZ#apf#2009-09-14` | `VOTER#<hash(ip+salt)>`          | TTL 2 days               |
| Contact limiter   | `CONTACT#<hash(ip)>`  | `<yyyy-mm-dd>`                   | count, TTL 2 days        |

**Spam protection:** API Gateway throttling, server-side plausibility checks (e.g. hits ≤ shots, time > minimum possible), a name length/charset filter with a bad-word list, and hashed-IP vote dedupe. If spam shows up, add **Cloudflare Turnstile** (free). We skip AWS WAF because it alone costs more than the budget.

### Contact form (no public email address)

Your address never appears on the site or in the repo. Messages arrive by email from the API.

Anti-spam layers, all checked server-side (a bot can skip anything done only in the browser):

1. **Cloudflare Turnstile** (free, usually invisible "are you human" check). The Lambda verifies the token with Cloudflare before doing anything else.
2. **Honeypot field**: a hidden input real people never fill in. If it has a value, pretend success and drop the message.
3. **Minimum fill time**: forms submitted within ~3 seconds of loading are bots.
4. **Rate limit**: max 3 messages per visitor (hashed IP) per day, plus API Gateway throttling overall.
5. **Content limits**: length caps, at most 2 links, required valid reply-to address.
6. **Sending**: Amazon SES sends to your verified address with the visitor as Reply-To. Your address and the Turnstile secret live in AWS (SSM Parameter Store / Lambda env), never in git.

Cost: SES is $0.10 per 1,000 emails; Turnstile is free.

### Quiz system (shared by Schportz + APF)

- `content/quizzes/schportz.json` holds ~34 recovered questions (2010–2011).
- `content/quizzes/apf.json` holds the 5 recovered questions plus new ones you write.
- One React quiz component, skinned twice (sports-desk Schportz, angry-fan APF), shows one question per "day" with the five choices, the per-answer snark, and the tally.
- The "day" is a rotation through the question list keyed on the current date, so there's always a fresh question without anyone curating it.
- Decided: the old answers stay as written, labeled "as of 2009" (it's a relic).

### Angry Packers Fan exhibit

- Rebuilt as a **static period piece**: the home page, Bio, FAQ, Contact (non-functional or mailto), sitemap, and the Quiz O' the Day.
- Pull the text out of `content/apf_*_0.php`, and keep the 2009 layout and CSS as much as possible.
- Character art (`apf_head_space.png`, `apf_lam_pk.jpg`, the throne, the cheesehead sombrero, …) is also available to the funhouse itself, e.g. as a recurring jump-out character.
- ⚠️ Leave out press photos (Favre, Rodgers, Burress…) and photos of random people (`used_pics/`): copyright and privacy risk. Use your own photos and your own character art.

### Infrastructure & deploys

- **AWS CDK (TypeScript)** in `infra/`: S3, CloudFront, ACM (us-east-1), Route 53 records, API Gateway, Lambda, DynamoDB.
- **CI/CD (GitHub Actions)**, live since 2026-11-06:
  - `ci.yml` runs on every push and pull request: gitleaks secret scan (full history), format, lint, typecheck, tests, build, `cdk synth`.
  - `deploy.yml` runs after CI **passes for a push to `main` in this repo** (pull requests, including forks, never deploy), or by hand via "Run workflow". It builds and runs `cdk deploy`.
  - AWS login is OIDC, so there are no stored keys. GitHub issues a short-lived token; the IAM role `appbep-github-deploy` trusts only
    `repo:beparadox@872477/appbep@1447725704:ref:refs/heads/main`. That is GitHub's _immutable_ subject format (owner and repo IDs, not just names), enabled on this repo. The role can do nothing except assume CDK's bootstrap roles (deploy, file-publishing, lookup).
  - Repo **variables** (not secrets): `AWS_DEPLOY_ROLE_ARN`, `APPBEP_HOSTED_ZONE_ID`.
  - Every third-party action is pinned to a full commit SHA (`# vX.Y.Z` comment for humans), and the gitleaks image to a digest. Dependabot opens a weekly PR for action updates. The gitleaks image is updated by hand (Dependabot doesn't see `docker run` lines); keep `ci.yml` and `scripts/scan-secrets.sh` in sync.
- Manual deploy from a laptop still works: `npm run deploy` (reads the gitignored `.env.local`; log in first with `aws sso login --profile admin`).
- **Moving to its own AWS account (Nov 2026):** Appbep is leaving the Organization's management account for a
  dedicated member account. Step-by-step runbook: [docs/tutorials/move-to-own-account.md](tutorials/move-to-own-account.md).
  `npm run deploy` now requires `APPBEP_ACCOUNT_ID` in `.env.local` and refuses any other account.
- Separate `dev` stage optional later. Local dev uses Vite plus a local Lambda handler against DynamoDB Local in Podman.

### Estimated monthly cost

| Item                                                     | Cost                                                |
| -------------------------------------------------------- | --------------------------------------------------- |
| Route 53 hosted zone                                     | $0.50                                               |
| S3 + CloudFront (low traffic, free tier: 1 TB/mo egress) | ~$0.00–0.20                                         |
| Lambda + API Gateway (free tier / pennies)               | ~$0.00–0.10                                         |
| DynamoDB on-demand (tiny)                                | ~$0.00–0.25                                         |
| ACM certificate                                          | $0                                                  |
| **Total**                                                | **≈ $0.50–1.10 / month** (+ domain renewal ~$13/yr) |

## 4. Repo layout

```
appbep/
├─ docs/                 PLAN.md, decisions
├─ web/                  Vite + React + TS (front page + funhouse shell)
│  ├─ src/
│  └─ public/exhibits/   vintage games (wtfblaster, popfishies, hanoi, npuzzle, sorting, apf)
├─ content/              quizzes/*.json, front-page markdown you write
├─ api/                  Lambda handler (TS) + tests
├─ infra/                CDK app
└─ .github/workflows/    deploy.yml
```

Legacy sources stay in `~/dev/appbep-legacy` (local only, never committed).

## 5. Phases

| #   | Phase               | Outcome                                                                                                 |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| 0   | **Scaffold**        | git repo, Vite/React/TS, lint/format, CDK skeleton, `.gitignore` guarding secrets                       |
| 1   | **Front page**      | Layout + placeholders; you drop in bio/resume/photo; deploy to appbep.com (S3+CloudFront+cert)          |
| 2   | **Funhouse shell**  | Entrance, 2–3 rooms, Winchester navigation, sound/FX toolkit                                            |
| 3   | **Static exhibits** | Towers of Hanoi, Sorting Animations, Pop Fishies, Puzzle Timer                                          |
| 4   | **API + scores**    | Lambda/DynamoDB; contact form; WTF Blaster + N-Puzzizzle with leaderboards                              |
| 5   | **Quizzes**         | Shared quiz component; Schportz (recovered Qs) + APF (5 + new)                                          |
| 6   | **APF museum**      | Static rebuild of the APF site + character art in the funhouse                                          |
| 7   | **Polish**          | More rooms, more weird, analytics (privacy-friendly), maybe guestbook                                   |
| ✍️  | **ELIZA chat room** | Bambridge builds it: [docs/tutorials/eliza-chatroom.md](tutorials/eliza-chatroom.md) (any time after 2) |

Phase 1 can go live on its own, and everything after it ships one piece at a time.

**Phase 2 status (Nov 2026):** done locally. Entrance + 9 rooms (`web/src/funhouse/rooms.ts`), floor plan,
synthesized sounds, jump-outs, brass plaques. One exhibit list (`web/src/exhibits/registry.ts`) feeds both
the funhouse and the unlisted `/projects` page. Early exhibits already live: the original 2016 cube
(`/exhibits/bam-cube/`) and Duncan's Auto as redacted screenshots (`/exhibits/duncans/`).
The Patricia Peterson memorial (`/exhibits/memorial/`) is on `/projects` only, never in the funhouse:
the photo carousel alone, with no captions, neutral file names and stripped metadata. The F & F page and
guestbook are dropped; the Bio is left out for now (a trimmed draft is kept locally in appbep-legacy).

## 6. Open questions

1. ~~Public or private repo?~~ Decided: **public**, MIT license.
2. ~~2009/2011 quiz facts?~~ Decided: keep as written, labeled "as of 2009".
3. **APF new questions:** you write them, or I draft some in the APF voice for you to edit?
4. ~~Leaderboards?~~ Decided: keep **"today" + "all-time"**, each ranked by moves and by time (N-Puzzizzle). Names: 3-12 letters/digits/underscores, server-side word filter, admin delete script. WTF Blaster keeps personal bests on the device. See `docs/tutorials/npuzzle-leaderboard.md`.
5. ~~Contact info?~~ Decided: contact form (see above), no public email address.
6. **Name for the funhouse:** "Funhouse" is a placeholder.

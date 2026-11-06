# appbep.com

Personal site with two parts:

- **Front page** (`/`): a short bio, resume, interests, and links.
- **The Funhouse** (`/funhouse`): a deliberately weird, 1998-flavored walk through old projects.
  Enter at your own risk.

See [`docs/PLAN.md`](docs/PLAN.md) for the architecture and roadmap.

## Layout

| Path     | What                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------- |
| `web/`   | Vite + React + TypeScript (front page + funhouse shell); vintage exhibits in `web/public/exhibits/` |
| `api/`   | Lambda handler (TypeScript) for scores and quiz votes                                               |
| `infra/` | AWS CDK: S3 + CloudFront + Route 53 + ACM, API Gateway + Lambda + DynamoDB                          |
| `docs/`  | Plan and decisions                                                                                  |

## Develop

```bash
npm install        # also installs the pre-commit secret-scan hook
npm run dev        # http://localhost:5173
npm run check      # format, lint, typecheck, test, build, cdk synth, secret scan
```

## Deploy

```bash
npm run build
npm run deploy -w infra -- -c hostedZoneId=<Route 53 zone id>
```

Without `hostedZoneId` the site deploys to its `*.cloudfront.net` URL only.

## Secrets

There are none in this repo, by design. `.gitignore`, a gitleaks pre-commit hook
(`scripts/hooks/pre-commit`), and a CI gitleaks job all guard against accidents.
Run `npm run secrets:scan` any time.

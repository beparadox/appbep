#!/usr/bin/env bash
# Build and deploy the site with CDK.
#   scripts/deploy.sh          -> cdk deploy
#   scripts/deploy.sh diff     -> cdk diff (preview only)
# Settings come from the environment or a gitignored .env.local:
#   AWS_PROFILE=admin
#   APPBEP_HOSTED_ZONE_ID=Z...      (Route 53 zone for appbep.com; omit to deploy without the domain)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[ -f .env.local ] && set -a && . ./.env.local && set +a
action="${1:-deploy}"
ctx=()
[ -n "${APPBEP_HOSTED_ZONE_ID:-}" ] && ctx=(-c "hostedZoneId=$APPBEP_HOSTED_ZONE_ID")
echo "AWS profile: ${AWS_PROFILE:-<default>}   custom domain: $([ -n "${APPBEP_HOSTED_ZONE_ID:-}" ] && echo yes || echo no)"
aws sts get-caller-identity >/dev/null || { echo "Not logged in. Run: aws sso login --profile ${AWS_PROFILE:-default}"; exit 1; }
npm run build
cd infra
case "$action" in
  diff) npx cdk diff "${ctx[@]}" ;;
  deploy) npx cdk deploy "${ctx[@]}" --require-approval broadening ;;
  *) echo "usage: scripts/deploy.sh [deploy|diff]"; exit 2 ;;
esac

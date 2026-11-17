#!/usr/bin/env bash
# Card picker, step 4: put a built card online at appbep.com/birthday/<id>.
#
#   scripts/card-picker/upload.sh ~/dev/appbep-cards/<card>
#
# Uploads <card>/out/<id>/ to the site bucket under cards/<id>/. Photos and clips have
# hashed names, so they're cached for a year; card.json is never cached, so edits show
# up straight away. Needs AWS_PROFILE (or .env.local's) for the Appbep account.
#
# Refuses if card.config.json still says "localOnly": true (e.g. stand-in music that
# mustn't be published), or if the deployed site predates card support.
set -euo pipefail

card="${1:?Usage: upload.sh <card folder>}"
card="$(cd "$card" && pwd)"
repo="$(cd "$(dirname "$0")/../.." && pwd)"

# AWS_PROFILE from .env.local unless already set.
if [[ -z "${AWS_PROFILE:-}" && -f "$repo/.env.local" ]]; then
  AWS_PROFILE="$(sed -n 's/^AWS_PROFILE=//p' "$repo/.env.local" | tr -d '"' | head -1)"
  export AWS_PROFILE
fi

read -r id local_only < <(python3 -c '
import json, sys
c = json.load(open(sys.argv[1]))
print(c.get("id") or "", "yes" if c.get("localOnly") else "no")
' "$card/card.config.json")

if [[ -z "$id" ]]; then
  echo "No card id yet: run build.py first." >&2
  exit 1
fi
if [[ "$local_only" == "yes" ]]; then
  echo "card.config.json has \"localOnly\": true, so this card stays on this computer." >&2
  echo "Clear it once everything on the card is OK to publish (e.g. the music)." >&2
  exit 1
fi
out="$card/out/$id"
[[ -f "$out/card.json" ]] || { echo "Nothing built at $out: run build.py first." >&2; exit 1; }

output() {
  aws cloudformation describe-stacks --stack-name Appbep \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
bucket="$(output BucketName)"
dist="$(output DistributionId)"
if [[ -z "$bucket" || "$bucket" == "None" ]]; then
  echo "The deployed site doesn't have card support yet (no BucketName output)." >&2
  echo "Merge and deploy it first, so a site deploy can't delete the card." >&2
  exit 1
fi

size="$(du -sh "$out" | cut -f1)"
echo "Uploading $size to s3://$bucket/cards/$id/ ..."
aws s3 sync "$out/" "s3://$bucket/cards/$id/" --delete --exclude card.json \
  --cache-control "public, max-age=31536000, immutable" --only-show-errors
aws s3 cp "$out/card.json" "s3://$bucket/cards/$id/card.json" \
  --cache-control "no-cache" --content-type application/json --only-show-errors
aws cloudfront create-invalidation --distribution-id "$dist" \
  --paths "/cards/$id/card.json" --query Invalidation.Id --output text >/dev/null

echo "Done: https://appbep.com/birthday/$id"

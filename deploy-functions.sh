#!/usr/bin/env bash
# Deploy the server-side password reset to Firebase.
#
# Run this from the repository:      ./deploy-functions.sh
# A browser opens once for sign-in; after that it deploys on its own.
set -euo pipefail
cd "$(dirname "$0")"

CLI="/private/tmp/claude-501/-Users-namangupta-claude/10fbb5d9-f04a-405c-bb03-575182025c3d/scratchpad/fbcli/node_modules/.bin/firebase"
[ -x "$CLI" ] || CLI="npx --yes firebase-tools"     # fall back if the local copy was cleaned up

echo
echo "  Stepping Stone — deploying the password-reset function"
echo "  project: steppingstone-32aaf"
echo

if ! $CLI login:list 2>/dev/null | grep -qi '@'; then
  echo "  Signing you in to Firebase — a browser window will open."
  echo "  Pick the Google account that owns the steppingstone-32aaf project."
  echo
  # The CLI asks two unrelated questions first (Gemini features, usage analytics) and will sit waiting for an
  # answer before it ever opens the browser — which looks exactly like a hang. Answer both automatically.
  printf 'n\nn\n' | $CLI login || $CLI login
  echo
fi

# The CLI analyses the function source before deploying and needs its dependencies present, otherwise it
# fails with "Couldn't find firebase-functions package". Install them if they are missing.
if [ ! -d functions/node_modules ]; then
  echo "  Installing the function's dependencies (first run only)…"
  ( cd functions && npm install --no-audit --no-fund >/dev/null 2>&1 )
  echo
fi

echo "  Deploying…  (the first run also enables Cloud Functions, Cloud Build and"
echo "  Artifact Registry on the project — this is normal and automatic on Blaze)"
echo
$CLI deploy --only functions

echo
echo "  Done. Admin → Accounts → Reset a password now performs a REAL reset:"
echo "  the teacher keeps her username, her old password stops working, and"
echo "  nothing is stored in plain text."
echo

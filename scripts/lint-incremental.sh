#!/usr/bin/env bash
# scripts/lint-incremental.sh
# Lints only changed files in apps/web since origin/master or last commit

set -euo pipefail

# Find changed files in apps/web
# We filter for .ts and .tsx files
FILES=$(
  git diff --name-only origin/master...HEAD \
    | grep -E '^apps/web/.*\.(ts|tsx)$' \
    | grep -v '^apps/web/next-env\.d\.ts$' \
    || true
)

if [ -z "$FILES" ]; then
  echo "✅ No changed files to lint in apps/web."
  exit 0
fi

echo "🔍 Linting changed files:"
echo "$FILES"

# Execute next lint passing the files
# We need to run it from the root or filter via pnpm
# next lint --file <file1> --file <file2>
LINT_ARGS=""
for f in $FILES; do
  # Next lint expects paths relative to the app directory if run inside it,
  # or relative to root if run from root.
  # Since we are using pnpm --filter @doit/web, we should make them relative to apps/web
  REL_FILE=${f#apps/web/}
  LINT_ARGS="$LINT_ARGS --file $REL_FILE"
done

if command -v pnpm >/dev/null 2>&1; then
  pnpm --filter @doit/web exec next lint $LINT_ARGS
else
  corepack pnpm --filter @doit/web exec next lint $LINT_ARGS
fi

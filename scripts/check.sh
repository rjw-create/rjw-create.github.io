#!/usr/bin/env bash
# One command that verifies everything. Claude runs this before saying "done",
# and the Stop hook runs it automatically. Exit 0 = all good.
# --fast (used by the Stop hook): skips the format check and the build. Run without it before a PR.
set -uo pipefail
cd "$(dirname "$0")/.."
fast=0; [ "${1:-}" = "--fast" ] && fast=1

if [ -f pnpm-lock.yaml ]; then pm=pnpm; elif [ -f yarn.lock ]; then pm=yarn; else pm=npm; fi
fail=0
step() { printf '\n==> %s\n' "$1"; }
has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null; }

[ -f package.json ] || { echo "No package.json found"; exit 1; }
[ -d node_modules ] || { echo "node_modules missing - run '$pm install' first"; exit 1; }

step "Types"
if [ -f tsconfig.json ]; then
  if has_script typecheck; then $pm run typecheck || fail=1; else npx --no-install tsc --noEmit || fail=1; fi
else
  echo "No tsconfig.json - skipping"
fi

step "Lint"
if has_script lint; then $pm run lint || fail=1; else echo "No lint script - skipping"; fi

step "Design (token lint + contrast, see DESIGN.md)"
if [ -f scripts/design-check.mjs ]; then node scripts/design-check.mjs || fail=1; else echo "No scripts/design-check.mjs - skipping"; fi

step "Format"
if [ $fast -eq 1 ]; then
  echo "skipped (--fast)"
elif has_script format:check; then
  $pm run format:check || fail=1
elif [ -x node_modules/.bin/prettier ]; then
  # Source files only; docs and config are left alone.
  node_modules/.bin/prettier --check --log-level warn --no-error-on-unmatched-pattern \
    "src/**/*.{js,jsx,ts,tsx,css,scss,vue,svelte}" "app/**/*.{js,jsx,ts,tsx,css}" \
    "test/**/*.{js,ts,tsx}" "tests/**/*.{js,ts,tsx}" || fail=1
else
  echo "prettier not installed - skipping"
fi

step "Tests"
if has_script test && ! grep -q 'no test specified' package.json; then
  CI=1 $pm test || fail=1
else
  echo "No test script yet"
fi

step "Visual snapshots (opt-in, 375px and 1280px, light and dark)"
# Runs only where baselines exist for this OS: they are valid from one environment only
# (see BASELINE_PLATFORM in playwright.visual.config.mjs). Skipped in --fast so mid-task layout
# work doesn't trip the Stop hook; the full check before a PR runs it.
platform="$(node -p process.platform)"
if [ ! -d tests/visual/__snapshots__ ]; then
  echo "skipped: no tests/visual/__snapshots__ (opt in with install.sh --visual-snapshots)"
elif [ $fast -eq 1 ]; then
  echo "skipped (--fast)"
elif [ ! -d "tests/visual/__snapshots__/$platform" ]; then
  echo "skipped: baselines are for another OS, none for $platform"
elif [ ! -d node_modules/@playwright/test ]; then
  if [ -n "${CI:-}" ]; then
    echo "  FAIL  node_modules/@playwright/test missing in CI: the workflow must run npm ci first"; fail=1
  else
    echo "skipped: Playwright not installed. To enable, run once: $pm install && npx playwright install chromium"
  fi
else
  $pm run visual || { echo "  Screenshots differ: compare the PNGs in test-results/visual. If the change is intended, run '$pm run visual:update' and commit the PNGs."; fail=1; }
fi

step "Decision records link their PR (CI pull requests only)"
# check-both.sh runs this once itself and sets DECISION_LINK_CHECKED so it isn't run twice.
if [ $fast -eq 1 ]; then
  echo "skipped (--fast)"
elif [ -n "${DECISION_LINK_CHECKED:-}" ]; then
  echo "skipped: scripts/check.sh runs it once for both stacks"
elif [ -f scripts/decision-link-check.mjs ]; then
  node scripts/decision-link-check.mjs || fail=1
else
  echo "No scripts/decision-link-check.mjs - skipping"
fi

step "Build"
if [ $fast -eq 1 ]; then echo "skipped (--fast)"; elif has_script build; then $pm run build >/dev/null || { echo "build failed"; fail=1; }; else echo "No build script - skipping"; fi

echo
if [ $fail -eq 0 ]; then echo "CHECK PASSED"; else echo "CHECK FAILED"; fi
exit $fail

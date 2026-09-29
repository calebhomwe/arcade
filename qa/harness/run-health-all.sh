#!/usr/bin/env bash
# Rerun everything: health + progression across all games in Chromium, in chunks (never more than 2 browsers at once),
# then WebKit on the games that most need it. Resumable: finished games are skipped (SKIP_DONE=1).
#   bash qa/harness/run-health-all.sh            # Chromium health + progression
#   bash qa/harness/run-health-all.sh webkit     # + WebKit on the worst/kid/pet list (qa/health-results/webkit-ids.txt)
set -u
cd "$(dirname "$0")/../.."
export WORKERS=${WORKERS:-2} SKIP_DONE=1
for i in 1 2 3 4; do CHUNK=$i/4 node qa/harness/health.mjs; done
for i in 1 2 3 4; do CHUNK=$i/4 node qa/harness/progression.mjs; done
if [ "${1:-}" = "webkit" ]; then
  export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/pw-webkit}
  ENGINE=webkit REPORT_DIR=qa/health-results/webkit GAME_IDS=$(paste -sd, qa/health-results/webkit-ids.txt) node qa/harness/health.mjs
fi

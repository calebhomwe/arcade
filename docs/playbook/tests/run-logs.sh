#!/usr/bin/env bash
# Re-run the four page tests and the default look capture, each through the shared slot lock.
cd "$(dirname "$0")"
export PLAYWRIGHT_BROWSERS_PATH="${WEBKIT_DIR:-/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/pw-webkit}"
S=${SLOT:-/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/slot.sh}
B=http://localhost:8765/arcade/docs/playbook; OUT=results; SH=${SHOTS:-/tmp/playbook-shots}; mkdir -p $OUT $SH
$S node run.mjs $B/tests/feel-test.html        > $OUT/feel.json 2>&1
$S node run.mjs $B/tests/iphone-test.html      > $OUT/iphone.json 2>&1
$S node run.mjs $B/tests/progression-test.html > $OUT/progression.json 2>&1
$S node look-check.mjs "still=1&ui=1" $SH/look-default > $OUT/look-default.json 2>&1
echo done

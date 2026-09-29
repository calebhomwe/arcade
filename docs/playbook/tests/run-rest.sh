#!/usr/bin/env bash
# Second half of run-all.sh, every browser job through the shared slot lock.
cd "$(dirname "$0")"
export PLAYWRIGHT_BROWSERS_PATH="${WEBKIT_DIR:-/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/pw-webkit}"
S=${SLOT:-/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/slot.sh}
B=http://localhost:8765/arcade/docs/playbook; OUT=results; SH=${SHOTS:-/tmp/playbook-shots}; mkdir -p $OUT $SH
$S node run.mjs $B/tests/iphone-test.html        > $OUT/iphone.json 2>&1
$S node iphone-interact.mjs                      > $OUT/iphone-interact.json 2>&1
$S node look-interact.mjs $SH/interact           > $OUT/look-interact.json 2>&1
$S node godot-dpr.mjs heat-firm                  > $OUT/godot-dpr.json 2>&1
$S node godot-webkit.mjs city-builder,heat-firm $SH/godot webkit > $OUT/godot-webkit.json 2>&1
echo done

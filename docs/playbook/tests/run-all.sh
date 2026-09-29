#!/usr/bin/env bash
# Regenerate every result file used by the playbook. Needs: the static server on :8765 serving /home/user,
# Playwright WebKit (PLAYWRIGHT_BROWSERS_PATH), and Chromium in /opt/pw-browsers. About 8 minutes on a loaded 4-core box.
set -u
cd "$(dirname "$0")"
# Playwright WebKit build (the sandbox keeps it outside /opt/pw-browsers). Override with WEBKIT_DIR.
export PLAYWRIGHT_BROWSERS_PATH="${WEBKIT_DIR:-/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/pw-webkit}"
B=http://localhost:8765/arcade/docs/playbook
OUT=results; SH=${SHOTS:-/tmp/playbook-shots}; mkdir -p "$OUT" "$SH"
node run.mjs $B/tests/feel-test.html          > $OUT/feel.json 2>&1
node run.mjs $B/tests/iphone-test.html        > $OUT/iphone.json 2>&1
node run.mjs $B/tests/progression-test.html   > $OUT/progression.json 2>&1
node iphone-interact.mjs                      > $OUT/iphone-interact.json 2>&1
node look-check.mjs "still=1&ui=1" $SH/look-default > $OUT/look-default.json 2>&1
node look-matrix.mjs $SH/matrix               > $OUT/look-matrix.log 2>&1; cp $SH/matrix/matrix.json $OUT/look-matrix.json
node look-probe.mjs                           > $OUT/look-probe.json 2>&1
node look-interact.mjs $SH/interact           > $OUT/look-interact.json 2>&1
node godot-dpr.mjs heat-firm                  > $OUT/godot-dpr.json 2>&1
node godot-webkit.mjs city-builder,heat-firm $SH/godot webkit > $OUT/godot-webkit.json 2>&1
echo done

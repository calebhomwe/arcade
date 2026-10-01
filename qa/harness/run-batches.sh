#!/usr/bin/env bash
# Run health.mjs or progression.mjs over every game in small batches, each batch through the shared browser-slot lock
# (the box is shared: at most 3 browser jobs at once across all agents). Resumable: finished games are skipped.
#   bash qa/harness/run-batches.sh health [BATCH=2] [LOOPS=2]        Chromium, qa/health-results/
#   bash qa/harness/run-batches.sh progression [BATCH=2] [LOOPS=2]   Chromium, qa/health-results/progression/
#   ENGINE=webkit REPORT_DIR=qa/health-results/webkit GAME_IDS=a,b,c bash qa/harness/run-batches.sh health
# SLOT=path/to/slot.sh overrides the lock wrapper (default: the session scratchpad's slot.sh if present, else none).
set -u
cd "$(dirname "$0")/../.."
KIND=${1:-health}; BATCH=${2:-2}; LOOPS=${3:-2}
SLOT=${SLOT:-/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/slot.sh}
[ -x "$SLOT" ] || SLOT=""
DEFAULT_OUT=qa/health-results; [ "$KIND" = progression ] && DEFAULT_OUT=qa/health-results/progression
OUT=${REPORT_DIR:-$DEFAULT_OUT}
IDS=$(node -e '
const m=require("./assets/game-meta.json").games, fs=require("fs"), out=process.argv[1], want=process.env.GAME_IDS?process.env.GAME_IDS.split(","):null;
const heavy=g=>/Godot\//.test(g.src)||g.id==="bloxburg-town";
const ids=Object.entries(m).filter(([id,g])=>!g.frozen&&(!want||want.includes(id))&&!fs.existsSync(out+"/games/"+id+".json")).map(([id,g])=>({id,heavy:heavy(g)}));
const light=ids.filter(x=>!x.heavy).map(x=>x.id), hv=ids.filter(x=>x.heavy).map(x=>x.id), b=+process.argv[2], batches=[];
for(let i=0;i<light.length;i+=b) batches.push(light.slice(i,i+b).join(","));
for(const h of hv) batches.push(h);
console.log(batches.join("\n"));' "$OUT" "$BATCH")
SCRIPT=qa/harness/health.mjs; [ "$KIND" = progression ] && SCRIPT=qa/harness/progression.mjs
export WORKERS=1 RECHECK=${RECHECK:-1} REPORT_DIR="$OUT"
echo "$IDS" | grep -c . | xargs echo "batches:"
echo "$IDS" | xargs -P "$LOOPS" -I{} bash -c "GAME_IDS={} $SLOT node $SCRIPT 2>&1 | grep -v '^->' | grep -v games,"
node -e 'import("./qa/harness/lib/'$( [ "$KIND" = progression ] && echo progress-report || echo health-report )'.mjs").then(m=>m.'$( [ "$KIND" = progression ] && echo writeProgressReport || echo writeHealthReport )'(process.argv[1]))' "$OUT"
echo "done -> $OUT"

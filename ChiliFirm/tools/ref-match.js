#!/usr/bin/env node
'use strict';
/*
 * ref-match.js — numeric vision stand-in for chili-firm2 (browser game).
 *
 * No npm deps. Pixel extraction is delegated to one PowerShell invocation per
 * image (System.Drawing, LockBits -> raw BGRA buffer). PowerShell prints a
 * compact JSON of region stats to a temp file; Node orchestrates, scores and
 * reports.
 *
 * Regions (fractions of image):
 *   top        y in [0, 0.12h)
 *   upper-mid  y in [0.18h, 0.55h)
 *   middle     y in [0.55h, 0.82h)
 *   bottom     y in [0.82h, h)
 *   left       x in [0, 0.15w), all y
 *
 * Per image (from PowerShell):
 *   - avg RGB + avg saturation per region
 *   - top-6 quantized color buckets (16 levels/channel) with percentages
 *   - bright%  (r+g+b > 400)
 *
 * Score: weighted Euclidean RGB distance over the 5 regions
 *   (top .3, upper-mid .2, middle .2, bottom .2, left .1)
 *   similarity% = max(0, 100 - dist/255*100*k)   k calibrated (default 1.0)
 *   identical => 100; dist >= 255 => ~0.
 *
 * Hue drift: per region, RGB delta (ref - ours) and a suggested hex that moves
 * ours halfway toward ref (per channel).
 *
 * Usage:
 *   node tools/ref-match.js <ours.png> <ref.png> [--json] [--k 1.0]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REGION_WEIGHTS = { top: 0.3, 'upper-mid': 0.2, middle: 0.2, bottom: 0.2, left: 0.1 };
const REGION_ORDER = ['top', 'upper-mid', 'middle', 'bottom', 'left'];
const K_DEFAULT = 1.0;

// PowerShell analysis: one invocation per image. Writes compact JSON to $args[1].
// No backticks, no ${} — keep it safe inside the JS template literal below.
const PS_ANALYZE = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing | Out-Null
$ImagePath = $args[0]
$OutPath = $args[1]
$bmp = [System.Drawing.Bitmap]::new($ImagePath)
$w = $bmp.Width
$h = $bmp.Height
$rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$buf = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)
$bmp.UnlockBits($data)
$bmp.Dispose()

$step = 1
if (($w * $h) -gt 800000) { $step = 2 }

$regions = @('top', 'upper-mid', 'middle', 'bottom', 'left')
$sums = @{}
$counts = @{}
foreach ($r in $regions) {
  $sums[$r] = @(0.0, 0.0, 0.0, 0.0)
  $counts[$r] = 0
}

$buckets = @{}
$total = 0
$bright = 0

$topEnd = [int][math]::Floor($h * 0.12)
$umStart = [int][math]::Floor($h * 0.18)
$umEnd = [int][math]::Floor($h * 0.55)
$midEnd = [int][math]::Floor($h * 0.82)
$leftEnd = [int][math]::Floor($w * 0.15)

for ($y = 0; $y -lt $h; $y += $step) {
  $row = $y * $stride
  $yRegion = ''
  if ($y -lt $topEnd) { $yRegion = 'top' }
  elseif ($y -ge $umStart -and $y -lt $umEnd) { $yRegion = 'upper-mid' }
  elseif ($y -ge $umEnd -and $y -lt $midEnd) { $yRegion = 'middle' }
  elseif ($y -ge $midEnd) { $yRegion = 'bottom' }
  for ($x = 0; $x -lt $w; $x += $step) {
    $i = $row + ($x * 4)
    $b = $buf[$i]
    $g = $buf[$i + 1]
    $r = $buf[$i + 2]
    $total += 1
    if (($r + $g + $b) -gt 400) { $bright += 1 }
    $key = ((([int]$r -shr 4) -shl 8) -bor ((([int]$g -shr 4)) -shl 4) -bor ([int]$b -shr 4))
    if ($buckets.ContainsKey($key)) { $buckets[$key] += 1 } else { $buckets[$key] = 1 }
    if ($yRegion -ne '') {
      $s = $sums[$yRegion]
      $s[0] += $r
      $s[1] += $g
      $s[2] += $b
      $mx = $r
      if ($g -gt $mx) { $mx = $g }
      if ($b -gt $mx) { $mx = $b }
      $mn = $r
      if ($g -lt $mn) { $mn = $g }
      if ($b -lt $mn) { $mn = $b }
      if ($mx -gt 0) { $s[3] += (($mx - $mn) / $mx) }
      $counts[$yRegion] += 1
    }
    if ($x -lt $leftEnd) {
      $s = $sums['left']
      $s[0] += $r
      $s[1] += $g
      $s[2] += $b
      $mx = $r
      if ($g -gt $mx) { $mx = $g }
      if ($b -gt $mx) { $mx = $b }
      $mn = $r
      if ($g -lt $mn) { $mn = $g }
      if ($b -lt $mn) { $mn = $b }
      if ($mx -gt 0) { $s[3] += (($mx - $mn) / $mx) }
      $counts['left'] += 1
    }
  }
}

$result = [ordered]@{}
$result['width'] = $w
$result['height'] = $h
$regionOut = [ordered]@{}
foreach ($r in $regions) {
  $c = $counts[$r]
  $s = $sums[$r]
  if ($c -gt 0) {
    $regionOut[$r] = [ordered]@{
      r = [int][math]::Round($s[0] / $c)
      g = [int][math]::Round($s[1] / $c)
      b = [int][math]::Round($s[2] / $c)
      sat = [math]::Round($s[3] / $c, 3)
    }
  } else {
    $regionOut[$r] = [ordered]@{ r = 0; g = 0; b = 0; sat = 0 }
  }
}
$result['regions'] = $regionOut
$bucketList = @()
$buckets.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 6 | ForEach-Object {
  $k = $_.Key
  $rr = ((($k -shr 8) -band 0xF) * 16) + 8
  $gg = ((($k -shr 4) -band 0xF) * 16) + 8
  $bb = (($k -band 0xF) * 16) + 8
  $pct = [math]::Round((100.0 * $_.Value) / $total, 2)
  $bucketList += [ordered]@{ r = $rr; g = $gg; b = $bb; pct = $pct }
}
$result['buckets'] = $bucketList
$result['brightPct'] = [math]::Round((100.0 * $bright) / $total, 2)
$json = $result | ConvertTo-Json -Compress -Depth 6
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutPath, $json, $utf8)
`;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function clamp255(v) { return Math.min(255, Math.max(0, Math.round(v))); }

function hexOf(c) {
  return '#' + [c.r, c.g, c.b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('');
}

function rgbDist(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db); // 0..441.67
}

function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const mx = Math.max(rn, gn, bn);
  const mn = Math.min(rn, gn, bn);
  const d = mx - mn;
  let h = 0;
  if (d !== 0) {
    if (mx === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (mx === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  const s = mx === 0 ? 0 : d / mx;
  return { h, s, v: mx };
}

function findPowerShell() {
  const pathDirs = (process.env.PATH || '')
    .split(path.delimiter)
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
  const names = process.platform === 'win32'
    ? ['pwsh.exe', 'pwsh', 'powershell.exe', 'powershell']
    : ['pwsh', 'powershell'];
  for (const n of names) {
    for (const d of pathDirs) {
      try {
        const full = path.join(d, n);
        if (fs.existsSync(full)) return full;
      } catch (_) { /* ignore */ }
    }
  }
  const fixed = [
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'C:\\windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  ];
  for (const p of fixed) {
    try { if (fs.existsSync(p)) return p; } catch (_) { /* ignore */ }
  }
  return null;
}

function analyzeImage(imagePath) {
  if (!fs.existsSync(imagePath)) throw new Error('Image not found: ' + imagePath);
  const shell = findPowerShell();
  if (!shell) throw new Error('No PowerShell (pwsh/powershell) found on PATH');
  const stamp = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpPs1 = path.join(os.tmpdir(), `refmatch-${stamp}.ps1`);
  const tmpJson = path.join(os.tmpdir(), `refmatch-${stamp}.json`);
  fs.writeFileSync(tmpPs1, PS_ANALYZE, 'utf8');
  try {
    const res = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpPs1, imagePath, tmpJson], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
    if (res.error) throw res.error;
    if (res.status !== 0) {
      const tail = (res.stderr || res.stdout || '').toString().trim().split(/\r?\n/).slice(-15).join('\n');
      throw new Error(`PowerShell analysis failed (exit ${res.status}):\n${tail}`);
    }
    if (!fs.existsSync(tmpJson)) throw new Error('PowerShell produced no JSON output file');
    let txt = fs.readFileSync(tmpJson, 'utf8');
    if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
    return JSON.parse(txt);
  } finally {
    for (const f of [tmpPs1, tmpJson]) {
      try { fs.unlinkSync(f); } catch (_) { /* ignore */ }
    }
  }
}

// ---------------------------------------------------------------------------
// scoring + suggestions
// ---------------------------------------------------------------------------

function computeReport(ours, ref, k) {
  const perRegion = {};
  let weighted = 0;
  for (const r of REGION_ORDER) {
    const d = rgbDist(ours.regions[r], ref.regions[r]);
    perRegion[r] = d;
    weighted += REGION_WEIGHTS[r] * d;
  }
  const similarity = Math.max(0, 100 - (weighted / 255) * 100 * k);

  const suggestions = {};
  const css = [];
  for (const r of REGION_ORDER) {
    const o = ours.regions[r];
    const f = ref.regions[r];
    const delta = { r: Math.round(f.r - o.r), g: Math.round(f.g - o.g), b: Math.round(f.b - o.b) };
    const suggested = { r: clamp255(o.r + delta.r / 2), g: clamp255(o.g + delta.g / 2), b: clamp255(o.b + delta.b / 2) };
    const hO = rgbToHsv(o.r, o.g, o.b);
    const hF = rgbToHsv(f.r, f.g, f.b);
    let hueDrift = hF.h - hO.h;
    if (hueDrift > 180) hueDrift -= 360;
    if (hueDrift < -180) hueDrift += 360;
    const impact = REGION_WEIGHTS[r] * Math.abs(delta.r + delta.g + delta.b) / 3;
    suggestions[r] = {
      weight: REGION_WEIGHTS[r],
      ours: { r: o.r, g: o.g, b: o.b },
      ref: { r: f.r, g: f.g, b: f.b },
      oursHex: hexOf(o),
      refHex: hexOf(f),
      delta,
      hueDriftDeg: Math.round(hueDrift * 10) / 10,
      satOurs: o.sat,
      satRef: f.sat,
      suggested: { r: suggested.r, g: suggested.g, b: suggested.b },
      suggestedHex: hexOf(suggested),
      impact,
    };
    css.push({ region: r, weight: REGION_WEIGHTS[r], fromHex: suggestions[r].oursHex, toHex: suggestions[r].suggestedHex, delta, impact });
  }
  css.sort((a, b) => b.impact - a.impact);
  return { weightedDist: weighted, perRegion, similarity, suggestions, recommendedCss: css };
}

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------

function fmtPct(v) { return v.toFixed(1) + '%'; }

function humanReport(oursPath, refPath, ours, ref, report, k) {
  const L = [];
  L.push('ref-match.js — numeric vision stand-in (no image models)');
  L.push('');
  L.push(`ours : ${oursPath}  (${ours.width}x${ours.height})`);
  L.push(`ref  : ${refPath}  (${ref.width}x${ref.height})`);
  L.push('');
  L.push(`SIMILARITY: ${fmtPct(report.similarity)}   (weighted RGB dist ${report.weightedDist.toFixed(1)} / 441.7, k=${k})`);
  L.push(`  rule: similarity = max(0, 100 - dist/255*100*k); identical => 100%, dist>=255 => 0%`);
  L.push('');
  L.push('REGION TABLE  (weights: top .30 | upper-mid .20 | middle .20 | bottom .20 | left .10)');
  L.push('region     w     ours(hex)    ref(hex)     dRGB          hueDeg   sat(o/r)   suggested(hex)');
  for (const r of REGION_ORDER) {
    const s = report.suggestions[r];
    const d = s.delta;
    L.push(
      `${r.padEnd(9)} ${s.weight.toFixed(2)}  ${s.oursHex}  ${s.refHex}  ` +
      `(${(d.r >= 0 ? '+' : '') + d.r},${(d.g >= 0 ? '+' : '') + d.g},${(d.b >= 0 ? '+' : '') + d.b})  ` +
      `${(s.hueDriftDeg >= 0 ? '+' : '') + s.hueDriftDeg}deg  ${s.satOurs.toFixed(2)}/${s.satRef.toFixed(2)}  ${s.suggestedHex}`
    );
  }
  L.push('');
  L.push('COLOR BUCKETS (top-6, 16-level quantized):');
  L.push('  ours: ' + ours.buckets.map((b) => `${hexOf(b)} ${b.pct}%`).join(', '));
  L.push('  ref : ' + ref.buckets.map((b) => `${hexOf(b)} ${b.pct}%`).join(', '));
  L.push('');
  L.push(`BRIGHT % (r+g+b>400):  ours ${ours.brightPct}% | ref ${ref.brightPct}%`);
  L.push('');
  L.push('RECOMMENDED CSS HEX CHANGES (move ours halfway toward ref, by impact):');
  for (const c of report.recommendedCss) {
    L.push(`  ${c.region.padEnd(9)} ${c.fromHex} -> ${c.toHex}   (weight ${c.weight}, dRGB (${c.delta.r},${c.delta.g},${c.delta.b}))`);
  }
  return L.join('\n');
}

function jsonReport(oursPath, refPath, ours, ref, report, k) {
  return JSON.stringify({
    ours: { path: oursPath, width: ours.width, height: ours.height, regions: ours.regions, buckets: ours.buckets, brightPct: ours.brightPct },
    ref: { path: refPath, width: ref.width, height: ref.height, regions: ref.regions, buckets: ref.buckets, brightPct: ref.brightPct },
    score: {
      k,
      weightedDist: report.weightedDist,
      perRegionDist: report.perRegion,
      similarityPct: report.similarity,
      formula: 'max(0, 100 - dist/255*100*k)',
    },
    suggestions: report.suggestions,
    recommendedCss: report.recommendedCss,
  }, null, 2);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`Usage: node tools/ref-match.js <ours.png> <ref.png> [--json] [--k <num>]

  <ours.png>   your screenshot
  <ref.png>    reference screenshot
  --json       machine-readable JSON report
  --k <num>    score steepness (default ${K_DEFAULT}; identical => 100, wildly different => ~0)
`);
}

function main(argv) {
  const positional = [];
  let json = false;
  let k = K_DEFAULT;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--k') k = parseFloat(argv[++i]);
    else if (a.startsWith('--k=')) k = parseFloat(a.slice(4));
    else if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
    else positional.push(a);
  }
  if (positional.length < 2) { printHelp(); process.exit(2); }
  if (!Number.isFinite(k) || k < 0) { console.error('--k must be a non-negative number'); process.exit(2); }

  const oursPath = path.resolve(positional[0]);
  const refPath = path.resolve(positional[1]);

  const ours = analyzeImage(oursPath);
  const ref = analyzeImage(refPath);
  const report = computeReport(ours, ref, k);

  console.log(json ? jsonReport(oursPath, refPath, ours, ref, report, k) : humanReport(oursPath, refPath, ours, ref, report, k));
}

main(process.argv.slice(2));

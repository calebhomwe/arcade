/* ============================================================
   Chili Firm 2 — Grow-room scene
   Two fixed compositions (landscape 1280x720, portrait 390x780)
   scaled to fit the viewport; wall/floor bleed to the edges.
   Upgrades change what is in the room.
   ============================================================ */
(function (global) {
  'use strict';

  const Defs = global.CF.defs;
  const Logic = global.CF.logic;
  const A = global.CF.art;
  const PER_ROOM = 12;
  const ROOM_NAMES = ['Abuela’s Garage', 'The Back Room', 'Warehouse A', 'Warehouse B', 'The Loft', 'Scorch HQ'];

  const L = {
    land: {
      W: 1280, H: 720, horizon: 402, cols: 6, cell: [132, 168], gap: 8,
      rows: [{ bottom: 438, scale: 0.92 }, { bottom: 606, scale: 1 }],
      tables: [{ x: 236, y: 420, w: 818, leg: 70 }, { x: 212, y: 588, w: 866, leg: 90 }],
      lights: { x: 240, y: 226, w: 810, n: 3, cone: 340 },
      win: [300, 96, 170, 132], mural: [492, 92], neon: [830, 88, 140, 94], neonText: [880, 178, 26],
      shelf: [26, 300, 150], door: [1146, 196, 112, 206], fridge: [1050, 276, 84, 136], tank: [184, 282, 54, 92],
      tv: [1000, 196, 130, 90], merch: [30, 178, 140, 80], smoker: [1030, 452, 88, 96], picks: [1172, 110, 64, 64], record: [1066, 120, 62, 62],
      boss: [0, 296, 236, 368], customer: [1106, 316, 150, 234], custBubble: [860, 196], boombox: [228, 616, 124, 74],
      walkY: [428, 100], walkX: [280, 940], walkLayer: 0,
      ristra: [268, 96, 34, 160], poster: [180, 142, 78, 104], string: [300, 44, 700, 46], pools: [300, 612, 700],
      fgLeft: [-30, 586, 214, 158], fgRight: [1128, 500, 190, 170], spill: [1146, 402, 112],
    },
    port: {
      W: 390, H: 780, horizon: 336, cols: 4, cell: [94, 119], gap: 1,
      rows: [{ bottom: 408, scale: 0.9 }, { bottom: 526, scale: 0.95 }, { bottom: 646, scale: 1 }],
      tables: [{ x: 8, y: 398, w: 374, leg: 40 }, { x: 4, y: 515, w: 382, leg: 40 }, { x: -6, y: 634, w: 402, leg: 60 }],
      lights: { x: 8, y: 262, w: 374, n: 2, cone: 300 },
      win: [16, 150, 96, 80], mural: [124, 150], neon: [278, 146, 100, 68], neonText: [300, 214, 15],
      shelf: [16, 244, 100], door: [322, 232, 60, 104], fridge: null, tank: null,
      tv: [118, 196, 80, 56], merch: null, smoker: null, picks: null, record: null,
      boss: null, customer: [258, 198, 90, 140], custBubble: [150, 150], boombox: null, walkY: [404, 70], walkX: [30, 320], walkLayer: 0,
      ristra: [116, 150, 22, 90], poster: null, string: [10, 128, 370, 30], pools: [10, 660, 370],
      fgLeft: null, fgRight: null, spill: [322, 336, 60],
    },
  };

  const scene = { mode: null, room: 0, built: false, sig: {}, plotEls: [], visitor: null, walkers: [] };

  function mode() { return innerWidth / innerHeight < 0.9 || innerWidth < 700 ? 'port' : 'land'; }
  function G() { return L[scene.mode]; }
  function roomsCount(state) {
    const next = Defs.LAND.find(l => l.plots > state.plotCount);
    const slots = Math.min(64, state.plotCount + (next ? 1 : 0));
    return Math.max(1, Math.ceil(slots / PER_ROOM));
  }

  function fit() {
    const g = G();
    const s = Math.min(innerWidth / g.W, innerHeight / g.H);
    const sc = document.getElementById('scene');
    const ox = (innerWidth - g.W * s) / 2, oy = (innerHeight - g.H * s) / 2;
    sc.style.transform = `translate(${ox - innerWidth / 2}px, ${oy - innerHeight / 2}px) scale(${s})`;
    const hz = oy + g.horizon * s;
    document.getElementById('world').style.setProperty('--horizon', hz + 'px');
    scene.scale = s; scene.ox = ox; scene.oy = oy;
  }

  const box = (r, extra) => `left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px;${extra || ''}`;

  function cityHtml() {
    let b = '';
    const bw = [18, 26, 14, 30, 20, 24, 16, 28];
    let x = 0;
    for (let i = 0; i < 9; i++) {
      const w = bw[i % bw.length], h = 30 + ((i * 37) % 45);
      b += `<rect x="${x}" y="${100 - h}" width="${w}" height="${h}" fill="#2a1a4a" stroke="#1e0b22" stroke-width="2"/>`;
      for (let wy = 100 - h + 6; wy < 94; wy += 10) b += `<rect class="lit" x="${x + 4}" y="${wy}" width="4" height="4" fill="#6a5a9a"/><rect class="lit" x="${x + w - 8}" y="${wy}" width="4" height="4" fill="#6a5a9a"/>`;
      x += w + 2;
    }
    return `<svg class="city" viewBox="0 0 200 100" preserveAspectRatio="none">${b}</svg>`;
  }

  function tableHtml(t) {
    const w = t.w, d = 26, inset = 18, face = 20, H = d + face + t.leg + 22;
    const legs = [30, w / 2, w - 30];
    let g = `<ellipse cx="${w / 2}" cy="${H - 8}" rx="${w / 2 + 10}" ry="12" fill="#12040f" opacity=".42"/>`;
    legs.forEach(x => {
      g += `<rect x="${x - 7}" y="${d + face - 4}" width="14" height="${t.leg}" fill="#4b5575" stroke="${A.INK}" stroke-width="4"/><rect x="${x - 7}" y="${d + face - 4}" width="5" height="${t.leg}" fill="#6f7ba0"/>`;
      g += `<circle cx="${x}" cy="${d + face + t.leg + 4}" r="9" fill="#23232e" stroke="${A.INK}" stroke-width="3.4"/><circle cx="${x - 2}" cy="${d + face + t.leg + 2}" r="3" fill="#6f7ba0"/>`;
    });
    g += `<path d="M${inset} 2H${w - inset}L${w} ${d}H0Z" fill="url(#tt)" stroke="${A.INK}" stroke-width="4" stroke-linejoin="round"/>`;
    g += `<path d="M${inset + 10} 6H${w - inset - 10}" stroke="#fff" stroke-width="3" opacity=".45" stroke-linecap="round"/>`;
    g += `<rect x="0" y="${d}" width="${w}" height="${face}" rx="4" fill="#4b5575" stroke="${A.INK}" stroke-width="4"/>`;
    g += `<rect x="4" y="${d + face - 8}" width="${w - 8}" height="5" fill="#343b56"/>`;
    g += `<path class="drip-line" d="M16 ${d + 9}H${w - 16}" stroke="#56e0ff" stroke-width="4" stroke-dasharray="16 10" stroke-linecap="round"/>`;
    return `<svg class="table" style="left:${t.x}px;top:${t.y - 12}px;width:${w}px;height:${H}px" viewBox="0 0 ${w} ${H}" aria-hidden="true">
      <defs><linearGradient id="tt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f8bb0"/><stop offset="1" stop-color="#b3bdd8"/></linearGradient></defs>${g}</svg>`;
  }

  function floorSvg(g) {
    const W = g.W, top = g.horizon, H = g.H - top + 60;
    const vpx = W / 2, vpy = -900;
    const cols = ['#7a3f22', '#85482a', '#6f3a1f', '#8a4c2c', '#7f4224'];
    const step = scene.mode === 'port' ? 70 : 118;
    let p = '';
    let k = 0;
    for (let bx = -W; bx < 2 * W; bx += step, k++) {
      const x0b = bx, x1b = bx + step;
      const tx = xb => vpx + (xb - vpx) * ((0 - vpy) / (H - vpy));
      const x0t = tx(x0b), x1t = tx(x1b);
      const c = cols[(k * 7) % cols.length];
      p += `<path d="M${x0t} 0L${x1t} 0L${x1b} ${H}L${x0b} ${H}Z" fill="${c}" stroke="#4a200e" stroke-width="3"/>`;
      // grain
      for (let gI = 1; gI <= 2; gI++) {
        const f = gI / 3;
        const gxt = x0t + (x1t - x0t) * f, gxb = x0b + (x1b - x0b) * f;
        p += `<path d="M${gxt} 0Q${(gxt + gxb) / 2 + (gI % 2 ? 4 : -4)} ${H / 2} ${gxb} ${H}" stroke="#fff" stroke-width="1.4" opacity=".08" fill="none"/>`;
      }
      // staggered seams (closer near the wall)
      for (let sI = 0; sI < 5; sI++) {
        const t = Math.pow((sI + 1 + (k % 2) * 0.5) / 6, 1.7);
        const y = t * H;
        const xl = x0t + (x0b - x0t) * t, xr = x1t + (x1b - x1t) * t;
        p += `<path d="M${xl} ${y}H${xr}" stroke="#4a200e" stroke-width="2.4"/><path d="M${xl} ${y + 2}H${xr}" stroke="#fff" stroke-width="1" opacity=".12"/>`;
      }
    }
    return `<svg class="floor" style="left:0;top:${top}px;width:${W}px;height:${H}px" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="fao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12040f" stop-opacity=".75"/><stop offset=".18" stop-color="#12040f" stop-opacity=".15"/><stop offset=".6" stop-color="#12040f" stop-opacity="0"/><stop offset="1" stop-color="#12040f" stop-opacity=".35"/></linearGradient></defs>
      ${p}<rect width="${W}" height="${H}" fill="url(#fao)"/></svg>`;
  }

  function brickTexture() {
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const pal = ['#4a1c60', '#44195a', '#512168', '#3e1654', '#562470', '#48205e', '#4e1b58', '#3a1450'];
    const bw = 64, bh = 30, rows = 6, cols = 5, W = bw * cols, H = bh * rows;
    let r = `<rect width="${W}" height="${H}" fill="#210a2e"/>`;
    for (let y = 0; y < rows; y++) {
      const off = y % 2 ? bw / 2 : 0;
      for (let x = -1; x < cols + 1; x++) {
        const px = x * bw + off + 3, py = y * bh + 3, w = bw - 6, h = bh - 6;
        const c = pal[Math.floor(rnd() * pal.length)];
        r += `<rect x="${px}" y="${py}" width="${w}" height="${h}" rx="3" fill="${c}"/>`;
        r += `<rect x="${px}" y="${py}" width="${w}" height="3" rx="1.5" fill="#fff" opacity="${0.05 + rnd() * 0.07}"/>`;
        r += `<rect x="${px}" y="${py + h - 4}" width="${w}" height="4" rx="2" fill="#12040f" opacity=".35"/>`;
        if (rnd() < 0.22) r += `<circle cx="${px + 8 + rnd() * (w - 16)}" cy="${py + 6 + rnd() * (h - 12)}" r="${2 + rnd() * 3}" fill="#12040f" opacity=".25"/>`;
        if (rnd() < 0.12) r += `<path d="M${px + w - 10} ${py}l6 7-5 4" fill="#210a2e"/>`;
      }
    }
    return 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${r}</svg>`) + '")';
  }

  function build(state) {
    scene.mode = mode();
    const g = G();
    const sc = document.getElementById('scene');
    sc.className = scene.mode;
    const port = scene.mode === 'port';
    let h = floorSvg(g);
    document.querySelector('#world .wallbg').style.setProperty('--brick', scene.brick || (scene.brick = brickTexture()));
    // wall/floor ambient occlusion + door light spill
    h += `<div class="ao" style="top:${g.horizon - 60}px;width:${g.W}px"></div>`;
    h += `<div class="spill" id="spill" style="left:${g.spill[0] - g.spill[2] * 1.2}px;top:${g.horizon}px;width:${g.spill[2] * 2.6}px;height:${port ? 120 : 190}px"></div>`;
    // window
    h += `<div class="win" style="${box(g.win)}"><div class="orb"></div>${cityHtml()}</div>`;
    // mural
    h += `<div class="mural" style="left:${g.mural[0]}px;top:${g.mural[1]}px${port ? ';transform:rotate(-4deg) scale(.5);transform-origin:0 0' : ''}"><span class="m1">SCORCH</span><span class="m2">FARMS&nbsp;&middot;&nbsp;EST. ABUELA</span></div>`;
    // spray tags
    h += `<svg class="tag" style="left:${port ? 210 : 470}px;top:${port ? 196 : 206}px;width:${port ? 60 : 110}px" viewBox="0 0 110 40"><path d="M4 30c10-20 18-24 20-6s12-20 18-10 8 16 18 2 14-10 22 0 16 4 24-6" fill="none" stroke="#56e0ff" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="34" r="3" fill="#56e0ff"/></svg>`;
    if (!port) h += `<svg class="tag" style="left:770px;top:70px;width:50px" viewBox="0 0 40 40"><path d="M20 3l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z" fill="none" stroke="#ff4fd8" stroke-width="4" stroke-linejoin="round"/></svg>`;
    // string lights, ristra, poster
    if (g.string) h += `<div class="abs" style="${box(g.string)}">${A.stringLights(g.string[2], port ? 14 : 22)}</div>`;
    if (g.ristra) h += `<div class="abs" style="${box(g.ristra)}">${A.ristra(port ? 5 : 7, port ? 150 : 170)}</div>`;
    if (g.poster) h += `<div class="abs" style="${box(g.poster)};transform:rotate(4deg)">${A.mixtapePoster()}</div>`;
    // neon sign (with bloom)
    h += `<div class="bloom" id="neon-bloom" style="left:${g.neon[0] - g.neon[2] * 0.4}px;top:${g.neon[1] - g.neon[3] * 0.4}px;width:${g.neon[2] * 1.8}px;height:${g.neon[3] * 1.9}px"></div>`;
    h += `<div class="neon-wrap" id="neon" style="${box(g.neon)}">${A.neonChili()}</div>`;
    h += `<div class="neon-wrap" id="neon2" style="left:${g.neonText[0]}px;top:${g.neonText[1]}px;width:10px;height:10px"><span class="neon-text" style="font-size:${g.neonText[2]}px">HOT&nbsp;&amp;&nbsp;FRESH</span></div>`;
    // shelf + bottles
    h += `<div class="shelf-items" id="bottles" style="left:${g.shelf[0] + 6}px;top:${g.shelf[1] - (port ? 32 : 46)}px"></div>`;
    h += `<div class="shelf" style="left:${g.shelf[0]}px;top:${g.shelf[1]}px;width:${g.shelf[2]}px"></div>`;
    // business props
    h += `<div class="abs" id="p-tv" style="${box(g.tv)}"></div>`;
    if (g.merch) h += `<div class="abs" id="p-merch" style="${box(g.merch)}"></div>`;
    if (g.picks) h += `<div class="abs" id="p-picks" style="${box(g.picks)}"></div>`;
    if (g.record) h += `<div class="abs" id="p-record" style="${box(g.record)}"></div>`;
    // door
    h += `<div class="door" id="door" style="${box(g.door)}">${A.doorSvg()}</div>`;
    // storage + tank
    if (g.fridge) h += `<div class="abs" id="p-fridge" style="${box(g.fridge)}"></div>`;
    if (g.tank) h += `<div class="abs" id="p-tank" style="${box(g.tank)}"></div>`;
    if (g.smoker) h += `<div class="abs" id="p-smoker" style="${box(g.smoker)}"></div>`;
    // customer (behind first table/plants)
    h += `<div class="actor" id="customer" style="${box(g.customer)};display:none"></div>`;
    // lights
    h += `<div class="lights" id="lights" style="left:${g.lights.x}px;top:${g.lights.y}px;width:${g.lights.w}px;--cone:${g.lights.cone}px"></div>`;
    // tables + plots per row
    g.rows.forEach((row, ri) => {
      if (ri === g.walkLayer) h += `<div id="walkers" class="abs" style="left:0;top:0;width:100%;height:100%;pointer-events:none"></div>`;
      const t = g.tables[ri];
      h += tableHtml(t);
      const cw = g.cell[0] * row.scale, ch = g.cell[1] * row.scale;
      const rx = t.x + (t.w - (g.cols * cw + (g.cols - 1) * g.gap)) / 2;
      h += `<div class="plots" id="row${ri}" style="left:${rx}px;top:${row.bottom - ch}px;grid-template-columns:repeat(${g.cols},${cw}px);column-gap:${g.gap}px;height:${ch}px"></div>`;
    });
    if (g.pools) h += `<div class="pools" style="left:${g.pools[0]}px;top:${g.pools[1]}px;width:${g.pools[2]}px"><i></i><i></i><i></i></div>`;
    if (g.boombox) h += `<div class="abs" style="${box(g.boombox)}">${A.boombox()}</div>`;
    // boss
    if (g.boss) h += `<div class="actor boss" id="boss" data-action="boss" style="${box(g.boss)}">${A.character(A.CAST.tito, { pose: 'idle' })}</div>`;
    // foreground props that break the frame edge
    if (g.fgLeft) h += `<div class="abs fg" id="fg-left" style="${box(g.fgLeft)}"></div>`;
    if (g.fgRight) h += `<div class="abs fg" id="fg-right" style="${box(g.fgRight)}"></div>`;
    // dust motes in the light
    h += `<div class="motes" style="left:${g.lights.x}px;top:${g.lights.y + 40}px;width:${g.lights.w}px;height:${g.lights.cone - 40}px">${Array.from({ length: port ? 6 : 12 }, (_, i) => `<i class="mote" style="left:${(i * 83) % 100}%;top:${40 + (i * 37) % 60}%;animation-delay:-${(i * 1.3) % 7}s"></i>`).join('')}</div>`;
    h += `<div id="visitor-bubble"></div>`;
    sc.innerHTML = h;
    scene.plotEls = [];
    scene.sig = {};
    scene.built = true;
    scene.visitorShown = null;
    fit();
    buildPlots(state);
    update(state, true);
  }

  function buildPlots(state) {
    const g = G();
    const rows = g.rows.map((_, ri) => document.getElementById('row' + ri));
    rows.forEach(r => { r.innerHTML = ''; });
    scene.plotEls = [];
    for (let i = 0; i < PER_ROOM; i++) {
      const ri = Math.floor(i / g.cols);
      if (!rows[ri]) continue;
      const row = g.rows[ri];
      const d = document.createElement('div');
      d.className = 'plot';
      d.style.width = g.cell[0] * row.scale + 'px';
      d.style.height = g.cell[1] * row.scale + 'px';
      d.dataset.slot = i;
      rows[ri].appendChild(d);
      scene.plotEls.push(d);
    }
    scene.plotSig = [];
  }

  function plotIndex(slot) { return scene.room * PER_ROOM + slot; }

  function potLevel(state) { return state.upgrades.soil; }

  function plotHtml(state, idx, slot) {
    const nextLand = Defs.LAND.find(l => l.plots > state.plotCount);
    if (idx >= state.plotCount) {
      if (nextLand && idx === state.plotCount) {
        const can = state.money >= nextLand.cost;
        return { sig: 'sale' + (can ? 1 : 0) + nextLand.cost, html: () => `<div class="forsale ${can ? '' : 'dim'}" data-action="buy-land"><div class="sign">FOR SALE</div><div class="price">${A.icon('coin', 20)} ${Logic.fmt(nextLand.cost).replace('$', '')}</div><div class="price" style="font-size:12px">+${nextLand.plots - state.plotCount} pots</div></div>` };
      }
      return { sig: 'none', html: () => '' };
    }
    const p = state.plots[idx];
    const grow = p.strain ? Logic.growTime(state, p.strain) : 100;
    const st = A.stageOf(p, grow);
    const now = Date.now() / 1000;
    const boosted = p.status === 'growing' && p.boostUntil > now;
    const pct = p.status === 'growing' ? Math.min(100, p.progress / grow * 100) : null;
    const sig = [st, p.strain, potLevel(state), boosted ? 1 : 0, st === 4 ? Math.round(pct / 8) : 0, p.status === 'ready' || p.status === 'wilted' ? Logic.harvestYield(state) : 0].join('|');
    const html = () => {
      let extra = '';
      if (p.status === 'growing') extra += `<div class="timer ${boosted ? 'boost' : ''}"><i style="width:${pct}%"></i></div>`;
      if (boosted) extra += `<span class="drip-badge">${A.icon('drop', 26)}</span>`;
      if (p.status === 'ready' || p.status === 'wilted') {
        const y = Logic.harvestYield(state);
        if (p.status === 'ready') {
          const gl = `<svg viewBox="0 0 20 20"><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" fill="#fffbe0" stroke="#1e0b22" stroke-width="1.2"/></svg>`;
          extra += `<span class="glint" style="left:24%;top:34%;animation-delay:-${(idx * 0.53) % 1.8}s">${gl}</span><span class="glint" style="left:62%;top:46%;animation-delay:-${(idx * 0.53 + 0.9) % 1.8}s">${gl}</span>`;
        }
        extra += `<div class="bubble-coin ${p.status === 'wilted' ? 'wilt' : ''}">${A.pepper(p.strain, 26)}+${p.status === 'wilted' ? Math.max(1, Math.round(y / 2)) : y}</div>`;
      }
      return A.plantSvg(p, grow, idx + 1, potLevel(state), idx) + extra;
    };
    return { sig, html, pct };
  }

  function updatePlots(state) {
    for (let s = 0; s < scene.plotEls.length; s++) {
      const el = scene.plotEls[s];
      const idx = plotIndex(s);
      const r = plotHtml(state, idx, s);
      if (scene.plotSig[s] !== r.sig) {
        scene.plotSig[s] = r.sig;
        el.innerHTML = r.html();
        el.classList.toggle('locked', idx >= state.plotCount);
        el.classList.toggle('ripe', idx < state.plotCount && state.plots[idx].status === 'ready');
        el.dataset.idx = idx;
      } else if (r.pct != null) {
        const bar = el.firstChild && el.querySelector('.timer i');
        if (bar) bar.style.width = r.pct + '%';
      }
    }
  }

  function updateProps(state) {
    const g = G();
    const u = state.upgrades;
    const b = state.biz;
    // lights by greenhouse
    const gl = u.greenhouse;
    const sigL = 'L' + gl + scene.mode;
    if (scene.sig.lights !== sigL) {
      scene.sig.lights = sigL;
      const el = document.getElementById('lights');
      const n = gl <= 0 ? g.lights.n * 2 : g.lights.n + (gl >= 4 ? 1 : 0);
      el.className = 'lights ' + (gl <= 0 ? 'warm' : gl >= 3 ? 'full' : '');
      el.innerHTML = Array.from({ length: n }, () => `<div class="lightbar"><div class="lbloom"></div>${A.growLight(gl)}<div class="cone"></div></div>`).join('');
    }
    // neon by marketing
    const n1 = document.getElementById('neon'), n2 = document.getElementById('neon2');
    if (n1) n1.className = 'neon-wrap ' + (u.marketing >= 1 ? 'on' : 'off');
    const nb = document.getElementById('neon-bloom');
    if (nb) nb.classList.toggle('on', u.marketing >= 1);
    if (n2) n2.className = 'neon-wrap ' + (u.marketing >= 3 ? 'on' : 'off');
    // bottles by fertilizer (always one Scorch Sauce)
    const jars = Math.min(3, Math.floor(state.stats.harvested / 150));
    const troph = state.rep >= 500;
    const sigB = 'B' + u.fertilizer + '|' + jars + '|' + troph;
    if (scene.sig.bottles !== sigB) {
      scene.sig.bottles = sigB;
      const cols = ['#e8231b', '#9b5bff', '#2fbf55', '#ff8a00', '#56e0ff', '#ff4fd8'];
      const hgt = scene.mode === 'port' ? 30 : 44;
      const maxB = scene.mode === 'port' ? 4 : 5;
      let items = Array.from({ length: Math.min(maxB, 1 + u.fertilizer) }, (_, i) => A.sauceBottle(cols[i % cols.length], '#e8231b', hgt - (i % 2) * 6)).join('');
      items += Array.from({ length: scene.mode === 'port' ? Math.min(1, jars) : jars }, (_, i) => A.jar(i, hgt * 0.72)).join('');
      if (troph) items += `<span class="shelf-trophy" style="height:${hgt}px">${A.icon('trophy', hgt)}</span>`;
      document.getElementById('bottles').innerHTML = items;
    }
    // storage
    const fr = document.getElementById('p-fridge');
    if (fr) {
      const sigF = 'F' + (u.storage > 0 ? 1 : 0);
      if (scene.sig.fridge !== sigF) {
        scene.sig.fridge = sigF;
        fr.innerHTML = u.storage > 0 ? A.fridge(0, 0) : `<div class="crates" style="left:0;bottom:0;position:absolute;width:100%"><div class="crate">CHILI</div><div class="crate" style="margin-left:14px">CHILI</div></div>`;
      }
      const t = fr.querySelector('.fridge-count');
      if (t) t.textContent = Math.floor(Logic.chiliTotal(state)) + '/' + Logic.storageCap(state);
    }
    // irrigation tank + table drip lines
    const tk = document.getElementById('p-tank');
    if (tk) {
      const on = u.irrigation > 0;
      if (scene.sig.tank !== on) { scene.sig.tank = on; tk.innerHTML = on ? A.waterTank() : ''; }
    }
    document.getElementById('scene').classList.toggle('irrig', u.irrigation > 0);
    // clutter that grows with progress
    const st = state.stats;
    const bags = 1 + (st.harvested >= 60 ? 1 : 0) + (st.harvested >= 400 ? 1 : 0);
    const crates = 1 + (st.sold >= 150 ? 1 : 0) + (st.sold >= 1500 ? 1 : 0);
    const cash = st.earned >= 2000;
    const sigC = [bags, crates, cash].join('|');
    if (scene.sig.clutter !== sigC) {
      scene.sig.clutter = sigC;
      const fl = document.getElementById('fg-left'), fr = document.getElementById('fg-right');
      if (fl) fl.innerHTML = A.soilBags(bags);
      if (fr) fr.innerHTML = A.pallet(crates, cash);
    }
    // businesses
    const set = (id, on, html) => {
      const el = document.getElementById(id);
      if (!el) return;
      const k = 'biz' + id;
      if (scene.sig[k] !== on) { scene.sig[k] = on; el.innerHTML = on ? html() : ''; }
    };
    set('p-tv', b.media.unlocked, A.tvSet);
    set('p-merch', b.fashion.unlocked, A.merchRack);
    set('p-smoker', b.jerky.unlocked, A.smoker);
    set('p-picks', b.mining.unlocked, A.pickaxes);
    set('p-record', state.stats.earned >= 5000, A.goldRecord);
  }

  /* ---------- workers walking the aisle ---------- */
  function updateWalkers(state) {
    const g = G();
    const want = Math.min(scene.mode === 'port' ? 1 : 3, state.workers.farmhand.owned);
    const box = document.getElementById('walkers');
    if (!box) return;
    while (scene.walkers.length < want) {
      const d = document.createElement('div');
      d.className = 'worker-walker';
      const cfg = Object.assign(A.randomCustomer(100 + scene.walkers.length * 7), { hat: 'cowboy', outfit: 'vest', top: '#2fbf55', tee: '#fff', hold: 'can', eyes: 'normal' });
      d.innerHTML = A.character(cfg, { pose: 'idle' });
      const sz = scene.mode === 'port' ? [46, 72] : [64, 100];
      d.style.width = sz[0] + 'px'; d.style.height = sz[1] + 'px';
      d.style.top = (g.walkY[0] - sz[1] + (scene.mode === 'port' ? 0 : g.walkY[1] * 0.12 * scene.walkers.length)) + 'px';
      const x0 = g.walkX[0] + scene.walkers.length * 180;
      d.style.transform = `translateX(${x0}px)`;
      box.appendChild(d);
      scene.walkers.push({ el: d, next: 0, x: x0 });
    }
    while (scene.walkers.length > want) scene.walkers.pop().el.remove();
    const now = performance.now();
    scene.walkers.forEach(w => {
      if (now < w.next) return;
      const cur = w.x;
      const to = g.walkX[0] + Math.random() * (g.walkX[1] - g.walkX[0]);
      w.el.classList.toggle('flip', to < cur);
      w.el.classList.remove('idle');
      const dur = Math.abs(to - cur) / 90;
      w.el.style.transition = `transform ${dur}s linear`;
      w.el.style.transform = `translateX(${to}px)`;
      w.x = to;
      w.next = now + dur * 1000 + 1200 + Math.random() * 2500;
      setTimeout(() => w.el.classList.add('idle'), dur * 1000);
    });
  }

  /* ---------- visitor at the door ---------- */
  function showVisitor(v) {
    const g = G();
    const el = document.getElementById('customer');
    const door = document.getElementById('door');
    const bub = document.getElementById('visitor-bubble');
    if (!el) return;
    const key = v ? v.key : null;
    if (scene.visitorShown === key) {
      if (v && v.bubble) {
        const s = bub.querySelector('.speech');
        if (s && s.dataset.sig !== v.bubbleSig) bub.innerHTML = v.bubble(g);
      }
      return;
    }
    scene.visitorShown = key;
    if (!v) {
      el.style.display = 'none';
      bub.innerHTML = '';
      if (door) door.classList.remove('open');
      return;
    }
    el.innerHTML = A.character(v.cfg, { pose: v.pose || 'wave' });
    el.style.display = 'block';
    el.classList.add('walk');
    if (door) door.classList.add('open');
    const sp = document.getElementById('spill'); if (sp) { sp.classList.add('open'); setTimeout(() => sp.classList.remove('open'), 900); }
    el.animate([{ transform: 'translateX(40px) scale(.85)', opacity: 0 }, { transform: 'translateX(0) scale(1)', opacity: 1 }], { duration: 600, easing: 'ease-out' });
    setTimeout(() => { el.classList.remove('walk'); if (door) door.classList.remove('open'); }, 650);
    bub.innerHTML = v.bubble ? v.bubble(g) : '';
  }

  function update(state, force) {
    if (!scene.built || mode() !== scene.mode) { build(state); return; }
    const rc = roomsCount(state);
    if (scene.room >= rc) scene.room = rc - 1;
    updatePlots(state);
    updateProps(state);
    updateWalkers(state);
  }

  function plotEl(idx) {
    const s = idx - scene.room * PER_ROOM;
    return s >= 0 && s < PER_ROOM ? scene.plotEls[s] : null;
  }
  function onScreen(idx) { return !!plotEl(idx); }
  function readyIn(state, room) {
    let n = 0;
    for (let i = room * PER_ROOM; i < Math.min(state.plotCount, (room + 1) * PER_ROOM); i++) {
      const s = state.plots[i].status;
      if (s === 'ready' || s === 'wilted') n++;
    }
    return n;
  }

  global.CF.scene = Object.assign(scene, {
    PER_ROOM, ROOM_NAMES, build, update, fit, plotEl, onScreen, roomsCount, readyIn, showVisitor, mode, G, plotIndex,
    invalidate() { scene.plotSig = []; },
    invalidatePlot(idx) { const k = idx - scene.room * PER_ROOM; if (k >= 0 && k < PER_ROOM) scene.plotSig[k] = null; },
    updatePlots,
  });
})(typeof window !== 'undefined' ? window : globalThis);

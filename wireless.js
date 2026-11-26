/* PacketFlow — Wireless Lab (part 1): shared flow player, airwaves, signal simulator, standards */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function el(tag, attrs = {}, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  const KC = { req: 'var(--req)', res: 'var(--res)', ctl: 'var(--ctl)', sec: 'var(--sec)', lost: 'var(--lost)' };
  const WL = window.WL = { $, $$, sleep, esc, el, KC };

  /* ═════════ generic sequence-flow player ═════════ */
  WL.Flow = function (host, opts = {}) {
    host.innerHTML = `<div class="fl-scroll"><svg class="fl-svg" role="img" aria-label="Animated message flow"></svg></div>
      <div class="caption"></div><div class="progress"><b></b></div>
      <div class="controls"><button class="btn solid fPlay">Play</button><button class="btn round fPrev" aria-label="Previous step">‹</button><button class="btn round fNext" aria-label="Next step">›</button><button class="btn ghost fReset">Reset</button><div class="spacer"></div>
      <div class="speed fSpeed"><button data-s="0.5">0.5×</button><button data-s="1" class="on">1×</button><button data-s="1.5">1.5×</button><button data-s="2">2×</button></div></div>`;
    const svg = $('.fl-svg', host), cap = $('.caption', host), bar = $('.progress b', host), scroller = $('.fl-scroll', host);
    const S = { cfg: null, step: -1, playing: false, tok: 0, speed: 1, xs: {}, ys: [], gs: [], layer: null };
    const toList = s => (Array.isArray(s.t) ? s.t : [s.t]);
    const isLocal = s => !Array.isArray(s.t) && s.t === s.f;

    function load(cfg) {
      stop(); S.cfg = cfg; S.step = -1;
      svg.innerHTML = ''; S.gs = []; S.ys = [];
      const A = cfg.actors, n = A.length, W = 1000;
      A.forEach((a, i) => S.xs[a.id] = n === 1 ? W / 2 : 100 + i * ((W - 200) / (n - 1)));
      let y = 100, last = null; const phaseMarks = [];
      cfg.steps.forEach((s, i) => { if (s.phase && s.phase !== last) { y += 34; phaseMarks.push([s.phase, y - 24]); last = s.phase; } S.ys.push(y); y += 52; });
      const H = y + 20;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      A.forEach(a => {
        const x = S.xs[a.id];
        el('line', { x1: x, x2: x, y1: 62, y2: H - 8, class: 'seq-life' }, svg);
        const g = el('g', { class: 'seq-head' }, svg);
        el('rect', { x: x - 76, y: 14, width: 152, height: 48, rx: 12 }, g);
        el('text', { x, y: 36 }, g).textContent = a.label.length > 22 ? a.label.slice(0, 21) + '…' : a.label;
        el('text', { x, y: 52, class: 'ip' }, g).textContent = a.sub || '';
      });
      phaseMarks.forEach(([p, py]) => { const g = el('g', { class: 'fl-phase' }, svg); el('line', { x1: 14, x2: 986, y1: py + 8, y2: py + 8 }, g); const t = el('text', { x: 18, y: py + 2 }, g); t.textContent = p.toUpperCase(); });
      S.layer = el('g', {}, svg);
      cfg.steps.forEach((s, i) => {
        const y = S.ys[i], c = KC[s.k || 'req'], g = el('g', { class: 'seq-row', style: `--c:${c}` }, S.layer);
        el('rect', { x: 8, y: y - 26, width: 984, height: 50, rx: 8, class: 'hl' }, g);
        el('text', { x: 20, y: y + 4, class: 'num', style: 'text-anchor:start' }, g).textContent = i + 1;
        const x1 = S.xs[s.f];
        if (isLocal(s)) {
          el('path', { d: `M${x1} ${y - 10}h46v20h-46`, fill: 'none', stroke: c, 'stroke-width': 2, class: 'main' }, g);
          const side = x1 > 600 ? -1 : 1; const tx = side > 0 ? x1 + 56 : x1 - 10;
          el('text', { x: tx, y: y + 4, style: `text-anchor:${side > 0 ? 'start' : 'end'}` }, g).textContent = s.tag;
        } else {
          toList(s).forEach(t => { const x2 = S.xs[t], d = Math.sign(x2 - x1) || 1; el('line', { x1, y1: y, x2: x2 - d * 8, y2: y, class: 'main' }, g); el('path', { d: `M${x2} ${y}l${-d * 11} -5v10z`, class: 'ah' }, g); });
          const xs = toList(s).map(t => S.xs[t]), mid = (x1 + xs.reduce((a, b) => a + b, 0) / xs.length) / 2;
          el('text', { x: mid, y: y - 9 }, g).textContent = s.tag;
        }
        g.style.cursor = 'pointer'; g.onclick = () => goTo(i); S.gs.push(g);
      });
      apply(-1);
    }

    function apply(i) {
      const n = S.cfg.steps.length; S.step = i;
      S.gs.forEach((g, k) => { g.classList.toggle('seen', k <= i); g.classList.toggle('cur', k === i); });
      bar.style.width = ((i + 1) / n * 100) + '%';
      $('.fPrev', host).disabled = i <= 0; $('.fNext', host).disabled = i >= n - 1;
      const pb = $('.fPlay', host); pb.textContent = S.playing ? 'Pause' : (i >= n - 1 ? 'Replay' : (i < 0 ? 'Play' : 'Resume')); pb.classList.toggle('playing', S.playing);
      if (i < 0) cap.innerHTML = `<div class="num" style="--cc:var(--accent)">00</div><div class="body"><h4>${esc(S.cfg.intro || 'Ready')}</h4><p>${esc(S.cfg.introText || 'Press Play, or step through one message at a time. Click any arrow to jump to it.')}</p></div>`;
      else {
        const s = S.cfg.steps[i];
        cap.innerHTML = `<div class="num" style="--cc:${KC[s.k || 'req']}">${String(i + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}</div><div class="body"><h4>${s.title}</h4><p>${s.text}</p>${s.fields ? `<div class="fchips">${s.fields.map(([k, v]) => `<span><b>${k}</b>${esc(v)}</span>`).join('')}</div>` : ''}</div>`;
        const y = S.ys[i]; if (scroller.scrollHeight > scroller.clientHeight) scroller.scrollTo({ top: Math.max(0, y * (scroller.scrollWidth / 1000) - scroller.clientHeight / 2), behavior: 'smooth' });
      }
      if (opts.onStep) opts.onStep(i, i >= 0 ? S.cfg.steps[i] : null);
    }

    function animate(i, tok) {
      return new Promise(res => {
        const s = S.cfg.steps[i], y = S.ys[i], c = KC[s.k || 'req'], x1 = S.xs[s.f];
        if (isLocal(s)) {
          const ring = el('circle', { cx: x1, cy: y, r: 6, fill: 'none', stroke: c, 'stroke-width': 2, style: 'transform-origin:center;transform-box:fill-box' }, S.layer);
          ring.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(4.5)', opacity: 0 }], { duration: 1100 / S.speed, easing: 'ease-out' }).onfinish = () => { ring.remove(); res(true); }; return;
        }
        const dots = toList(s).map(t => ({ x2: S.xs[t], c: el('circle', { cx: x1, cy: y, r: 6, fill: c, style: `filter:drop-shadow(0 0 7px ${c})` }, S.layer) }));
        const dur = 1300 / S.speed, t0 = performance.now();
        const f = now => {
          if (tok !== S.tok) { dots.forEach(d => d.c.remove()); return res(false); }
          const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          dots.forEach(d => d.c.setAttribute('cx', x1 + (d.x2 - x1) * e));
          if (t < 1) return requestAnimationFrame(f);
          dots.forEach(d => { d.c.animate([{ r: 6, opacity: 1 }, { r: 14, opacity: 0 }], { duration: 400 }).onfinish = () => d.c.remove(); }); res(true);
        };
        requestAnimationFrame(f);
      });
    }
    function stop() { S.playing = false; S.tok++; }
    async function runStep(i, tok) { apply(i); await animate(i, tok); }
    async function goTo(i) { stop(); const tok = S.tok; i = Math.max(-1, Math.min(i, S.cfg.steps.length - 1)); if (i < 0) return apply(-1); await runStep(i, tok); if (tok === S.tok) apply(S.step); }
    async function play() {
      if (S.step >= S.cfg.steps.length - 1) apply(-1);
      S.playing = true; const tok = ++S.tok; apply(S.step);
      while (S.playing && tok === S.tok && S.step < S.cfg.steps.length - 1) { await runStep(S.step + 1, tok); if (tok !== S.tok) return; await sleep(900 / S.speed); }
      if (tok === S.tok) { S.playing = false; apply(S.step); }
    }
    $('.fPlay', host).onclick = () => (S.playing ? (stop(), apply(S.step)) : play());
    $('.fNext', host).onclick = () => goTo(S.step + 1);
    $('.fPrev', host).onclick = () => goTo(S.step - 1);
    $('.fReset', host).onclick = () => { stop(); apply(-1); };
    $$('.fSpeed button', host).forEach(b => b.onclick = () => { S.speed = +b.dataset.s; $$('.fSpeed button', host).forEach(x => x.classList.toggle('on', x === b)); });
    return { load, stop, goTo };
  };

  /* helper: scenario tabs */
  WL.tabs = (box, names, onPick, start = 0) => {
    box.innerHTML = names.map((n, i) => `<button class="${i === start ? 'on' : ''}" data-i="${i}">${n}</button>`).join('');
    $$('button', box).forEach(b => b.onclick = () => { $$('button', box).forEach(x => x.classList.toggle('on', x === b)); onPick(+b.dataset.i); });
    onPick(start);
  };

  /* ═════════ A · channels ═════════ */
  const B = { band: '24', width: 20, us: true, sel: null };
  const WIDTHS = { 24: [20, 40], 5: [20, 40, 80, 160], 6: [20, 40, 80, 160, 320] };
  const C5 = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
  const BLK5 = { 20: C5.map(c => [c]), 40: [[36, 40], [44, 48], [52, 56], [60, 64], [100, 104], [108, 112], [116, 120], [124, 128], [132, 136], [140, 144], [149, 153], [157, 161]],
    80: [[36, 40, 44, 48], [52, 56, 60, 64], [100, 104, 108, 112], [116, 120, 124, 128], [132, 136, 140, 144], [149, 153, 157, 161]], 160: [[36, 40, 44, 48, 52, 56, 60, 64], [100, 104, 108, 112, 116, 120, 124, 128]] };
  const isDFS = c => c >= 52 && c <= 144;
  const C6 = Array.from({ length: 59 }, (_, i) => 1 + i * 4);
  const psc = c => c >= 5 && (c - 5) % 16 === 0;
  const uniiName6 = c => c <= 93 ? 'UNII‑5' : c <= 113 ? 'UNII‑6' : c <= 185 ? 'UNII‑7' : 'UNII‑8';
  const f24 = n => 2407 + 5 * n;

  function widthSeg() {
    const seg = $('#widthSeg'); seg.innerHTML = WIDTHS[B.band].map(w => `<button data-w="${w}" class="${w === B.width ? 'on' : ''}">${w} MHz</button>`).join('');
    $$('button', seg).forEach(b => b.onclick = () => { B.width = +b.dataset.w; B.sel = null; widthSeg(); drawBand(); });
    $('#usWrap').style.display = B.band === '24' ? '' : 'none';
  }
  function drawBand() {
    const area = $('#chartArea'); area.innerHTML = ''; const note = $('#chnote'), st = $('#bstats');
    if (B.band === '24') {
      const maxCh = B.us ? 11 : 13, px = 9.2, X = f => 40 + (f - 2400) * px;
      const svg = el('svg', { viewBox: '0 0 1000 250', class: 'chsvg', role: 'img', 'aria-label': '2.4 GHz channel overlap chart' });
      el('line', { x1: 30, x2: 980, y1: 190, y2: 190, class: 'axis' }, svg);
      for (let f = 2400; f <= 2500; f += 10) { el('line', { x1: X(f), x2: X(f), y1: 190, y2: 196, class: 'axis' }, svg); el('text', { x: X(f), y: 212, class: 'tick' }, svg).textContent = f; }
      const trio = [1, 6, 11];
      if (B.width === 20) {
        for (let n = 1; n <= maxCh; n++) {
          const cx = X(f24(n)), hw = 11 * px, hi = trio.includes(n), on = B.sel === n, ov = B.sel && Math.abs(B.sel - n) < 5 && B.sel !== n;
          const p = el('path', { d: `M${cx - hw} 190 C${cx - hw * .6} 190 ${cx - hw * .8} 60 ${cx} 60 C${cx + hw * .8} 60 ${cx + hw * .6} 190 ${cx + hw} 190`, class: 'chbell' + (hi ? ' trio' : '') + (on ? ' sel' : '') + (ov ? ' ovl' : '') }, svg);
          p.onclick = () => { B.sel = B.sel === n ? null : n; drawBand(); };
          el('text', { x: cx, y: 232, class: 'chnum' + (hi ? ' trio' : '') }, svg).textContent = n;
        }
        note.innerHTML = B.sel ? `<b>Channel ${B.sel}</b> · centre ${f24(B.sel)} MHz · overlaps with channels ${[...Array(maxCh)].map((_, i) => i + 1).filter(c => c !== B.sel && Math.abs(c - B.sel) < 5).join(', ') || '—'}. Overlap = co‑channel interference you can’t avoid.` : `Click a channel. Channels are only 5 MHz apart but each signal is ~22 MHz wide, so <b>only 1, 6 and 11</b> (highlighted) never overlap. Plan every 2.4 GHz network on those three.`;
      } else {
        const blocks = B.us ? [[1, 5, 2422], [7, 11, 2452]] : [[1, 5, 2422], [9, 13, 2462]];
        blocks.forEach(([a, b, fc], k) => { const cx = X(fc), hw = 21 * px; el('path', { d: `M${cx - hw} 190 C${cx - hw * .6} 190 ${cx - hw * .8} ${70 + k * 14} ${cx} ${70 + k * 14} C${cx + hw * .8} ${70 + k * 14} ${cx + hw * .6} 190 ${cx + hw} 190`, class: 'chbell trio' }, svg); el('text', { x: cx, y: 232, class: 'chnum trio' }, svg).textContent = `${a}+${b}`; });
        note.innerHTML = B.us ? `<b>Don’t use 40 MHz on 2.4 GHz.</b> Two 40 MHz blocks overlap by ~10 MHz in the US band, so you can’t build a clean plan — and there are only three 20 MHz channels to share.` : `With 13 channels you can fit two 40 MHz blocks, but cells will still collide with every neighbour. Keep 2.4 GHz at 20 MHz.`;
      }
      area.appendChild(svg);
      st.innerHTML = stat('Range', 'Longest', 'Penetrates walls best') + stat('Speed', 'Lowest', 'Wi‑Fi 4/6: up to 574 Mbps @40') + stat('Clean channels', '3', '1 · 6 · 11 at 20 MHz') + stat('Noise', 'Very high', 'Bluetooth, microwaves, Zigbee, neighbours');
    } else if (B.band === '5') {
      const blocks = BLK5[B.width], used = new Set(blocks.flat());
      const wrap = document.createElement('div'); wrap.className = 'chgrid';
      [['UNII‑1', 36, 48], ['UNII‑2A', 52, 64], ['UNII‑2C', 100, 144], ['UNII‑3', 149, 165]].forEach(([nm, a, b]) => {
        const grp = document.createElement('div'); grp.className = 'chgroup'; grp.innerHTML = `<h5>${nm}<small>${nm === 'UNII‑1' || nm === 'UNII‑3' ? 'no DFS' : 'DFS required'}</small></h5>`;
        const row = document.createElement('div'); row.className = 'chrow';
        blocks.filter(bl => bl[0] >= a && bl[0] <= b).forEach(bl => {
          const bd = document.createElement('div'); bd.className = 'chblock' + (isDFS(bl[0]) ? ' dfs' : ''); bd.dataset.lbl = `${bl[0]}${bl.length > 1 ? '–' + bl[bl.length - 1] : ''}`;
          bd.innerHTML = bl.map(c => `<span class="chc${isDFS(c) ? ' dfs' : ''}">${c}</span>`).join(''); bd.title = `Channel block ${bd.dataset.lbl}`; row.appendChild(bd);
        });
        C5.filter(c => c >= a && c <= b && !used.has(c)).forEach(c => { const x = document.createElement('div'); x.className = 'chblock off'; x.innerHTML = `<span class="chc">${c}</span>`; row.appendChild(x); });
        grp.appendChild(row); wrap.appendChild(grp);
      });
      area.appendChild(wrap);
      const nd = blocks.filter(bl => !bl.some(isDFS)).length;
      note.innerHTML = `At <b>${B.width} MHz</b> you get <b>${blocks.length}</b> usable channels, of which <b>${nd}</b> avoid DFS. Greyed channels can’t fit a ${B.width} MHz block. Wider = faster but fewer channels → more co‑channel interference in dense sites.`;
      st.innerHTML = stat('Range', 'Medium', 'Good compromise') + stat('Speed', 'High', 'Wi‑Fi 5/6: up to 2.4 Gbps @80 2SS') + stat('Channels', `${blocks.length} @ ${B.width} MHz`, `${nd} without DFS`) + stat('DFS', 'Radar rules', 'Channel Availability Check 60 s; AP may have to move');
    } else {
      const blocksN = { 20: 59, 40: 29, 80: 14, 160: 7, 320: 3 }[B.width], per = B.width / 20;
      const wrap = document.createElement('div'); wrap.className = 'chgrid six';
      const row = document.createElement('div'); row.className = 'chrow six';
      for (let i = 0; i < blocksN; i++) {
        const cs = C6.slice(i * per, (i + 1) * per), bd = document.createElement('div'); bd.className = 'chblock' + (cs.some(psc) ? ' psc' : ''); bd.title = `${cs[0]}${cs.length > 1 ? '–' + cs[cs.length - 1] : ''} · ${uniiName6(cs[0])}`;
        bd.innerHTML = cs.map(c => `<span class="chc small${psc(c) ? ' psc' : ''}">${c}</span>`).join(''); row.appendChild(bd);
      }
      wrap.appendChild(row); area.appendChild(wrap);
      note.innerHTML = `<b>${blocksN} channels</b> at ${B.width} MHz${B.width === 320 ? ' (Wi‑Fi 7 only)' : ''}. Highlighted = <b>PSC</b> (Preferred Scanning Channels, every 16th) — 6 GHz clients scan only these first so they find your AP fast. Hover for UNII sub‑band.`;
      st.innerHTML = stat('Range', 'Shortest', 'Higher frequency = more loss') + stat('Speed', 'Highest', 'Wi‑Fi 6E/7 — up to 3 × 160 MHz+ clean') + stat('Channels', `${blocksN} @ ${B.width} MHz`, '1,200 MHz of spectrum (5.925–7.125 GHz)') + stat('Rules', 'WPA3 only', 'No legacy clients, no WPA2; OWE & SAE; AFC for standard power');
    }
  }
  const stat = (a, b, c) => `<div class="bstat"><span>${a}</span><b>${b}</b><small>${c}</small></div>`;
  function initBands() {
    $$('#bandTabs button').forEach(b => b.onclick = () => { $$('#bandTabs button').forEach(x => x.classList.toggle('on', x === b)); B.band = b.dataset.b; B.width = 20; B.sel = null; widthSeg(); drawBand(); });
    $('#us').onchange = e => { B.us = e.target.checked; B.sel = null; drawBand(); };
    widthSeg(); drawBand();
  }

  /* ═════════ A2 · signal simulator ═════════ */
  const Sim = { band: '5' };
  const PL1 = { 24: 40, 5: 47, 6: 49 };
  function simCalc() {
    const d = +$('#dist').value, w = +$('#walls').value, P = 17;
    const rssi = P - PL1[Sim.band] - 30 * Math.log10(Math.max(1, d)) - 5 * w, snr = rssi + 95;
    const T = [[38, 1201], [34, 1081], [31, 900], [28, 800], [25, 600], [21, 480], [18, 360], [15, 240], [12, 120], [8, 60], [5, 30]];
    let rate = 0; for (const [s, r] of T) if (snr >= s) { rate = r; break; }
    rate = Math.round(rate * (Sim.band === '24' ? .25 : 1));
    return { d, w, rssi: Math.round(rssi), snr: Math.round(snr), rate };
  }
  function rssiClass(r) { return r >= -60 ? ['Excellent', 'var(--sec)'] : r >= -67 ? ['Good — voice & video OK', 'var(--sec)'] : r >= -70 ? ['Fair — data OK', 'var(--ctl)'] : r >= -75 ? ['Weak — roam soon', 'var(--ctl)'] : r >= -82 ? ['Poor — drops likely', 'var(--lost)'] : ['No usable signal', 'var(--lost)']; }
  function simDraw() {
    const { d, w, rssi, snr, rate } = simCalc(), [lbl, col] = rssiClass(rssi);
    $('#dOut').textContent = d + ' m'; $('#wOut').textContent = w;
    const dist = th => Math.pow(10, (17 - PL1[Sim.band] - 5 * w - th) / 30), sc = 9, ax = 70, ay = 150;
    const svg = $('#simSvg'); svg.innerHTML = '';
    [[-82, 'var(--lost)'], [-75, 'var(--ctl)'], [-67, 'var(--sec)']].forEach(([th, c]) => el('circle', { cx: ax, cy: ay, r: Math.min(560, dist(th) * sc), fill: c, 'fill-opacity': .1, stroke: c, 'stroke-opacity': .5, 'stroke-dasharray': '3 5' }, svg));
    for (let k = 1; k <= w; k++) { const x = ax + (d * sc) * k / (w + 1); el('rect', { x: x - 3, y: ay - 55, width: 6, height: 110, rx: 2, class: 'simwall' }, svg); }
    for (let k = 0; k < 3; k++) { const r = el('circle', { cx: ax, cy: ay, r: 12, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.5, style: `animation:simring 3.2s ${k * 1.05}s ease-out infinite;transform-origin:${ax}px ${ay}px;transform-box:view-box` }, svg); }
    el('circle', { cx: ax, cy: ay, r: 9, fill: 'var(--accent)' }, svg);
    el('text', { x: ax, y: ay + 30, class: 'simlbl' }, svg).textContent = 'AP';
    const cx = Math.min(610, ax + d * sc);
    el('line', { x1: ax, y1: ay, x2: cx, y2: ay, stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '2 4' }, svg);
    el('circle', { cx, cy: ay, r: 8, fill: col, style: `filter:drop-shadow(0 0 8px ${col})` }, svg);
    el('text', { x: cx, y: ay - 18, class: 'simlbl' }, svg).textContent = `${rssi} dBm`;
    $('#gauges').innerHTML = `<div class="gauge"><span>RSSI</span><b style="color:${col}">${rssi} dBm</b><div class="gbar"><i style="width:${Math.max(2, Math.min(100, (rssi + 95) / 55 * 100))}%;background:${col}"></i></div><small>${lbl}</small></div>
      <div class="gauge"><span>SNR</span><b>${snr} dB</b><div class="gbar"><i style="width:${Math.max(2, Math.min(100, snr / 55 * 100))}%;background:var(--res)"></i></div><small>${snr >= 25 ? 'Healthy' : snr >= 15 ? 'Low — retries rising' : 'Too noisy'}</small></div>
      <div class="gauge"><span>Link rate</span><b>${rate ? rate + ' Mbps' : 'Disconnected'}</b><div class="gbar"><i style="width:${Math.min(100, rate / 12)}%;background:var(--sec)"></i></div><small>${Sim.band === '24' ? 'Wi‑Fi 6 · 20 MHz · 2SS' : 'Wi‑Fi 6 · 80 MHz · 2SS'}</small></div>`;
  }
  function initSim() {
    $('#dist').oninput = simDraw; $('#walls').oninput = simDraw;
    $$('#simBand button').forEach(b => b.onclick = () => { $$('#simBand button').forEach(x => x.classList.toggle('on', x === b)); Sim.band = b.dataset.b; simDraw(); });
    simDraw();
    $('#rssiTable').innerHTML = `<div class="rt"><h4>RSSI — how loud the AP is</h4><ul>
      <li><i style="background:var(--sec)"></i><b>−30 to −55 dBm</b><span>Excellent — next to the AP</span></li><li><i style="background:var(--sec)"></i><b>−55 to −67</b><span>Good — voice &amp; video design target (cell edge −67)</span></li>
      <li><i style="background:var(--ctl)"></i><b>−67 to −70</b><span>Okay for data and light browsing</span></li><li><i style="background:var(--ctl)"></i><b>−70 to −75</b><span>Weak — client should be roaming</span></li>
      <li><i style="background:var(--lost)"></i><b>−75 to −82</b><span>Poor — low rates, retries</span></li><li><i style="background:var(--lost)"></i><b>below −82</b><span>Unusable / disconnects</span></li></ul></div>
      <div class="rt"><h4>SNR — signal minus noise</h4><ul>
      <li><i style="background:var(--sec)"></i><b>40 dB +</b><span>Excellent — highest MCS rates</span></li><li><i style="background:var(--sec)"></i><b>25–40</b><span>Good — voice minimum is 25 dB</span></li>
      <li><i style="background:var(--ctl)"></i><b>15–25</b><span>Low — rates drop, retries climb</span></li><li><i style="background:var(--lost)"></i><b>10–15</b><span>Very low — barely connected</span></li><li><i style="background:var(--lost)"></i><b>&lt; 10 dB</b><span>No connection</span></li></ul>
      <p>Why both? A strong signal (−55) in a very noisy room (−60 noise) still has only 5 dB SNR.</p></div>`;
  }

  /* ═════════ B · standards ═════════ */
  function initStd() {
    const rows = [
      ['802.11b', 'Wi‑Fi 1', '1999', '2.4', '11 Mbps', 'DSSS / CCK', '22 MHz'],
      ['802.11a', 'Wi‑Fi 2', '1999', '5', '54 Mbps', 'OFDM, 64‑QAM', '20 MHz'],
      ['802.11g', 'Wi‑Fi 3', '2003', '2.4', '54 Mbps', 'OFDM', '20 MHz'],
      ['802.11n', 'Wi‑Fi 4', '2009', '2.4 / 5', '600 Mbps', 'MIMO 4×4, 64‑QAM', '20 / 40 MHz'],
      ['802.11ac', 'Wi‑Fi 5', '2013', '5', '6.9 Gbps', '256‑QAM, DL MU‑MIMO, beamforming', '20–160 MHz'],
      ['802.11ax', 'Wi‑Fi 6 / 6E', '2019 / 2020', '2.4 / 5 / 6*', '9.6 Gbps', '1024‑QAM, OFDMA, UL+DL MU‑MIMO, TWT, BSS colouring', '20–160 MHz'],
      ['802.11be', 'Wi‑Fi 7', '2024', '2.4 / 5 / 6', '46 Gbps', '4096‑QAM, MLO, Multi‑RU, preamble puncturing', '20–320 MHz'],
    ];
    $('#stdTbl').innerHTML = `<thead><tr><th>Standard</th><th>Name</th><th>Year</th><th>Band (GHz)</th><th>Max rate</th><th>Key technology</th><th>Widths</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td class="info">${r[5]}</td><td>${r[6]}</td></tr>`).join('')}</tbody>`;
    const A = [
      ['11e', 'QoS (WMM)', 'Four traffic queues — voice, video, best effort, background — so calls beat downloads.'],
      ['11i', 'Security', 'The standard behind WPA2: AES‑CCMP encryption and the 4‑way handshake.'],
      ['11k', 'Radio resource', 'AP sends a neighbour list so a client knows where to roam without scanning everything.'],
      ['11v', 'BSS transition', 'AP can politely suggest “please move to AP‑2” (client steering).'],
      ['11r', 'Fast transition', 'Pre‑shares keys between APs so roaming takes < 50 ms.'],
      ['11w', 'Protected mgmt', 'Signs deauth/disassoc frames (PMF) — stops deauth attacks.'],
      ['11ax', 'OFDMA + BSS colour', 'Splits a channel into resource units so many small packets share one transmission.'],
      ['MLO', 'Wi‑Fi 7', 'One client uses 2.4, 5 and 6 GHz links at the same time for speed and reliability.'],
    ];
    $('#amend').innerHTML = A.map(a => `<div class="am"><b>${a[0]}</b><h5>${a[1]}</h5><p>${a[2]}</p></div>`).join('');
  }

  /* ═════════ page chrome: active section in sub-nav ═════════ */
  function initNav() {
    const links = $$('#wnav a'), secs = links.map(a => $(a.getAttribute('href')));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach((l, i) => l.classList.toggle('on', secs[i] === e.target)); }), { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(s => s && io.observe(s));
  }

  initBands(); initSim(); initStd(); initNav();
  document.dispatchEvent(new Event('wl-ready'));
})();

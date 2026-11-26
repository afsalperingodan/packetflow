/* PacketFlow — animation engine & UI */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  const PROTO_COLORS = {
    TCP: '#4da3ff', UDP: '#b48cff', DNS: '#ffb454', HTTP: '#3ddc97', 'HTTP/3': '#3ddc97', TLS: '#2de2c4', QUIC: '#ff7ac6',
    ARP: '#f6e05e', DHCP: '#ff9f6b', ICMP: '#7dd3fc', FTP: '#a3e635', 'FTP‑DATA': '#a3e635', SSH: '#34d399', SMTP: '#f472b6',
    IMAP: '#f472b6', NTP: '#c4b5fd', MQTT: '#fb923c', SNMP: '#60a5fa', BGP: '#f87171', WS: '#22d3ee', ETH: '#cbd5e1',
  };
  const protoColor = p => PROTO_COLORS[p] || '#9db4ff';
  const KIND_VAR = { req: 'var(--req)', res: 'var(--res)', ctl: 'var(--ctl)', sec: 'var(--sec)', lost: 'var(--lost)' };

  const state = { P: null, step: -1, playing: false, speed: 1, token: 0, view: 'network', pos: {}, adj: {}, baseIps: {} };

  /* ---------- svg helpers ---------- */
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const fmtSize = n => (n === 0 ? '—' : n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B');

  /* ---------- icons (centered at 0,0, ~ 44px) ---------- */
  const ICONS = {
    client: g => { el('rect', { x: -17, y: -16, width: 34, height: 22, rx: 3, class: 'f' }, g); el('path', { d: 'M-23 12h46l-4 5h-38z' }, g); el('path', { d: 'M-6 -5l5 4 7-7', style: 'opacity:.7' }, g); },
    server: g => { [-17, -3, 11].forEach((y, i) => { el('rect', { x: -17, y, width: 34, height: 11, rx: 3, class: 'f' }, g); el('circle', { cx: -10, cy: y + 5.5, r: 1.8, class: 'dot' }, g); el('path', { d: `M2 ${y + 5.5}h10` }, g); }); },
    router: g => { el('rect', { x: -21, y: -2, width: 42, height: 17, rx: 4, class: 'f' }, g); el('path', { d: 'M-12 -2l-6 -13M12 -2l6 -13M0 -2v-13' }, g); [-11, -3, 5, 13].forEach(x => el('circle', { cx: x - 1, cy: 6.5, r: 1.7, class: 'dot' }, g)); },
    ap: g => { el('rect', { x: -19, y: 2, width: 38, height: 14, rx: 4, class: 'f' }, g); el('circle', { cx: -9, cy: 9, r: 1.6, class: 'dot' }, g); el('circle', { cx: -3, cy: 9, r: 1.6, class: 'dot' }, g); el('path', { d: 'M-9 -4a13 13 0 0 1 18 0M-14 -10a21 21 0 0 1 28 0M-4 0a5 5 0 0 1 8 0' }, g); },
    switch: g => { el('rect', { x: -22, y: -10, width: 44, height: 20, rx: 4, class: 'f' }, g); [-14, -6, 2, 10].forEach(x => el('rect', { x, y: 0, width: 5, height: 6, class: 'dot' }, g)); el('path', { d: 'M-12 -4h24m-4 -3l4 3l-4 3' }, g); },
    cloud: g => { el('path', { d: 'M-16 12a9 9 0 0 1 0-18a12 12 0 0 1 23-3a10 10 0 0 1 9 21z', class: 'f' }, g); el('circle', { cx: 0, cy: 3, r: 7 }, g); el('path', { d: 'M-7 3h14M0 -4c-4 4-4 10 0 14M0 -4c4 4 4 10 0 14' }, g); },
    dns: g => { el('circle', { cx: 0, cy: 0, r: 17, class: 'f' }, g); el('ellipse', { cx: 0, cy: 0, rx: 7, ry: 17 }, g); el('path', { d: 'M-17 0h34M-14 -9h28M-14 9h28' }, g); },
    mail: g => { el('rect', { x: -20, y: -13, width: 40, height: 26, rx: 4, class: 'f' }, g); el('path', { d: 'M-20 -11l20 15l20 -15' }, g); },
    phone: g => { el('rect', { x: -11, y: -19, width: 22, height: 38, rx: 5, class: 'f' }, g); el('path', { d: 'M-4 -14h8' }, g); el('circle', { cx: 0, cy: 14, r: 1.8, class: 'dot' }, g); },
    sensor: g => { el('circle', { cx: 0, cy: 0, r: 6, class: 'f' }, g); el('path', { d: 'M-12 -10a15 15 0 0 0 0 20M12 -10a15 15 0 0 1 0 20M-19 -15a24 24 0 0 0 0 30M19 -15a24 24 0 0 1 0 30' }, g); },
    broker: g => { el('path', { d: 'M0 -20l18 10v20l-18 10l-18 -10v-20z', class: 'f' }, g); el('circle', { cx: 0, cy: 0, r: 4, class: 'dot' }, g); el('path', { d: 'M0 -4v-10M3.5 2l9 5M-3.5 2l-9 5' }, g); },
  };

  /* ---------- graph / routing ---------- */
  function buildGraph(P) {
    state.pos = {}; state.adj = {}; state.baseIps = {};
    P.nodes.forEach(n => { state.pos[n.id] = [n.x, n.y]; state.adj[n.id] = []; state.baseIps[n.id] = n.ip; });
    P.links.forEach(([a, b]) => { state.adj[a].push(b); state.adj[b].push(a); });
  }
  function findPath(a, b) {
    if (a === b) return [a];
    const prev = { [a]: null }, q = [a];
    while (q.length) {
      const u = q.shift();
      for (const v of state.adj[u]) if (!(v in prev)) { prev[v] = u; if (v === b) { q.length = 0; break; } q.push(v); }
    }
    const out = []; let c = b;
    while (c != null) { out.unshift(c); c = prev[c]; }
    return out;
  }
  const toList = s => (Array.isArray(s.to) ? s.to : [s.to]);
  const stepPaths = s => toList(s).map(t => findPath(s.from, t));
  const ipOf = id => { const n = state.P.nodes.find(n => n.id === id); return n.ip || n.label; };
  function stepTimes(P) {
    let t = 0;
    return P.steps.map((s, i) => {
      if (i > 0) { const hops = Math.max(...stepPaths(s).map(p => p.length - 1)); t += 0.004 + hops * 0.007 + (i % 3) * 0.0011; }
      return t;
    });
  }

  /* ---------- sidebar ---------- */
  function renderList(filter = '') {
    const f = filter.trim().toLowerCase();
    const box = $('#list'); box.innerHTML = '';
    let count = 0, idx = 0;
    CATS.forEach(cat => {
      const items = PROTOCOLS.filter(p => p.cat === cat.id && (!f || (p.name + p.full + p.desc + p.abbr + p.steps.map(s => s.info + s.title + s.tag).join(' ')).toLowerCase().includes(f)));
      if (!items.length) return;
      const h = document.createElement('div'); h.className = 'cat'; h.innerHTML = `<span>${cat.name}</span><small>${items.length}</small>`; box.appendChild(h);
      items.forEach(p => {
        count++;
        const b = document.createElement('button');
        b.className = 'pitem' + (state.P && state.P.id === p.id ? ' on' : '');
        b.style.animationDelay = (idx++ * 30) + 'ms';
        b.dataset.id = p.id;
        b.innerHTML = `<span class="pdot" style="--c:${protoColor(p.abbr)}"></span><span class="t"><b>${p.name}</b><small>${p.full}</small></span>`;
        b.onclick = () => { location.hash = p.id; $('#side').classList.remove('open'); };
        box.appendChild(b);
      });
    });
    if (!count) box.innerHTML = '<div class="empty">No protocol matches “' + f.replace(/</g, '&lt;') + '”.</div>';
  }

  /* ---------- load a protocol ---------- */
  function load(id) {
    const P = PROTOCOLS.find(p => p.id === id) || PROTOCOLS.find(p => p.id === 'http');
    stop();
    state.P = P; state.step = -1; buildGraph(P);
    document.title = `${P.name} explained — PacketFlow`;
    $$('.pitem').forEach(b => b.classList.toggle('on', b.dataset.id === P.id));
    renderHero(P); renderStage(P); renderSequence(P); renderTable(P);
    applyStep(-1);
    if (state.loaded) $('#hero').scrollIntoView({ behavior: 'smooth', block: 'start' }); state.loaded = true;
  }

  function renderHero(P) {
    $('#hero').dataset.abbr = P.abbr; $('#hero').style.animation = 'none'; void $('#hero').offsetWidth; $('#hero').style.animation = '';
    $('#hero').innerHTML = `
      <div class="sub" style="--c:${protoColor(P.abbr)}"><i></i>${P.full}</div>
      <h1>${P.name}</h1>
      <p class="desc">${P.desc}</p>
      <div class="chips">
        <span class="chip"><b>Layer</b>${P.layer}</span><span class="chip"><b>Port</b>${P.port}</span>
        <span class="chip"><b>Runs over</b>${P.transport}</span><span class="chip"><b>Spec</b>${P.rfc}</span>
        <span class="chip"><b>Steps</b>${P.steps.length}</span>
      </div>
      <div class="analogy"><div><em>In plain words</em>${P.analogy}</div></div>`;
  }

  /* ---------- network stage ---------- */
  let gLinks, gNodes, gTrail, gPk;
  function renderStage(P) {
    const svg = $('#stage'); svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    gLinks = el('g', {}, svg); gNodes = el('g', {}, svg); gTrail = el('g', {}, svg); gPk = el('g', {}, svg);
    P.links.forEach(([a, b, kind]) => {
      const [x1, y1] = state.pos[a], [x2, y2] = state.pos[b];
      const l = el('line', { x1, y1, x2, y2, class: 'link ' + (kind === 'wifi' ? 'wifi' : 'flow'), 'data-a': a, 'data-b': b }, gLinks);
    });
    P.nodes.forEach((n, i) => {
      const g = el('g', { class: 'node', 'data-id': n.id, transform: `translate(${n.x},${n.y})` }, gNodes);
      el('circle', { r: 40, class: 'ring' }, g);
      el('circle', { r: 38, class: 'bgc' }, g);
      const ig = el('g', { class: 'ico idle', style: `animation-delay:${-i * 0.9}s` }, g);
      (ICONS[n.type] || ICONS.server)(ig);
      el('text', { y: 62, class: 'nl' }, g).textContent = n.label;
      el('text', { y: 80, class: 'ni' }, g).textContent = n.ip;
    });
  }
  const nodeEl = id => $(`.node[data-id="${id}"]`, $('#stage'));
  function setIps(upTo) {
    const ips = { ...state.baseIps };
    for (let i = 0; i <= upTo; i++) { const o = state.P.steps[i].ip; if (o) Object.assign(ips, o); }
    state.P.nodes.forEach(n => { const t = $('.ni', nodeEl(n.id)); if (t.textContent !== ips[n.id]) { t.textContent = ips[n.id]; t.animate([{ fill: 'var(--ctl)' }, { fill: 'var(--muted)' }], 1400); } });
  }

  /* ---------- sequence diagram ---------- */
  function renderSequence(P) {
    const svg = $('#seq'); svg.innerHTML = '';
    const ids = [...new Set(P.steps.flatMap(s => [s.from, ...toList(s)]))];
    ids.sort((a, b) => state.pos[a][0] - state.pos[b][0] || state.pos[a][1] - state.pos[b][1]);
    const W = 1000, top = 28, gap = 52, startY = 110, H = startY + P.steps.length * gap + 30;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const xs = {}; ids.forEach((id, i) => xs[id] = ids.length === 1 ? W / 2 : 90 + i * ((W - 180) / (ids.length - 1)));
    el('defs', {}, svg);
    ids.forEach(id => {
      const n = P.nodes.find(n => n.id === id), x = xs[id];
      el('line', { x1: x, x2: x, y1: top + 46, y2: H - 10, class: 'seq-life' }, svg);
      const g = el('g', { class: 'seq-head' }, svg);
      el('rect', { x: x - 70, y: top, width: 140, height: 46, rx: 11 }, g);
      el('text', { x, y: top + 20 }, g).textContent = n.label.length > 20 ? n.label.slice(0, 19) + '…' : n.label;
      el('text', { x, y: top + 37, class: 'ip' }, g).textContent = n.ip || '';
    });
    P.steps.forEach((s, i) => {
      const y = startY + i * gap, c = KIND_VAR[s.lost ? 'lost' : s.kind || 'req'];
      const g = el('g', { class: 'seq-row', 'data-i': i, style: `--c:${c}` }, svg);
      el('rect', { x: 10, y: y - 30, width: W - 20, height: gap - 2, rx: 8, class: 'hl' }, g);
      const x1 = xs[s.from];
      el('text', { x: 24, y: y + 4, class: 'num', style: 'text-anchor:start' }, g).textContent = i + 1;
      if (s.from === toList(s)[0] && toList(s).length === 1) { // local action
        el('path', { d: `M${x1} ${y - 8}h40v16h-40`, fill: 'none', stroke: c, 'stroke-width': 2, class: 'main' }, g);
        el('text', { x: x1 + 50, y: y + 4, style: 'text-anchor:start' }, g).textContent = `${s.proto}: ${s.tag}`;
      } else {
        toList(s).forEach(t => {
          const x2 = xs[t], dir = Math.sign(x2 - x1) || 1;
          el('line', { x1, y1: y, x2: x2 - dir * 8, y2: y, class: 'main' }, g);
          el('path', { d: `M${x2} ${y}l${-dir * 11} -5v10z`, class: 'ah' }, g);
        });
        const xs2 = toList(s).map(t => xs[t]), mid = (x1 + xs2.reduce((a, b) => a + b, 0) / xs2.length) / 2;
        const lab = el('text', { x: mid, y: y - 9 }, g); lab.textContent = `${s.tag} · ${s.info.length > 54 ? s.info.slice(0, 52) + '…' : s.info}`;
        if (s.lost) el('text', { x: mid, y: y + 17, class: 'sm', style: 'fill:var(--lost)' }, g).textContent = '✕ packet lost in transit';
      }
      g.onclick = () => goTo(i);
    });
  }

  /* ---------- table ---------- */
  function renderTable(P) {
    const times = stepTimes(P), tb = $('#tbl tbody'); tb.innerHTML = '';
    P.steps.forEach((s, i) => {
      const c = s.lost ? 'var(--lost)' : KIND_VAR[s.kind || 'req'];
      const local = toList(s).length === 1 && s.to === s.from;
      const dst = s.dst || (local ? '(local)' : toList(s).length > 1 ? 'Broadcast' : ipOf(toList(s)[0]));
      const tr = document.createElement('tr'); tr.dataset.i = i; tr.style.setProperty('--c', c);
      if (s.lost) tr.classList.add('lostrow');
      tr.innerHTML = `<td>${i + 1}</td><td>${times[i].toFixed(3)}s</td><td>${s.src || ipOf(s.from)}</td><td>${dst}</td>
        <td><span class="pb" style="--c:${protoColor(s.proto)}">${s.proto}</span></td><td class="info">${s.lost ? '✕ ' : ''}${s.info}</td><td>${fmtSize(s.size)}</td>`;
      tr.onclick = () => goTo(i);
      tb.appendChild(tr);
    });
  }

  /* ---------- UI state for a step ---------- */
  function stepColor(s) { return s.lost ? 'var(--lost)' : KIND_VAR[s.kind || 'req']; }
  function applyStep(i) {
    const P = state.P, n = P.steps.length;
    $$('#tbl tbody tr').forEach((tr, k) => { tr.classList.toggle('seen', k <= i); tr.classList.toggle('cur', k === i); });
    $$('.seq-row').forEach((g, k) => { g.classList.toggle('seen', k <= i); g.classList.toggle('cur', k === i); });
    $('#bar').style.width = ((i + 1) / n * 100) + '%';
    $('#prevBtn').disabled = i <= 0; $('#stepBtn').disabled = i >= n - 1;
    setIps(i);
    const cap = $('#caption');
    if (i < 0) {
      cap.innerHTML = `<div class="num" style="--cc:var(--accent)">00</div><div class="body"><h4>Ready when you are</h4><p>Press <b>Play</b> to watch ${P.name} happen packet by packet, or use <b>Step</b> to go one move at a time. Click any row in the table to jump to it.</p></div>`;
    } else {
      const s = P.steps[i];
      cap.innerHTML = `<div class="num" style="--cc:${stepColor(s)}">${String(i + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}</div><div class="body"><h4>${s.title}</h4><p>${s.why}</p></div>`;
    }
    renderInspect(i);
    $('#playBtn').classList.toggle('playing', state.playing);
    $('#playBtn').textContent = state.playing ? 'Pause' : (i >= n - 1 ? 'Replay' : (i < 0 ? 'Play' : 'Resume'));
    const row = $(`#tbl tbody tr[data-i="${i}"]`); if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const sr = $(`.seq-row[data-i="${i}"]`); if (sr) { const sc = $('.seq-scroll'), top = sr.getBBox().y * (sc.scrollWidth / 1000); sc.scrollTo({ top: Math.max(0, top - 140), behavior: 'smooth' }); }
  }

  function renderInspect(i) {
    const P = state.P, box = $('#inspect');
    if (i < 0) {
      box.innerHTML = `<h3>Packet inspector</h3><p style="color:var(--muted)">Start the animation and every packet’s header fields appear here — the same information a tool like Wireshark shows.</p><div class="tipbox"><b>Did you know?</b>${P.tip}</div>`;
      return;
    }
    const s = P.steps[i], c = stepColor(s), hdr = s.hdr ?? Math.min(s.size, 54), pay = Math.max(0, s.size - hdr);
    box.innerHTML = `<h3>Packet inspector</h3>
      <div class="head"><span class="pb" style="--c:${protoColor(s.proto)}">${s.proto}</span><span class="t">${s.tag}</span></div>
      <div class="route">${s.src || ipOf(s.from)} → ${s.dst || (s.to === s.from ? 'itself' : toList(s).length > 1 ? 'Broadcast' : ipOf(toList(s)[0]))}</div>
      <div class="fields" style="--c:${c}">${s.fields.map(([k, v], j) => `<div class="field" style="animation-delay:${j * 45}ms"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      ${s.size ? `<div class="sizebar">Frame size: <b>${fmtSize(s.size)}</b> — headers ${hdr} B${pay ? ` + payload ${fmtSize(pay)}` : ''}
        <div class="bar"><i style="width:${Math.max(6, hdr / s.size * 100)}%;background:${c}"></i><i style="width:${pay / s.size * 100}%;background:color-mix(in srgb,${c} 40%,transparent)"></i></div></div>` : ''}
      <div class="tipbox"><b>Did you know?</b>${P.tip}</div>`;
  }

  /* ---------- packet animation ---------- */
  function pointAt(pts, segs, total, d) {
    let acc = 0;
    for (let k = 0; k < segs.length; k++) {
      if (d <= acc + segs[k] || k === segs.length - 1) { const t = segs[k] ? Math.min(1, (d - acc) / segs[k]) : 1; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t]; }
      acc += segs[k];
    }
    return pts[pts.length - 1];
  }
  function flyPacket(path, s, tok) {
    return new Promise(res => {
      const pts = path.map(id => state.pos[id]);
      const segs = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
      const total = segs.reduce((a, b) => a + b, 0);
      const lim = s.lost ? total * 0.56 : total;
      const dur = Math.max(1300, total / 260 * 1000) / state.speed;
      const color = stepColor(s);
      const g = el('g', { class: 'pkt', style: `--pc:${color}` }, gPk);
      const w = s.tag.length * 7 + 16;
      const pill = el('g', {}, g); el('rect', { x: -w / 2, y: -34, width: w, height: 18, rx: 9, class: 'pill' }, pill); el('text', { y: -21 }, pill).textContent = s.tag;
      el('circle', { r: 8, class: 'core', fill: color }, g);
      if (s.kind === 'sec') el('text', { y: 4, style: 'font-size:10px' }, g).textContent = '';
      const t0 = performance.now(); let lastTrail = 0;
      const frame = now => {
        if (tok !== state.token) { g.remove(); return res(false); }
        const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const [x, y] = pointAt(pts, segs, total, e * lim);
        g.setAttribute('transform', `translate(${x},${y})`);
        if (now - lastTrail > 55) { lastTrail = now; const c = el('circle', { cx: x, cy: y, r: 6, class: 'trail', style: `--tc:${color}` }, gTrail); setTimeout(() => c.remove(), 950); }
        if (t < 1) return requestAnimationFrame(frame);
        if (s.lost) { el('circle', { cx: x, cy: y, r: 22, class: 'burst' }, gTrail); const x2 = el('text', { x, y: y + 7, style: 'font:700 22px sans-serif;fill:var(--lost);text-anchor:middle' }, gTrail); x2.textContent = '✕'; setTimeout(() => x2.remove(), 1500); g.remove(); return res(true); }
        g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }); setTimeout(() => g.remove(), 230);
        res(true);
      };
      requestAnimationFrame(frame);
    });
  }
  function hit(id) { const n = nodeEl(id); if (!n) return; n.classList.remove('hit'); void n.getBoundingClientRect(); n.classList.add('hit'); }
  function setActive(ids) { $$('.node', $('#stage')).forEach(n => n.classList.toggle('active', ids.includes(n.dataset.id))); }
  function lightLinks(paths, color) {
    $$('.link', $('#stage')).forEach(l => { l.classList.remove('on'); l.style.removeProperty('--lc'); });
    paths.forEach(p => p.slice(1).forEach((b, k) => { const a = p[k]; const l = $(`.link[data-a="${a}"][data-b="${b}"], .link[data-a="${b}"][data-b="${a}"]`, $('#stage')); if (l) { l.classList.add('on'); l.style.setProperty('--lc', color); } }));
  }

  async function animateStep(i, tok) {
    const s = state.P.steps[i], color = stepColor(s);
    $$('#stage .pkt').forEach(p => p.remove());
    const n = nodeEl(s.from);
    if (toList(s).length === 1 && s.to === s.from) { // local action
      lightLinks([], color); setActive([]); n.classList.add('local'); hit(s.from);
      const b = el('g', { class: 'badge-pill', transform: `translate(${state.pos[s.from][0]},${state.pos[s.from][1] - 56})` }, gPk);
      const w = s.tag.length * 7.4 + 22; el('rect', { x: -w / 2, y: -11, width: w, height: 22, rx: 11 }, b); el('text', { y: 4 }, b).textContent = '● ' + s.tag;
      await sleep(1900 / state.speed); n.classList.remove('local'); setTimeout(() => b.remove(), 400);
      return tok === state.token;
    }
    const paths = stepPaths(s);
    lightLinks(paths, color); setActive([s.from]); hit(s.from);
    const ok = (await Promise.all(paths.map(p => flyPacket(p, s, tok)))).every(Boolean);
    if (!ok || tok !== state.token) return false;
    if (!s.lost) { setActive([...toList(s)]); toList(s).forEach(hit); } else setActive([s.from]);
    return true;
  }

  /* ---------- playback control ---------- */
  function stop() { state.playing = false; state.token++; $$('#stage .pkt').forEach(p => p.remove()); }
  async function runStep(i, tok) { state.step = i; applyStep(i); await animateStep(i, tok); }
  async function goTo(i) {
    stop(); const tok = state.token;
    i = Math.max(-1, Math.min(i, state.P.steps.length - 1));
    if (i < 0) { state.step = -1; applyStep(-1); lightLinks([], ''); setActive([]); return; }
    await runStep(i, tok); if (tok === state.token) applyStep(state.step);
  }
  async function play() {
    if (state.step >= state.P.steps.length - 1) { state.step = -1; applyStep(-1); }
    state.playing = true; const tok = ++state.token; applyStep(state.step);
    while (state.playing && tok === state.token && state.step < state.P.steps.length - 1) {
      await runStep(state.step + 1, tok);
      if (tok !== state.token) return;
      await sleep(1000 / state.speed);
    }
    if (tok === state.token) { state.playing = false; applyStep(state.step); }
  }
  function pause() { stop(); applyStep(state.step); }
  const togglePlay = () => (state.playing ? pause() : play());
  const reset = () => { stop(); state.step = -1; applyStep(-1); lightLinks([], ''); setActive([]); };

  /* ---------- wiring ---------- */
  function setView(v) {
    state.view = v;
    $$('.tab').forEach(t => { const on = t.dataset.view === v; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    $('#netView').classList.toggle('on', v === 'network'); $('#seqView').classList.toggle('on', v === 'sequence');
    if (v === 'sequence') applyStep(state.step);
  }
  function setTheme(t) { document.documentElement.dataset.theme = t; store.set('nf-theme', t); }

  function countUp(elm, to) {
    const t0 = performance.now(), d = 1400;
    const f = now => { const t = Math.min(1, (now - t0) / d); elm.textContent = Math.round(to * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }

  function init() {
    setTheme(store.get('nf-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    $('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('#menuBtn').onclick = () => $('#side').classList.toggle('open');
    $('#playBtn').onclick = togglePlay;
    $('#stepBtn').onclick = () => goTo(state.step + 1);
    $('#prevBtn').onclick = () => goTo(state.step - 1);
    $('#resetBtn').onclick = reset;
    $$('.tab').forEach(t => t.onclick = () => setView(t.dataset.view));
    $$('#speed button').forEach(b => b.onclick = () => { state.speed = +b.dataset.s; $$('#speed button').forEach(x => x.classList.toggle('on', x === b)); });
    $('#q').addEventListener('input', e => renderList(e.target.value));
    $('#brand').onclick = e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    addEventListener('hashchange', () => load(location.hash.slice(1)));
    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.matches('input')) { if (e.key === 'Escape') e.target.blur(); return; }
      if (e.key === '/') { e.preventDefault(); $('#q').focus(); }
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight') goTo(state.step + 1);
      else if (e.key === 'ArrowLeft') goTo(state.step - 1);
      else if (e.key.toLowerCase() === 'r') reset();
    });
    countUp($('#statProto'), PROTOCOLS.length); countUp($('#statSteps'), PROTOCOLS.reduce((a, p) => a + p.steps.length, 0));
    $('#q').placeholder = `Search ${PROTOCOLS.length} protocols…`;
    const names = PROTOCOLS.map(p => `<span>${p.name}</span>`).join('');
    $('#marquee').innerHTML = names + names;
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .15 });
    $$('.reveal').forEach(r => io.observe(r));
    addEventListener('pointermove', e => { const bg = $('.bg'); bg.style.setProperty('--mx', e.clientX + 'px'); bg.style.setProperty('--my', e.clientY + 'px'); }, { passive: true });
    $('#randomBtn').onclick = () => { const p = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)]; location.hash = p.id; $('#explore').scrollIntoView({ behavior: 'smooth' }); setTimeout(play, 900); };
    renderList();
    load(location.hash.slice(1) || 'http');
  }
  init();
  window.__nf = { state, goTo, play, pause, reset }; // handy for debugging
})();

/* PacketFlow — quiz leaderboard.
   Global ranking needs a tiny free database. Set window.PF_BOARD_URL in site.js (see README → "Global leaderboard").
   Until then scores are stored in this browser only, and the board says so. */
(() => {
  'use strict';
  const BASE = String(window.PF_BOARD_URL || '').replace(/\/+$/, '');
  const $ = (s, r = document) => r.querySelector(s);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const clean = s => String(s || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtT = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const fmtD = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
  const sortRows = rows => rows.slice().sort((a, b) => b.score - a.score || a.ms - b.ms || a.t - b.t);
  const mounts = {};

  async function load(quiz) {
    if (BASE) {
      try {
        const r = await fetch(`${BASE}/scores/${quiz}.json?orderBy="$key"&limitToLast=300`, { cache: 'no-store' });
        if (r.ok) { const j = await r.json(); return { rows: Object.values(j || {}).filter(x => x && typeof x.score === 'number'), global: true }; }
      } catch (e) { /* fall through */ }
      return { rows: JSON.parse(ls.get('pf-board-' + quiz) || '[]'), global: false, failed: true };
    }
    return { rows: JSON.parse(ls.get('pf-board-' + quiz) || '[]'), global: false };
  }
  async function save(quiz, row) {
    if (BASE) {
      try { const r = await fetch(`${BASE}/scores/${quiz}.json`, { method: 'POST', body: JSON.stringify(row) }); if (r.ok) return true; } catch (e) { /* local fallback */ }
    }
    const a = JSON.parse(ls.get('pf-board-' + quiz) || '[]'); a.push(row); ls.set('pf-board-' + quiz, JSON.stringify(sortRows(a).slice(0, 50))); return false;
  }

  async function draw(quiz, mine) {
    const m = mounts[quiz]; if (!m) return;
    const body = $('.bd-body', m); body.innerHTML = '<p class="bd-msg">Loading scores…</p>';
    const { rows, global, failed } = await load(quiz), sorted = sortRows(rows), top = sorted.slice(0, 25);
    const note = global ? `<span class="bd-live"><i></i>Worldwide leaderboard · ${sorted.length} player${sorted.length === 1 ? '' : 's'}</span>`
      : `<span class="bd-local">${failed ? 'Could not reach the online leaderboard — showing scores saved on this device.' : 'Showing scores saved on <b>this device only</b>. A worldwide ranking switches on when the site owner connects a database (see README).'}</span>`;
    const myIdx = mine ? sorted.findIndex(r => r.t === mine.t && r.name === mine.name) : -1;
    body.innerHTML = `<div class="bd-note">${note}</div>` + (top.length ? `<table class="bd-tbl"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Time</th><th>Date</th></tr></thead><tbody>${top.map((r, i) => `<tr class="${mine && r.t === mine.t && r.name === mine.name ? 'me' : ''}"><td><span class="rk r${i + 1}">${i + 1}</span></td><td>${esc(r.name)}</td><td><b>${r.score}</b>/${r.total}</td><td>${fmtT(r.ms)}</td><td>${fmtD(r.t)}</td></tr>`).join('')}</tbody></table>` : '<p class="bd-msg">No scores yet — be the first on the board!</p>')
      + (myIdx > 24 ? `<p class="bd-msg">You are <b>#${myIdx + 1}</b> of ${sorted.length}.</p>` : '');
    const rankEl = $('#qRank'); if (rankEl && mine && myIdx >= 0) rankEl.innerHTML = `You are <b>#${myIdx + 1}</b> ${global ? 'in the world' : 'on this device'} out of ${sorted.length}.`;
  }

  window.PFBoard = {
    mount(sel, quiz, title) {
      const el = typeof sel === 'string' ? $(sel) : sel; if (!el) return;
      mounts[quiz] = el;
      el.innerHTML = `<div class="bd-head"><h3>${esc(title || 'Leaderboard')}</h3><button class="btn mini" data-r>Refresh</button></div><div class="bd-body"></div>`;
      $('[data-r]', el).onclick = () => draw(quiz);
      draw(quiz);
    },
    form(el, quiz, score, total, ms) {
      if (!el) return;
      const done = () => { el.innerHTML = `<p class="bd-thanks" id="qRank">Saved!</p>`; };
      el.innerHTML = `<form class="bd-form"><label>Add your score to the leaderboard</label><div class="bd-row"><input name="n" maxlength="20" required placeholder="Your name" autocomplete="nickname" value="${esc(ls.get('pf-name') || '')}"><button class="btn solid" type="submit">Submit ${score}/${total}</button></div><small>Name is public (max 20 characters). Ranked by score, then speed.</small></form>`;
      $('form', el).onsubmit = async e => {
        e.preventDefault();
        const last = +(ls.get('pf-last-' + quiz) || 0);
        if (Date.now() - last < 20000) { $('small', el).textContent = 'Please wait a few seconds before submitting again.'; return; }
        const name = clean(new FormData(e.target).get('n')); if (!name) return;
        ls.set('pf-name', name); ls.set('pf-last-' + quiz, String(Date.now()));
        const btn = $('button', el); btn.disabled = true; btn.textContent = 'Saving…';
        const row = { name, score, total, ms: Math.max(1000, ms), t: Date.now() };
        await save(quiz, row); done(); await draw(quiz, row);
        const b = mounts[quiz]; if (b) b.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    },
  };
})();

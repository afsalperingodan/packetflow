/* PacketFlow — shared site settings (edit here) */
window.PF_BOARD_URL = ''; // ← Firebase Realtime Database URL for the worldwide quiz leaderboard (see README), e.g. 'https://your-project-default-rtdb.firebaseio.com'
window.PF_LINKEDIN = 'https://www.linkedin.com/in/afsalperingodan/'; // ← paste your LinkedIn profile URL, e.g. 'https://www.linkedin.com/in/yourname'

(function () {
  try { const li = document.getElementById('liLink'); if (li && window.PF_LINKEDIN) { li.href = window.PF_LINKEDIN; li.hidden = false; } } catch (e) {}
  // used by pages that don't load app.js
  if (document.body.classList.contains('lpage')) {
    const root = document.documentElement;
    let t = null; try { t = localStorage.getItem('nf-theme'); } catch (e) {}
    root.dataset.theme = t || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.getElementById('themeBtn').onclick = () => {
      const n = root.dataset.theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = n; try { localStorage.setItem('nf-theme', n); } catch (e) {}
    };
    addEventListener('pointermove', e => { const b = document.querySelector('.bg'); b.style.setProperty('--mx', e.clientX + 'px'); b.style.setProperty('--my', e.clientY + 'px'); }, { passive: true });
  }
})();

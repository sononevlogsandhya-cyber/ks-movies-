// ── KS MOVIES TV SUPPORT v1.0 ──
// Handles: Android TV, Fire TV, Smart TV, TV browsers
// Features: D-pad nav, remote keys, focus management, scroll fix

(function () {
  'use strict';

  // ── DETECT TV ──
  const isTV = (function () {
    const ua = navigator.userAgent.toLowerCase();
    return (
      ua.includes('tv') ||
      ua.includes('firetv') ||
      ua.includes('android tv') ||
      ua.includes('googletv') ||
      ua.includes('webos') ||
      ua.includes('tizen') ||
      ua.includes('netcast') ||
      window.matchMedia('(hover: none) and (pointer: coarse)').matches && screen.width >= 1280
    );
  })();

  if (isTV) {
    document.documentElement.setAttribute('data-device', 'tv');
    console.log('🖥️ KS Movies: TV Mode activated');
  }

  // ── TV CSS INJECTION ──
  if (isTV) {
    const style = document.createElement('style');
    style.textContent = `
      /* TV Focus Ring */
      :focus { outline: 3px solid #e50914 !important; outline-offset: 3px !important; box-shadow: 0 0 0 5px rgba(229,9,20,0.3) !important; }
      :focus:not(:focus-visible) { outline: none !important; box-shadow: none !important; }
      :focus-visible { outline: 3px solid #e50914 !important; outline-offset: 3px !important; box-shadow: 0 0 0 8px rgba(229,9,20,0.25) !important; }

      /* Larger tap targets for TV */
      [data-device="tv"] button,
      [data-device="tv"] a,
      [data-device="tv"] .movie-card,
      [data-device="tv"] .lang-card { 
        min-height: 56px; 
      }

      /* Scale on focus for cards */
      [data-device="tv"] .movie-card:focus,
      [data-device="tv"] .movie-card:focus-within,
      [data-device="tv"] [class*="card"]:focus {
        transform: scale(1.06) !important;
        z-index: 99 !important;
        transition: transform 0.15s ease !important;
      }

      /* Hide scrollbars on TV */
      [data-device="tv"] ::-webkit-scrollbar { display: none !important; }
      [data-device="tv"] * { scrollbar-width: none !important; }

      /* Bigger text for TV distance */
      [data-device="tv"] body { font-size: 112% !important; }

      /* Remove hover-only styles on TV */
      [data-device="tv"] * { cursor: none !important; }
    `;
    document.head.appendChild(style);
  }

  // ── FOCUSABLE SELECTOR ──
  const FOCUSABLE = [
    'a[href]', 'button:not([disabled])',
    'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
    '.movie-card', '.lang-card', '[data-focusable]'
  ].join(',');

  function getFocusables() {
    return Array.from(document.querySelectorAll(FOCUSABLE))
      .filter(el => el.offsetParent !== null && !el.closest('[hidden]'));
  }

  function getRect(el) {
    return el.getBoundingClientRect();
  }

  // ── D-PAD NAVIGATION ──
  function findBestInDirection(current, dir) {
    const items = getFocusables();
    if (!items.length) return null;

    const cr = getRect(current);
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;

    let best = null;
    let bestScore = Infinity;

    items.forEach(el => {
      if (el === current) return;
      const r = getRect(el);
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const dx = ex - cx;
      const dy = ey - cy;

      // Must be in correct direction
      let inDir = false;
      switch (dir) {
        case 'up':    inDir = dy < -10; break;
        case 'down':  inDir = dy > 10;  break;
        case 'left':  inDir = dx < -10; break;
        case 'right': inDir = dx > 10;  break;
      }
      if (!inDir) return;

      // Score: distance + axis penalty
      let score;
      if (dir === 'up' || dir === 'down') {
        score = Math.abs(dy) + Math.abs(dx) * 2;
      } else {
        score = Math.abs(dx) + Math.abs(dy) * 2;
      }

      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });

    return best;
  }

  // ── KEY HANDLER ──
  document.addEventListener('keydown', function (e) {
    const KEY_MAP = {
      // Standard
      37: 'left', 38: 'up', 39: 'right', 40: 'down',
      13: 'enter', 32: 'enter',
      // TV remotes
      179: 'enter', 227: 'enter',
      // Back button
      8: 'back', 27: 'back',
      // Media keys
      415: 'play', 19: 'pause', 417: 'ffwd', 412: 'rewind'
    };

    const action = KEY_MAP[e.keyCode];
    if (!action) return;

    const focused = document.activeElement;

    // ── DPAD ──
    if (['up', 'down', 'left', 'right'].includes(action)) {
      // Init focus if nothing focused
      if (!focused || focused === document.body) {
        const items = getFocusables();
        if (items.length) items[0].focus();
        e.preventDefault();
        return;
      }

      const next = findBestInDirection(focused, action);
      if (next) {
        next.focus();
        next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        e.preventDefault();
      } else {
        // Scroll page if no focusable in direction
        if (action === 'up') window.scrollBy({ top: -200, behavior: 'smooth' });
        if (action === 'down') window.scrollBy({ top: 200, behavior: 'smooth' });
        e.preventDefault();
      }
    }

    // ── ENTER / SELECT ──
    if (action === 'enter') {
      if (focused && focused !== document.body) {
        focused.click();
        e.preventDefault();
      }
    }

    // ── BACK ──
    if (action === 'back') {
      if (window.history.length > 1) {
        window.history.back();
      }
      e.preventDefault();
    }

    // ── MEDIA CONTROLS (for player page) ──
    if (action === 'play' || action === 'pause') {
      const video = document.querySelector('video');
      if (video) {
        video.paused ? video.play() : video.pause();
        e.preventDefault();
      }
    }
    if (action === 'ffwd') {
      const video = document.querySelector('video');
      if (video) { video.currentTime += 10; e.preventDefault(); }
    }
    if (action === 'rewind') {
      const video = document.querySelector('video');
      if (video) { video.currentTime -= 10; e.preventDefault(); }
    }
  }, true);

  // ── AUTO FOCUS FIRST ELEMENT ──
  window.addEventListener('load', function () {
    if (isTV) {
      setTimeout(() => {
        const items = getFocusables();
        if (items.length) items[0].focus();
      }, 500);
    }
  });

  // ── SERVICE WORKER REGISTRATION ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ SW registered:', reg.scope))
        .catch(err => console.warn('SW error:', err));
    });
  }

  // ── EXPOSE TV FLAG ──
  window.KS_IS_TV = isTV;

})();

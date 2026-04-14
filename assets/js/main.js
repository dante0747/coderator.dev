/* ─── Scroll progress bar ──────────────────────────────────────────────────────── */
(function () {
  const bar = document.getElementById('progress-bar');
  if (bar) {
    const update = () => {
      const scrolled = window.scrollY;
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();

/* ─── Hero constellation ─────────────────────────────────────────────────────────── */
(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  hero.prepend(canvas);

  const ctx      = canvas.getContext('2d');
  const N        = 32;
  const MAX_DIST = 150;
  let W, H, pts;

  function setup() {
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
    pts = Array.from({ length: N }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r:  Math.random() * 1.4 + 0.7,
    }));
  }
  setup();

  let raf;
  function tick() {
    raf = requestAnimationFrame(tick);
    ctx.clearRect(0, 0, W, H);

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    // lines between nearby particles
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          ctx.strokeStyle = `rgba(0,212,255,${(1 - d / MAX_DIST) * 0.2})`;
          ctx.lineWidth   = 0.8;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }

    // dots
    pts.forEach(p => {
      ctx.fillStyle = 'rgba(0,212,255,0.4)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  tick();

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { cancelAnimationFrame(raf); setup(); tick(); }, 250);
  }, { passive: true });
})();

/* ─── Terminal typewriter ────────────────────────────────────────────────────────── */
(function () {
  const body = document.querySelector('.hero-terminal-body');
  if (!body) return;

  const lines = [...body.children];
  lines.forEach(el => (el.style.visibility = 'hidden'));

  let delay = 500;
  lines.forEach(line => {
    const cmdEl = line.querySelector('.t-cmd');
    if (cmdEl) {
      const full = cmdEl.textContent;
      cmdEl.textContent = '';
      setTimeout(() => {
        line.style.visibility = 'visible';
        let i = 0;
        const id = setInterval(() => {
          cmdEl.textContent += full[i++];
          if (i >= full.length) clearInterval(id);
        }, 42);
      }, delay);
      delay += full.length * 42 + 280;
    } else {
      setTimeout(() => (line.style.visibility = 'visible'), delay);
      delay += 160;
    }
  });
})();

/* ─── Konami code easter egg ─────────────────────────────────────────────────────── */
(function () {
  const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
               'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let idx = 0;

  document.addEventListener('keydown', e => {
    idx = (e.key === seq[idx]) ? idx + 1 : (e.key === seq[0] ? 1 : 0);
    if (idx === seq.length) { idx = 0; hackThePlanet(); }
  });

  function hackThePlanet() {
    const el = document.createElement('div');
    el.innerHTML = [
      '<div style="font-size:3.5rem;margin-bottom:.75rem">💀</div>',
      '<div style="letter-spacing:.25em;font-size:1.6rem">ACCESS GRANTED</div>',
      '<pre style="font-size:.72rem;color:#3dff9a;margin-top:1.25rem;text-align:left;line-height:1.8;opacity:.85">',
      '  [*] kernel: coderator v∞ loaded',
      '  [*] bypassing coffee firewall...',
      '  [*] git push --force origin main',
      '  [+] all tests passing  (lol jk)',
      '  [*] deploying to prod at 4:59 PM',
      '</pre>',
      '<div style="font-size:.72rem;opacity:.4;margin-top:1.5rem;letter-spacing:.12em">↑↑↓↓←→←→BA · click to dismiss</div>',
    ].join('');
    Object.assign(el.style, {
      position:'fixed', inset:'0', background:'rgba(0,0,0,.96)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-mono,monospace)', color:'#3dff9a',
      textShadow:'0 0 24px #3dff9a, 0 0 48px rgba(61,255,154,.35)',
      zIndex:'9999', cursor:'pointer', textAlign:'center',
      padding:'2rem',
    });
    document.body.appendChild(el);
    const dismiss = () => el.remove();
    el.addEventListener('click', dismiss);
    setTimeout(dismiss, 7000);
  }
})();

/* ─── Pixel-art title animation ─────────────────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('pixel-title');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* 5 × 7 bitmap glyphs for every character in "CODERATOR.DEV" */
  const GLYPH = {
    C: ['01110','10001','10000','10000','10000','10001','01110'],
    O: ['01110','10001','10001','10001','10001','10001','01110'],
    D: ['11100','10010','10001','10001','10001','10010','11100'],
    E: ['11111','10000','10000','11110','10000','10000','11111'],
    R: ['11110','10001','10001','11110','10100','10010','10001'],
    A: ['00100','01010','10001','11111','10001','10001','10001'],
    T: ['11111','00100','00100','00100','00100','00100','00100'],
    '.':['00000','00000','00000','00000','00000','00110','00110'],
    V: ['10001','10001','10001','10001','01010','01010','00100'],
  };

  const TEXT = 'CODERATOR.DEV';
  const PS   = 5;        /* one "art-pixel" = 5 screen px          */
  const GAP  = 1;        /* gap between pixels                     */
  const STEP = PS + GAP; /* 6 px per pixel unit                    */
  const CW   = 5;        /* glyph columns                          */
  const CH   = 7;        /* glyph rows                             */
  const CGAP = STEP * 2; /* 12 px between glyphs                   */
  const PAD  = STEP * 2; /* 12 px canvas padding                   */

  const charPxW = CW * STEP;  /* 30 */
  const W = TEXT.length * charPxW + (TEXT.length - 1) * CGAP + PAD * 2; /* ≈ 558 */
  const H = CH * STEP + PAD * 2;  /* 66 */

  canvas.width  = W;
  canvas.height = H;

  /* ── Build particle list ── */
  const pts = [];
  TEXT.split('').forEach((ch, ci) => {
    const g = GLYPH[ch];
    if (!g) return;
    const ox = PAD + ci * (charPxW + CGAP);
    const oy = PAD;
    for (let r = 0; r < CH; r++) {
      for (let c = 0; c < CW; c++) {
        if (g[r][c] === '1') {
          pts.push({
            fx: ox + c * STEP,           /* final x                  */
            fy: oy + r * STEP,           /* final y                  */
            cy: -PS,                     /* current y (above canvas) */
            vy: 2 + Math.random() * 3,   /* fall speed px/frame      */
            /* stagger left→right, char by char, col by col */
            delay: ci * 160 + c * 18 + Math.random() * 70,
            landed: false,
            landedAt: 0,
          });
        }
      }
    }
  });

  let t0         = null;
  let frameCount = 0;

  function frame(ts) {
    if (!t0) t0 = ts;
    const elapsed = ts - t0;
    frameCount++;

    /* After everything has settled, animate at ~30 fps to save CPU */
    const allSettled = pts.every(p => p.landed && (ts - p.landedAt) > 600);
    if (allSettled && frameCount % 2 !== 0) {
      requestAnimationFrame(frame);
      return;
    }

    ctx.clearRect(0, 0, W, H);

    /* ── Subtle horizontal scan-line sweep ── */
    const sy = ((elapsed * 0.055) % (H + 20)) - 10;
    const sg = ctx.createLinearGradient(0, sy, 0, sy + 14);
    sg.addColorStop(0,   'rgba(0,212,255,0)');
    sg.addColorStop(0.5, 'rgba(0,212,255,0.07)');
    sg.addColorStop(1,   'rgba(0,212,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, Math.max(0, sy), W, Math.min(14, H));

    /* ── Falling particles ── */
    for (const p of pts) {
      if (elapsed < p.delay) continue;

      if (!p.landed) {
        p.cy += p.vy;
        if (p.cy >= p.fy) {
          p.cy     = p.fy;
          p.landed = true;
          p.landedAt = ts;
        }

        /* cyan trailing tail */
        for (let t = 1; t <= 4; t++) {
          const ty = p.cy - t * STEP;
          if (ty >= -PS && ty < H) {
            ctx.fillStyle = `rgba(0,212,255,${((5 - t) / 5) * 0.28})`;
            ctx.fillRect(p.fx, ty, PS, PS);
          }
        }

        /* bright leading pixel */
        if (p.cy >= 0) {
          ctx.fillStyle = '#dff8ff';
          ctx.fillRect(p.fx, p.cy, PS, PS);
        }
      }
    }

    /* ── Landed pixels – pulsing neon glow (single shadow-blur pass) ── */
    const pulse = 0.52 + Math.sin(ts * 0.0015) * 0.13;
    ctx.save();
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = 8;
    for (const p of pts) {
      if (!p.landed) continue;
      const age   = ts - p.landedAt;
      const flash = age < 280 ? (1 - age / 280) * 0.48 : 0; /* landing flash */
      ctx.fillStyle = `rgba(0,212,255,${Math.min(1, pulse + flash)})`;
      ctx.fillRect(p.fx, p.fy, PS, PS);
    }
    ctx.restore();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

/* ─── Mobile nav ───────────────────────────────────────────────────────────────── */
(function () {
  const toggle = document.getElementById('nav-toggle');
  const nav    = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ─── Active nav link ─────────────────────────────────────────────────────────── */
(function () {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (href === '/' && path === '/') ||
        (href !== '/' && path.startsWith(href))) {
      link.classList.add('active');
    }
  });

  // Hide the logo cursor on pages that have their own blinking cursor (about page)
  const logoCursor = document.querySelector('.site-logo .cursor');
  if (logoCursor && path.startsWith('/about')) {
    logoCursor.style.display = 'none';
  }
})();


/* ─── Copy-code buttons ────────────────────────────────────────────────────────── */
(function () {
  document.querySelectorAll('.post-content pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;

    const btn = document.createElement('button');
    btn.className   = 'copy-btn';
    btn.textContent = 'copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    pre.appendChild(btn);

    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText.trimEnd());
        btn.textContent = 'copied!';
        btn.classList.add('copied');
      } catch {
        btn.textContent = 'failed';
      }
      setTimeout(() => {
        btn.textContent = 'copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  });
})();

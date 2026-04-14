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


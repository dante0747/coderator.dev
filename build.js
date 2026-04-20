#!/usr/bin/env node
'use strict';

const fs    = require('fs-extra');
const path  = require('path');
const matter = require('gray-matter');
const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs  = require('highlight.js');

const config = require('./config.js');

// ─── Marked setup ──────────────────────────────────────────────────────────────

/** Fix relative image src to absolute /assets/... paths */
const renderer = {
  image(href, title, text) {
    let src = href || '';
    if (src && !src.startsWith('http') && !src.startsWith('/')) {
      src = src.replace(/^\.\.\//, '/');
      if (!src.startsWith('/')) src = '/' + src;
    }
    const cap = title ? `<figcaption>${escHtml(title)}</figcaption>` : '';
    return `<figure><img src="${src}" alt="${escHtml(text || '')}" loading="lazy">${cap}</figure>`;
  },
};

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
  { renderer }
);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function readingTime(body) {
  const words = body.replace(/[#`*_\[\]]/g, '').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function makeExcerpt(body, len = 200) {
  const clean = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > len ? clean.substring(0, len).trimEnd() + '…' : clean;
}

function tagPills(tags) {
  if (!tags || !tags.length) return '';
  const arr = Array.isArray(tags) ? tags : [tags];
  return arr.map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
}

function fakeHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = Math.imul(h, 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

// ─── Post reading ──────────────────────────────────────────────────────────────

function readPosts() {
  const postsDir = path.join(__dirname, 'content', 'posts');
  if (!fs.existsSync(postsDir)) return [];

  return fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const raw    = fs.readFileSync(path.join(postsDir, file), 'utf-8');
      const { data, content: body } = matter(raw);
      const slug   = path.basename(file, '.md');
      const match  = slug.match(/^(\d{4}-\d{2}-\d{2})/);
      // gray-matter auto-parses YAML dates into JS Date objects
      const date   = data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : (data.date ? String(data.date).slice(0, 10) : (match ? match[1] : ''));
      const tags   = data.tags || data.categories || [];
      return {
        title:       data.title  || slug,
        date,
        tags:        Array.isArray(tags) ? tags : [tags],
        description: data.description || '',
        image:       data.image  || '',
        slug,
        body,
        url:         `/posts/${slug}/`,
        excerpt:     data.description || makeExcerpt(body),
        readingTime: readingTime(body),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ─── Base template ─────────────────────────────────────────────────────────────

function baseTemplate({ title, description, image = '', content, url = '', type = 'website', publishedTime = '' }) {
  const ogImg = image
    ? `${config.baseUrl}/${image.replace(/^\//, '')}`
    : `${config.baseUrl}/assets/images/avatar.png`;

  const canonicalUrl = url || `${config.baseUrl}/`;

  // Build sameAs links for structured data
  const sameAs = [
    config.github   && `https://github.com/${config.github}`,
    config.linkedin && `https://www.linkedin.com/in/${config.linkedin}`,
    config.twitter  && `https://twitter.com/${config.twitter}`,
  ].filter(Boolean);

  const authorSchema = {
    '@type': 'Person',
    'name': config.author,
    'url': `${config.baseUrl}/about/`,
    ...(sameAs.length ? { sameAs } : {}),
  };

  const publisherSchema = {
    '@type': 'Organization',
    'name': config.title,
    'url': config.baseUrl,
    'logo': {
      '@type': 'ImageObject',
      'url': `${config.baseUrl}/assets/images/logo.png`,
    },
  };

  let jsonLd;
  if (type === 'article') {
    const dtPublished = publishedTime ? (publishedTime.includes('T') ? publishedTime : `${publishedTime}T00:00:00Z`) : undefined;
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': title.replace(/\s*\|.*$/, ''),
      'description': description,
      'image': ogImg,
      'url': canonicalUrl,
      ...(dtPublished ? { 'datePublished': dtPublished, 'dateModified': dtPublished } : {}),
      'author': authorSchema,
      'publisher': publisherSchema,
      'mainEntityOfPage': { '@type': 'WebPage', '@id': canonicalUrl },
    };
  } else {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': canonicalUrl === `${config.baseUrl}/` ? 'WebSite' : 'WebPage',
      'name': title,
      'description': description,
      'url': canonicalUrl,
      'author': authorSchema,
    };
  }

  // Ensure full ISO 8601 datetime for Open Graph article timestamps
  const isoDateTime = (d) => d ? (d.includes('T') ? d : `${d}T00:00:00Z`) : '';

  const articleMeta = (type === 'article' && publishedTime)
    ? `\n  <meta property="article:published_time" content="${isoDateTime(publishedTime)}">\n  <meta property="article:author" content="${escHtml(config.author)}">`
    : '';

  const navLinks = config.nav
    .map(n => {
      const ext = n.external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${n.url}" class="nav-link"${ext}>${n.label}</a>`;
    })
    .join('\n          ');

  const socialLinks = [
    config.github   && `<a href="https://github.com/${config.github}" target="_blank" rel="noopener" aria-label="GitHub">${iconGithub()}</a>`,
    config.twitter  && `<a href="https://twitter.com/${config.twitter}" target="_blank" rel="noopener" aria-label="Twitter">${iconTwitter()}</a>`,
    config.linkedin && `<a href="https://linkedin.com/in/${config.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${iconLinkedin()}</a>`,
  ].filter(Boolean).join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta name="author" content="${escHtml(config.author)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:type" content="${type}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="${escHtml(config.title)}">
  <meta property="og:locale" content="en_US">${articleMeta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${ogImg}">
  <link rel="icon" href="/favicon.ico">
  <link rel="alternate" type="application/rss+xml" title="${escHtml(config.title)} RSS Feed" href="/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@400;500;600;700&family=Josefin+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/highlight.css">
  <link rel="stylesheet" href="/assets/css/style.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <div class="progress-bar" id="progress-bar"></div>

  <header class="site-header">
    <div class="container">
      <div class="header-inner">
        <a href="/" class="site-logo" aria-label="Home">
          <span class="prompt">~/</span><span class="logo-text">${escHtml(config.title)}</span><span class="cursor">▋</span>
        </a>
        <nav class="site-nav" id="site-nav">
          ${navLinks}
        </nav>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <main id="main">
    ${content}
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-inner">
        <p class="footer-copy">
          &copy; ${new Date().getFullYear()} ${escHtml(config.author)}.
          Built with <a href="https://github.com/${config.github}/${config.repoName}" target="_blank" rel="noopener">a custom SSG</a>.
        </p>
        <div class="footer-social">
          ${socialLinks}
        </div>
      </div>
    </div>
  </footer>

  <script src="/assets/js/main.js"></script>
</body>
</html>`;
}

// ─── Index template ────────────────────────────────────────────────────────────

function indexTemplate(posts) {
  const cards = posts.map(post => {
    const imgStyle = post.image
      ? `style="background-image:url('/${post.image.replace(/^\//, '')}')"` : '';
    const imgClass = `post-card-image${post.image ? ' has-image' : ' no-image'}`;
    return `
    <article class="post-card">
      <a href="${post.url}" class="post-card-link" aria-label="${escHtml(post.title)}">
        <div class="${imgClass}" ${imgStyle}>
          ${!post.image ? `<div class="post-card-placeholder">${iconFile()}</div>` : ''}
        </div>
        <div class="post-card-content">
          <div class="post-card-meta">
            <span class="commit-hash">${fakeHash(post.slug)}</span>
            <span class="sep">&middot;</span>
            <time datetime="${post.date}">${formatDate(post.date)}</time>
            <span class="sep">&middot;</span>
            <span>${post.readingTime}</span>
          </div>
          <h2 class="post-card-title">${escHtml(post.title)}</h2>
          <p class="post-card-excerpt">${escHtml(post.excerpt)}</p>
          <div class="post-card-tags">${tagPills(post.tags)}</div>
        </div>
      </a>
    </article>`;
  }).join('');

  const recentPosts = posts.slice(0, 3);
  const gitLogLines = recentPosts.map(p => {
    const shortTitle = p.title.length > 44 ? p.title.slice(0, 44) + '…' : p.title;
    return `          <p class="t-out"><span class="t-yellow">${fakeHash(p.slug)}</span> <span class="t-green">feat:</span> ${escHtml(shortTitle)}</p>`;
  }).join('\n');

  return `
  <section class="hero">
    <div class="container">
      <div class="pixel-title-wrap">
        <canvas id="pixel-title" aria-label="coderator.dev"></canvas>
      </div>
      <div class="terminal-window">
        <div class="terminal-titlebar">
          <div class="terminal-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <span class="terminal-title">coderator.dev — zsh</span>
          <div class="terminal-dots-spacer"></div>
        </div>
        <div class="terminal-body hero-terminal-body">
          <p><span class="t-prompt">❯</span> <span class="t-cmd">whoami</span></p>
          <p class="t-out">${escHtml(config.author)} <span class="t-dim">// ${escHtml(config.tagline)}</span></p>
          <p><span class="t-prompt">❯</span> <span class="t-cmd">git log --oneline -${Math.min(3, posts.length)}</span></p>
${gitLogLines}
          <p><span class="t-prompt">❯</span> <span class="t-cmd">ls posts/</span> <span class="cursor-blink">▋</span></p>
        </div>
      </div>
    </div>
  </section>

  <section class="posts-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title"><span class="section-title-prompt">//</span> all posts</h2>
        <span class="post-count">${posts.length} article${posts.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="posts-grid">
        ${cards}
      </div>
    </div>
  </section>`;
}

// ─── Post template ─────────────────────────────────────────────────────────────

function postTemplate(post, htmlContent, prevPost, nextPost) {
  const coverHtml = post.image
    ? `<div class="post-hero" style="background-image:url('/${post.image.replace(/^\//, '')}')"></div>`
    : '';

  const prevHtml = prevPost
    ? `<a href="${prevPost.url}" class="post-nav-link prev">
        <span class="nav-arrow">←</span>
        <span class="nav-label">Previous</span>
        <span class="nav-title">${escHtml(prevPost.title)}</span>
      </a>`
    : '<span></span>';

  const nextHtml = nextPost
    ? `<a href="${nextPost.url}" class="post-nav-link next">
        <span class="nav-arrow">→</span>
        <span class="nav-label">Next</span>
        <span class="nav-title">${escHtml(nextPost.title)}</span>
      </a>`
    : '<span></span>';

  // Build Giscus comments block
  const c = config.comments || {};
  const commentsHtml = (c.provider === 'giscus' && c.repoId && c.categoryId)
    ? `<section class="comments-section">
        <div class="terminal-window comments-terminal">
          <div class="terminal-titlebar">
            <div class="terminal-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <span class="terminal-title">💬 comments — GitHub Discussions</span>
            <div class="terminal-dots-spacer"></div>
          </div>
          <div class="terminal-body comments-terminal-body">
            <p class="comments-cmd-line"><span class="t-prompt">❯</span> <span class="t-cmd">giscus --repo <span class="t-yellow">${escHtml(c.repo)}</span> --mapping <span class="t-yellow">${escHtml(c.mapping || 'pathname')}</span></span></p>
            <div class="giscus-container">
              <script src="https://giscus.app/client.js"
                data-repo="${escHtml(c.repo)}"
                data-repo-id="${escHtml(c.repoId)}"
                data-category="${escHtml(c.category)}"
                data-category-id="${escHtml(c.categoryId)}"
                data-mapping="${escHtml(c.mapping || 'pathname')}"
                data-strict="0"
                data-reactions-enabled="1"
                data-emit-metadata="0"
                data-input-position="top"
                data-theme="${config.baseUrl}/assets/css/giscus-terminal.css"
                data-lang="en"
                crossorigin="anonymous"
                async>
              </scr` + `ipt>
            </div>
          </div>
        </div>
      </section>`
    : (c.provider === 'giscus'
        ? `<section class="comments-section comments-unconfigured">
            <div class="terminal-window" style="max-width:100%">
              <div class="terminal-titlebar">
                <div class="terminal-dots">
                  <span class="dot dot-red"></span>
                  <span class="dot dot-yellow"></span>
                  <span class="dot dot-green"></span>
                </div>
                <span class="terminal-title">💬 comments — setup required</span>
                <div class="terminal-dots-spacer"></div>
              </div>
              <div class="terminal-body" style="font-size:.8rem">
                <p><span class="t-prompt">❯</span> <span class="t-cmd">giscus --status</span></p>
                ${c.repoId
                  ? `<p class="t-out"><span class="t-green">✓</span> repoId      <span class="t-dim">${escHtml(c.repoId)}</span></p>`
                  : `<p class="t-out"><span class="t-yellow">✗</span> repoId      <span class="t-dim">not set</span></p>`}
                <p class="t-out"><span class="t-yellow">✗</span> categoryId  <span class="t-dim">not set</span></p>
                <p class="t-out">&nbsp;</p>
                <p class="t-out"><span class="t-dim">Remaining steps:</span></p>
                ${!c.repoId ? `<p class="t-out"><span class="t-dim">  1. Get repoId from https://giscus.app</span></p>` : ''}
                <p class="t-out"><span class="t-dim">  ${!c.repoId ? '2' : '1'}. Enable Discussions: github.com/dante0747/coderator.dev/settings</span></p>
                <p class="t-out"><span class="t-dim">  ${!c.repoId ? '3' : '2'}. Install giscus app: github.com/apps/giscus</span></p>
                <p class="t-out"><span class="t-dim">  ${!c.repoId ? '4' : '3'}. Visit https://giscus.app → copy categoryId → paste in config.js</span></p>
              </div>
            </div>
          </section>`
        : '');


  return `
  <article class="post-layout">
    ${coverHtml}
    <div class="post-container">
      <header class="post-header">
        <div class="post-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="sep">&middot;</span>
          <span>${post.readingTime}</span>
        </div>
        <h1 class="post-title">${escHtml(post.title)}</h1>
        <div class="post-tags">${tagPills(post.tags)}</div>
      </header>
      <div class="post-content">
        ${htmlContent}
      </div>
      <footer class="post-footer">
        <div class="post-footer-tags">
          <span class="footer-tags-label">tagged in:</span>
          ${tagPills(post.tags)}
        </div>
      </footer>

      <!-- 💬 Comments + reactions (via Giscus — requires GitHub login, truly one-per-user) -->
      ${commentsHtml}
    </div>
    <nav class="post-navigation" aria-label="Post navigation">
      <div class="container">
        ${prevHtml}
        ${nextHtml}
      </div>
    </nav>
  </article>`;
}

// ─── Page template ─────────────────────────────────────────────────────────────

function pageTemplate(title, htmlContent) {
  return `
  <div class="page-layout">
    <div class="post-container">
      <h1 class="post-title page-cmd-title"><span class="t-prompt">❯</span> <span class="t-cmd">${escHtml(title)}</span><span class="cursor-blink">▋</span></h1>
      <div class="post-content">${htmlContent}</div>
    </div>
  </div>`;
}

// ─── 404 template ──────────────────────────────────────────────────────────────

function notFoundTemplate() {
  return `
  <div class="not-found">
    <div class="container">
      <div class="terminal-window">
        <div class="terminal-titlebar">
          <div class="terminal-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <span class="terminal-title">404 — zsh</span>
          <div class="terminal-dots-spacer"></div>
        </div>
        <div class="terminal-body">
          <p><span class="t-prompt">❯</span> <span class="t-cmd">GET /this-page</span></p>
          <p class="t-err">zsh: no such file or directory: /this-page</p>
          <p class="t-out"><span class="t-dim">exit code 404</span></p>
          <p><span class="t-prompt">❯</span> <span class="t-cmd">cd ~</span> <span class="cursor-blink">▋</span></p>
        </div>
      </div>
      <a href="/" class="btn-home">← back to home</a>
    </div>
  </div>`;
}

// ─── Icons ─────────────────────────────────────────────────────────────────────


function iconGithub() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;
}
function iconTwitter() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
}
function iconLinkedin() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
}
function iconFile() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
}

// ─── Sitemap ───────────────────────────────────────────────────────────────────

function buildSitemap(posts, pageSlugs) {
  const now = new Date().toISOString().slice(0, 10);
  const entry = (loc, lastmod, changefreq, priority) =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const staticUrls = [
    entry(`${config.baseUrl}/`, now, 'weekly', '1.0'),
    ...pageSlugs.map(slug => entry(`${config.baseUrl}/${slug}/`, now, 'monthly', '0.8')),
  ];
  const postUrls = posts.map(p =>
    entry(`${config.baseUrl}${p.url}`, p.date || now, 'monthly', '0.7')
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...postUrls].join('\n')}
</urlset>`;
}

// ─── RSS Feed ──────────────────────────────────────────────────────────────────

function buildRss(posts) {
  const items = posts.map(post => {
    const link = `${config.baseUrl}${post.url}`;
    const cats = post.tags.map(t => `      <category><![CDATA[${t}]]></category>`).join('\n');
    return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt}]]></description>
${cats}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${config.title}]]></title>
    <link>${config.baseUrl}</link>
    <description><![CDATA[${config.description}]]></description>
    <language>en-us</language>
    <managingEditor>${config.author}</managingEditor>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${config.baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

// ─── Build ─────────────────────────────────────────────────────────────────────

const ROOT   = __dirname;
const DIST   = path.join(ROOT, 'dist');
const ASSETS = path.join(ROOT, 'assets');
const PAGES  = path.join(ROOT, 'content', 'pages');

function copyHighlightCss() {
  try {
    const pkg  = path.dirname(require.resolve('highlight.js/package.json'));
    const src  = path.join(pkg, 'styles', 'github-dark.css');
    if (fs.existsSync(src)) {
      fs.copySync(src, path.join(DIST, 'assets', 'css', 'highlight.css'));
    }
  } catch (e) {
    console.warn('  ⚠ Could not copy highlight.js theme:', e.message);
  }
}

function build() {
  const t0 = Date.now();
  console.log('\n⚡  Building coderator.dev…\n');

  fs.emptyDirSync(DIST);

  // Copy static assets
  if (fs.existsSync(ASSETS)) fs.copySync(ASSETS, path.join(DIST, 'assets'));
  copyHighlightCss();
  ['CNAME', 'favicon.ico'].forEach(f => {
    if (fs.existsSync(path.join(ROOT, f))) fs.copySync(path.join(ROOT, f), path.join(DIST, f));
  });

  // Posts
  const posts = readPosts();
  posts.forEach((post, i) => {
    const html  = marked.parse(post.body);
    const prev  = posts[i + 1] || null;   // older post
    const next  = posts[i - 1] || null;   // newer post
    const page  = baseTemplate({
      title:         `${post.title} | ${config.title}`,
      description:   post.excerpt,
      image:         post.image,
      content:       postTemplate(post, html, prev, next),
      url:           `${config.baseUrl}${post.url}`,
      type:          'article',
      publishedTime: post.date,
    });
    const dir = path.join(DIST, 'posts', post.slug);
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), page);
    console.log(`  ✓  /posts/${post.slug}/`);
  });

  // Index
  const indexPage = baseTemplate({
    title:       config.title,
    description: config.description,
    content:     indexTemplate(posts),
    url:         `${config.baseUrl}/`,
    type:        'website',
  });
  fs.writeFileSync(path.join(DIST, 'index.html'), indexPage);
  console.log(`  ✓  /index.html`);

  // Static pages (pages/*.md)
  if (fs.existsSync(PAGES)) {
    fs.readdirSync(PAGES).filter(f => f.endsWith('.md')).forEach(file => {
      const raw  = fs.readFileSync(path.join(PAGES, file), 'utf-8');
      const { data, content: body } = matter(raw);
      const slug = path.basename(file, '.md');
      const html = marked.parse(body);
      const page = baseTemplate({
        title:       `${data.title || slug} | ${config.title}`,
        description: data.description || '',
        content:     pageTemplate(data.title || slug, html),
        url:         `${config.baseUrl}/${slug}/`,
        type:        'website',
      });
      const dir = path.join(DIST, slug);
      fs.ensureDirSync(dir);
      fs.writeFileSync(path.join(dir, 'index.html'), page);
      console.log(`  ✓  /${slug}/`);
    });
  }

  // 404
  const notFound = baseTemplate({
    title:       `404 | ${config.title}`,
    description: 'Page not found',
    content:     notFoundTemplate(),
  });
  fs.writeFileSync(path.join(DIST, '404.html'), notFound);
  console.log(`  ✓  /404.html`);

  // Sitemap
  const pageSlugs = fs.existsSync(PAGES)
    ? fs.readdirSync(PAGES).filter(f => f.endsWith('.md')).map(f => path.basename(f, '.md'))
    : [];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(posts, pageSlugs));
  console.log(`  ✓  /sitemap.xml`);

  // robots.txt
  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${config.baseUrl}/sitemap.xml\n`;
  fs.writeFileSync(path.join(DIST, 'robots.txt'), robotsTxt);
  console.log(`  ✓  /robots.txt`);

  // RSS feed
  fs.writeFileSync(path.join(DIST, 'feed.xml'), buildRss(posts));
  console.log(`  ✓  /feed.xml`);

  console.log(`\n✨  Done in ${Date.now() - t0}ms\n`);
}

// ─── Entry point ───────────────────────────────────────────────────────────────

build();

if (process.argv.includes('--watch')) {
  const chokidar = require('chokidar');
  console.log('👁   Watching for changes… (Ctrl+C to stop)\n');
  chokidar
    .watch(['content', 'assets', 'config.js', 'build.js'], { ignoreInitial: true, cwd: ROOT })
    .on('all', (event, p) => {
      console.log(`\n📝  ${event}: ${p}`);
      try { build(); } catch (err) { console.error('Build error:', err.message); }
    });
}


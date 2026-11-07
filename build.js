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

// ─── Project reading ───────────────────────────────────────────────────────────

/** Projects shown in the site footer; set at the start of each build. */
let siteProjects = [];
/** Command palette (⌘K) items, embedded in every page; set during each build. */
let siteSearch = { icons: {}, items: [] };
/** Commit and date shown in the footer. */
let siteBuild = { sha: '', short: '', date: '' };

function readBuildInfo() {
  let sha = process.env.GITHUB_SHA || '';
  if (!sha) {
    try {
      sha = require('child_process')
        .execSync('git rev-parse HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().trim();
    } catch { /* not a git checkout */ }
  }
  return { sha, short: sha.slice(0, 7), date: new Date().toISOString().slice(0, 10) };
}

function buildSearchIndex(posts, projects) {
  const iconNames = ['search', 'home', 'grid', 'file', 'user', 'external', 'rss', 'arrow', 'enter'];
  const icons = Object.fromEntries(iconNames.map(n => [n, icon(n, 16)]));
  icons.github   = iconGithub();
  icons.linkedin = iconLinkedin();

  const items = [
    { g: 'Pages', t: 'Home',     s: 'Intro, projects and latest writing', u: '/',          i: 'home', sc: 'G H' },
    { g: 'Pages', t: 'Projects', s: 'All open-source projects',           u: '/projects/', i: 'grid', sc: 'G P' },
    { g: 'Pages', t: 'Blog',     s: 'All articles',                       u: '/blog/',     i: 'file', sc: 'G B' },
    { g: 'Pages', t: 'About me', s: `Who is ${config.author}?`,            u: '/about/',    i: 'user', sc: 'G A' },
    ...projects.map(p => ({
      g: 'Projects', t: p.name, s: p.tagline,
      u: p.hasPage ? p.pageUrl : '/projects/',
      img: p.logo ? assetUrl(p.logo) : '', a: p.accent,
      k: [p.category, p.status === 'soon' ? 'coming soon' : '', ...p.stack].join(' '),
    })),
    ...projects.filter(p => p.url).map(p => ({
      g: 'Launch', t: `Open ${p.name}`, s: hostLabel(p.url), u: p.url, x: 1, i: 'external', a: p.accent,
    })),
    ...posts.map(post => ({
      g: 'Writing', t: post.title, s: `${formatDate(post.date)} · ${post.readingTime}`,
      u: post.url, i: 'file', k: post.tags.join(' '),
    })),
    config.github   && { g: 'Links', t: 'GitHub',   s: `github.com/${config.github}`, u: `https://github.com/${config.github}`, x: 1, i: 'github' },
    config.linkedin && { g: 'Links', t: 'LinkedIn', s: `linkedin.com/in/${config.linkedin}`, u: `https://www.linkedin.com/in/${config.linkedin}`, x: 1, i: 'linkedin' },
    { g: 'Links', t: 'RSS feed', s: 'Subscribe to new articles', u: '/feed.xml', i: 'rss' },
  ].filter(Boolean);

  return { icons, items };
}

function toArray(v) {
  if (v === undefined || v === null || v === '') return [];
  return Array.isArray(v) ? v : [v];
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return '0, 212, 255';
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Inline CSS variables that tint a card or page with the project's brand colour. */
function accentStyle(p) {
  return escHtml(`--accent:${p.accent};--accent-rgb:${hexToRgb(p.accent)};--accent2:${p.accent2 || p.accent}`);
}

function hostLabel(url) {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/\/$/, '');
  } catch {
    return url;
  }
}

function assetUrl(p) {
  return '/' + String(p).replace(/^\//, '');
}

function readProjects() {
  const dir = path.join(__dirname, 'content', 'projects');
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const { data, content: body } = matter(raw);
      const slug   = data.slug || path.basename(file, '.md');
      const status = ['live', 'beta', 'soon'].includes(data.status) ? data.status : 'live';
      return {
        slug,
        name:     data.name || slug,
        order:    typeof data.order === 'number' ? data.order : 99,
        status,
        hidden:   Boolean(data.hidden),
        category: data.category || '',
        tagline:  data.tagline || '',
        summary:  data.summary || '',
        url:      data.url || '',
        urlLabel: data.urlLabel || (data.url ? hostLabel(data.url) : ''),
        repo:     data.repo || '',
        accent:   data.accent || '#00d4ff',
        accent2:  data.accent2 || '',
        logo:     data.logo || '',
        image:    data.image || '',
        stack:    toArray(data.stack).map(String),
        stats:    toArray(data.stats),
        tags:     toArray(data.tags).map(t => String(t).toLowerCase()),
        body,
        hasPage:  status !== 'soon' && body.trim().length > 0,
        pageUrl:  `/projects/${slug}/`,
        gh:       null,
      };
    })
    .filter(p => !p.hidden)
    .sort((a, b) => a.order - b.order);
}

// ─── GitHub stats (fetched at build time, cached for watch mode) ──────────────

const ghCache = new Map();

async function fetchRepoStats(repo) {
  if (!repo || process.env.SKIP_GITHUB === '1') return null;
  if (ghCache.has(repo)) return ghCache.get(repo);

  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'coderator.dev-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const stats = {
      stars:          j.stargazers_count,
      forks:          j.forks_count,
      license:        j.license && j.license.spdx_id !== 'NOASSERTION' ? j.license.spdx_id : '',
      pushedAt:       j.pushed_at,
      hasDiscussions: Boolean(j.has_discussions),
    };
    ghCache.set(repo, stats);
    return stats;
  } catch (err) {
    // Build must never fail because GitHub is slow or rate-limited.
    console.warn(`  ⚠ GitHub stats unavailable for ${repo}: ${err.message}`);
    ghCache.set(repo, null);
    return null;
  }
}

// ─── Base template ─────────────────────────────────────────────────────────────

function baseTemplate({ title, description, image = '', content, url = '', type = 'website', publishedTime = '', jsonLd: customJsonLd = null }) {
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
  if (customJsonLd) {
    jsonLd = { '@context': 'https://schema.org', ...customJsonLd, author: authorSchema };
  } else if (type === 'article') {
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

  const footerProjects = siteProjects.length
    ? `<nav class="footer-projects" aria-label="Projects">
          <span class="footer-label">projects:</span>
          ${siteProjects.map(p => p.hasPage
            ? `<a href="${p.pageUrl}" style="${accentStyle(p)}">${escHtml(p.name)}</a>`
            : `<span class="footer-soon" style="${accentStyle(p)}">${escHtml(p.name)} <em>soon</em></span>`).join('\n          ')}
        </nav>`
    : '';

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
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
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
        <button class="cmdk-trigger" id="cmdk-trigger" type="button" aria-label="Search the site" aria-keyshortcuts="Control+K Meta+K /">
          ${icon('search', 15)}<span class="cmdk-trigger-label">search</span><kbd class="cmdk-kbd">⌘K</kbd>
        </button>
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
        ${footerProjects}
        <div class="footer-social">
          ${socialLinks}
        </div>
      </div>
      <div class="footer-build">
        <span><span class="build-dot" aria-hidden="true"></span>build ${siteBuild.sha
          ? `<a href="https://github.com/${config.github}/${config.repoName}/commit/${siteBuild.sha}" target="_blank" rel="noopener">${siteBuild.short}</a>`
          : 'local'}</span>
        <span>${formatDate(siteBuild.date)}</span>
        <span>0 ads · 0 trackers</span>
        <span class="footer-kbd">press <kbd class="cmdk-kbd">⌘K</kbd> to search</span>
      </div>
    </div>
  </footer>

  <script type="application/json" id="cmdk-data">${JSON.stringify(siteSearch).replace(/</g, '\\u003c')}</script>
  <script src="/assets/js/main.js"></script>
</body>
</html>`;
}

// ─── Shared cards ──────────────────────────────────────────────────────────────

function postCard(post) {
  const imgStyle = post.image
    ? `style="background-image:url('/${post.image.replace(/^\//, '')}')"` : '';
  const imgClass = `post-card-image${post.image ? ' has-image' : ' no-image'}`;
  return `
    <article class="post-card spotlight">
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
}

function statusPill(status) {
  const map = {
    live: ['live', 'status-live'],
    beta: ['beta', 'status-beta'],
    soon: ['coming soon', 'status-soon'],
  };
  const [label, cls] = map[status] || map.live;
  return `<span class="status ${cls}">${label}</span>`;
}

/** Stars · license · last updated, from the GitHub API (omitted when unavailable). */
function repoFacts(gh, { long = false } = {}) {
  if (!gh) return '';
  return [
    typeof gh.stars === 'number' &&
      `<span title="GitHub stars">${icon('star')} ${gh.stars}${long ? ` star${gh.stars === 1 ? '' : 's'}` : ''}</span>`,
    gh.license &&
      `<span title="License">${icon('scale')} ${escHtml(gh.license)}${long ? ' license' : ''}</span>`,
    gh.pushedAt &&
      `<span>${icon('clock')} <time datetime="${gh.pushedAt}" data-relative="updated">updated ${formatDate(gh.pushedAt)}</time></span>`,
  ].filter(Boolean).join('');
}

function projectCard(p) {
  const stats = p.stats.length
    ? `<ul class="project-stats">${p.stats.slice(0, 3).map(s =>
        `<li><strong>${escHtml(s.value)}</strong><span>${escHtml(s.label)}</span></li>`).join('')}</ul>`
    : '';

  const actions = [
    p.url  && `<a class="btn-sm btn-accent" href="${escHtml(p.url)}" target="_blank" rel="noopener">${escHtml(p.urlLabel)} ${icon('external')}</a>`,
    p.repo && `<a class="btn-sm" href="https://github.com/${escHtml(p.repo)}" target="_blank" rel="noopener">${iconGithub()} source</a>`,
    p.hasPage && `<a class="btn-sm btn-details" href="${p.pageUrl}" aria-label="More about ${escHtml(p.name)}" title="More about ${escHtml(p.name)}">${icon('arrow')}</a>`,
  ].filter(Boolean).join('\n            ');

  const img = p.image ? `<img src="${assetUrl(p.image)}" alt="" loading="lazy" width="1200" height="630">` : '';
  const cover = !p.image ? ''
    : p.hasPage
      ? `<a class="project-cover" href="${p.pageUrl}" tabindex="-1" aria-hidden="true">${img}</a>`
      : `<div class="project-cover">${img}</div>`;

  const facts = repoFacts(p.gh);

  return `
      <article class="project-card spotlight" style="${accentStyle(p)}">
        ${cover}
        <div class="project-card-body">
          <header class="project-head">
            ${p.logo ? `<img class="project-logo" src="${assetUrl(p.logo)}" alt="" width="40" height="40">` : ''}
            <div class="project-head-text">
              <h3 class="project-name">${p.hasPage ? `<a href="${p.pageUrl}">${escHtml(p.name)}</a>` : escHtml(p.name)}</h3>
              <p class="project-category">${escHtml(p.category)}</p>
            </div>
            ${statusPill(p.status)}
          </header>
          <p class="project-tagline">${escHtml(p.tagline)}</p>
          <p class="project-summary">${escHtml(p.summary)}</p>
          ${stats}
          ${facts ? `<div class="project-meta">${facts}</div>` : ''}
          <div class="project-actions">
            ${actions}
          </div>
        </div>
      </article>`;
}

/** Little animated "requests flowing through a system" diagram for the ArchSim teaser. */
function teaserFlowSvg() {
  const node = (x, y, label) =>
    `<g class="tf-node"><rect x="${x}" y="${y}" width="44" height="26" rx="6"/><text x="${x + 22}" y="${y + 16.5}">${label}</text></g>`;
  const paths = {
    a: 'M52 60 H104',
    b: 'M148 60 C170 60 170 30 192 30',
    c: 'M148 60 C170 60 170 90 192 90',
    d: 'M236 30 C256 30 256 60 276 60',
    e: 'M236 90 C256 90 256 60 276 60',
  };
  const lines = Object.entries(paths).map(([k, d]) => `<path id="tf-${k}" class="tf-link" d="${d}"/>`).join('');
  const packets = Object.keys(paths).flatMap((k, i) => [0, 1].map(j => {
    const begin = (i * 0.35 + j * 0.9).toFixed(2);
    return `<circle class="tf-pkt${(i + j) % 2 ? ' alt' : ''}" r="2.6"><animateMotion dur="1.8s" begin="${begin}s" repeatCount="indefinite"><mpath href="#tf-${k}"/></animateMotion></circle>`;
  })).join('');
  return `<svg class="teaser-flow" viewBox="0 0 328 120" aria-hidden="true">${lines}${packets}${
    node(8, 47, 'clients')}${node(104, 47, 'lb')}${node(192, 17, 'api')}${node(192, 77, 'api')}${node(276, 47, 'db')}</svg>`;
}

function projectTeaser(p) {
  const chips = p.stack.length
    ? `<div class="stack-list">${p.stack.map(s => `<span class="chip">${escHtml(s)}</span>`).join('')}</div>`
    : '';
  return `
      <article class="project-teaser" style="${accentStyle(p)}">
        <div class="project-teaser-inner spotlight">
          ${p.logo ? `<img class="teaser-logo" src="${assetUrl(p.logo)}" alt="" width="64" height="64">` : ''}
          <div class="teaser-text">
            <div class="teaser-title-row">
              <h3 class="project-name">${escHtml(p.name)}</h3>
              ${statusPill(p.status)}
            </div>
            <p class="teaser-tagline">${escHtml(p.tagline)}</p>
            <p class="project-summary">${escHtml(p.summary)}</p>
            ${chips}
          </div>
          ${teaserFlowSvg()}
        </div>
      </article>`;
}

function principlesHtml() {
  const list = (config.portal && config.portal.principles) || [];
  if (!list.length) return '';
  return `
      <ul class="principles" aria-label="What all projects have in common">
        ${list.map(x => `<li class="principle spotlight">
          <span class="principle-icon">${icon(x.icon, 18)}</span>
          <div><h3>${escHtml(x.title)}</h3><p>${escHtml(x.text)}</p></div>
        </li>`).join('\n        ')}
      </ul>`;
}

/** Live project grid, then "coming soon" teasers, then shared principles. */
function projectsBlock(projects) {
  const live = projects.filter(p => p.status !== 'soon');
  const soon = projects.filter(p => p.status === 'soon');
  return `
      <div class="projects-grid">${live.map(projectCard).join('')}
      </div>
      ${soon.map(projectTeaser).join('')}
      ${principlesHtml()}`;
}

function terminalBar(title) {
  return `<div class="terminal-titlebar">
          <div class="terminal-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <span class="terminal-title">${title}</span>
          <div class="terminal-dots-spacer"></div>
        </div>`;
}

/** Numbered eyebrow + headline + optional subline and link, used for homepage sections. */
function sectionHead({ num, eyebrow, title, sub = '', link = null }) {
  return `<header class="section-head">
        <div>
          <p class="eyebrow"><span class="eyebrow-num">${escHtml(num)}</span>${escHtml(eyebrow)}</p>
          <h2 class="section-headline">${escHtml(title)}</h2>
          ${sub ? `<p class="section-sub">${escHtml(sub)}</p>` : ''}
        </div>
        ${link ? `<a href="${link.href}" class="section-link">${escHtml(link.label)} ${icon('arrow')}</a>` : ''}
      </header>`;
}

// ─── Index (portal) template ───────────────────────────────────────────────────

function indexTemplate(posts, projects) {
  const P = config.portal || {};
  const live = projects.filter(p => p.status !== 'soon');
  const soon = projects.filter(p => p.status === 'soon');

  const lsRow = projects.map(p => {
    const label = `${escHtml(p.slug)}/`;
    return `<span class="t-ls" style="${accentStyle(p)}">${p.hasPage ? `<a href="${p.pageUrl}">${label}</a>` : `${label}<span class="t-dim"> wip</span>`}</span>`;
  }).join('');

  const gitLogLines = posts.slice(0, 3).map(p => {
    const shortTitle = p.title.length > 40 ? p.title.slice(0, 40) + '…' : p.title;
    return `          <p class="t-out"><span class="t-yellow">${fakeHash(p.slug)}</span> <a class="t-link" href="${p.url}">${escHtml(shortTitle)}</a></p>`;
  }).join('\n');

  const social = [
    config.github   && `<a class="btn-sm" href="https://github.com/${config.github}" target="_blank" rel="noopener">${iconGithub()} GitHub</a>`,
    config.linkedin && `<a class="btn-sm" href="https://www.linkedin.com/in/${config.linkedin}" target="_blank" rel="noopener">${iconLinkedin()} LinkedIn</a>`,
  ].filter(Boolean).join('\n            ');

  const firstName = config.author.split(' ')[0];

  const starred = projects.filter(p => p.gh && typeof p.gh.stars === 'number');
  const totalStars = starred.reduce((n, p) => n + p.gh.stars, 0);
  const stats = [
    P.yearsExperience && [P.yearsExperience, 'years shipping software'],
    [String(live.length), `project${live.length === 1 ? '' : 's'} live`],
    starred.length && [`★ ${totalStars}`, 'GitHub stars'],
    [String(posts.length), `article${posts.length === 1 ? '' : 's'}`],
  ].filter(Boolean);

  const pill = soon.length
    ? `${live.length} projects live <span class="pill-sep" aria-hidden="true"></span> <span class="pill-soon">${escHtml(soon.map(p => p.name).join(', '))} in the lab</span>`
    : `${live.length} projects live`;

  return `
  <section class="hero hero-portal">
    <div class="container hero-grid">
      <div class="hero-copy">
        <a href="#projects" class="hero-pill"><span class="pill-dot" aria-hidden="true"></span>${pill} ${icon('arrow', 14)}</a>
        <p class="hero-greeting"><span class="t-prompt">❯</span>${escHtml(P.greeting || "hi, I'm")}</p>
        <h1 class="hero-name">${escHtml(config.author)}<span class="hero-dot">.</span></h1>
        <p class="hero-role">${escHtml(P.role || config.tagline)}</p>
        <p class="hero-intro">${escHtml(P.intro || config.description)}</p>
        <div class="hero-actions">
          <a href="#projects" class="btn btn-primary">${icon('grid')} explore projects</a>
          <a href="/blog/" class="btn">read the blog</a>
          <button type="button" class="btn btn-ghost hero-kbd" data-cmdk-open>or press <kbd class="cmdk-kbd">⌘K</kbd></button>
        </div>
        <dl class="hero-stats">
          ${stats.map(([v, l]) => `<div><dt>${escHtml(l)}</dt><dd>${escHtml(v)}</dd></div>`).join('\n          ')}
        </dl>
      </div>
      <div class="hero-side">
        <div class="pixel-title-wrap">
          <canvas id="pixel-title" role="img" aria-label="coderator.dev"></canvas>
        </div>
      <div class="terminal-window hero-terminal">
        ${terminalBar(`${escHtml(firstName.toLowerCase())}@coderator — zsh`)}
        <div class="terminal-body hero-terminal-body">
          <p><span class="t-prompt">❯</span> <span class="t-cmd">whoami</span></p>
          <p class="t-out">${escHtml(config.author)} <span class="t-dim">// ${escHtml(config.tagline)}</span></p>
          <p><span class="t-prompt">❯</span> <span class="t-cmd">ls ~/projects</span></p>
          <p class="t-out t-ls-row">${lsRow}</p>
          <p><span class="t-prompt">❯</span> <span class="t-cmd">git log --oneline -${Math.min(3, posts.length)} posts/</span></p>
${gitLogLines}
          <p><span class="t-prompt">❯</span> <span class="cursor-blink">▋</span></p>
        </div>
      </div>
      </div>
    </div>
  </section>

  <section class="projects-section" id="projects">
    <div class="container">
      ${sectionHead({
        num: '01', eyebrow: 'open source',
        title: 'Things I build in the open.',
        sub: `${live.length} live${soon.length ? ` · ${soon.length} in the lab` : ''} · free, fast, and nothing tracking you.`,
        link: { href: '/projects/', label: 'all projects' },
      })}
      ${projectsBlock(projects)}
    </div>
  </section>

  <section class="posts-section">
    <div class="container">
      ${sectionHead({
        num: '02', eyebrow: 'writing',
        title: 'Notes on Java, design and craft.',
        sub: 'Long-form deep dives, written to save you an hour of confusion.',
        link: { href: '/blog/', label: 'all posts' },
      })}
      <div class="posts-grid">${posts.slice(0, 3).map(postCard).join('')}
      </div>
    </div>
  </section>

  <section class="about-strip-section">
    <div class="container">
      <div class="about-strip spotlight">
        <img src="/assets/images/avatar.png" alt="${escHtml(config.author)}" class="about-strip-avatar" width="112" height="112" loading="lazy">
        <div class="about-strip-text">
          <p class="eyebrow"><span class="eyebrow-num">03</span>about</p>
          <h2 class="section-headline section-headline--sm">The person behind the terminal.</h2>
          <p>${escHtml(P.aboutBlurb || config.description)}</p>
          <div class="about-strip-actions">
            <a class="btn-sm btn-accent" href="/about/">more about me ${icon('arrow')}</a>
            ${social}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

// ─── Listing templates (/projects/, /blog/) ────────────────────────────────────

function listingHero(cmd, intro) {
  return `
  <section class="listing-hero">
    <div class="container">
      <h1 class="post-title page-cmd-title"><span class="t-prompt">❯</span> <span class="t-cmd">${escHtml(cmd)}</span><span class="cursor-blink">▋</span></h1>
      <p class="listing-intro">${intro}</p>
    </div>
  </section>`;
}

function projectsIndexTemplate(projects) {
  return `${listingHero('ls ~/projects',
    'Open-source things I build and run. Every one is free, has no ads or trackers, and lives on GitHub. ' +
    'Pick one to see what it does and how it’s built.')}

  <section class="projects-section projects-section--page">
    <div class="container">
      ${projectsBlock(projects)}
      <p class="listing-more">More experiments live on
        <a href="https://github.com/${config.github}?tab=repositories" target="_blank" rel="noopener">GitHub ${icon('external')}</a>
      </p>
    </div>
  </section>`;
}

function blogIndexTemplate(posts) {
  return `${listingHero('ls posts/',
    `Long-form writing on Java, Spring Boot, design patterns and the craft of software.
      <a class="listing-rss" href="/feed.xml">${icon('rss')} RSS feed</a>`)}

  <section class="posts-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title"><span class="section-title-prompt">//</span> all posts</h2>
        <span class="post-count">${posts.length} article${posts.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="posts-grid">${posts.map(postCard).join('')}
      </div>
    </div>
  </section>`;
}

// ─── Project page template ─────────────────────────────────────────────────────

function projectTemplate(p, htmlContent, related, prevProject, nextProject) {
  const repoUrl = p.repo ? `https://github.com/${p.repo}` : '';
  const visitLabel = p.urlLabel === hostLabel(p.url) ? `visit ${p.urlLabel}` : p.urlLabel;

  const actions = [
    p.url   && `<a class="btn btn-accent" href="${escHtml(p.url)}" target="_blank" rel="noopener">${escHtml(visitLabel)} ${icon('external')}</a>`,
    repoUrl && `<a class="btn" href="${repoUrl}" target="_blank" rel="noopener">${iconGithub()} view source</a>`,
  ].filter(Boolean).join('\n            ');

  const facts = repoFacts(p.gh, { long: true });

  const shot = p.image
    ? `<figure class="browser-frame">
          <div class="browser-bar">
            <div class="terminal-dots"><span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span></div>
            <span class="browser-url">${escHtml(p.url ? hostLabel(p.url) : p.name)}</span>
          </div>
          <img src="${assetUrl(p.image)}" alt="${escHtml(p.name)}: ${escHtml(p.tagline)}" width="1200" height="630">
        </figure>`
    : '';

  const statsCard = p.stats.length ? `
        <div class="aside-card spotlight">
          <h2 class="aside-title">at a glance</h2>
          <ul class="aside-stats">
            ${p.stats.map(s => `<li><strong>${escHtml(s.value)}</strong><span>${escHtml(s.label)}</span></li>`).join('\n            ')}
          </ul>
        </div>` : '';

  const stackCard = p.stack.length ? `
        <div class="aside-card spotlight">
          <h2 class="aside-title">built with</h2>
          <div class="stack-list">${p.stack.map(s => `<span class="chip">${escHtml(s)}</span>`).join('')}</div>
        </div>` : '';

  const links = [
    p.url   && [icon('globe'), 'Live site', p.url],
    repoUrl && [iconGithub(), 'Source code', repoUrl],
    repoUrl && [icon('issue'), 'Issues', `${repoUrl}/issues`],
    repoUrl && p.gh && p.gh.hasDiscussions && [icon('chat'), 'Discussions', `${repoUrl}/discussions`],
    repoUrl && [icon('commit'), 'Recent commits', `${repoUrl}/commits`],
  ].filter(Boolean);
  const linksCard = links.length ? `
        <div class="aside-card spotlight">
          <h2 class="aside-title">links</h2>
          <ul class="aside-links">
            ${links.map(([ic, label, href]) => `<li><a href="${escHtml(href)}" target="_blank" rel="noopener">${ic}<span>${label}</span></a></li>`).join('\n            ')}
          </ul>
        </div>` : '';

  const relatedHtml = related.length ? `
    <section class="related-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title"><span class="section-title-prompt">//</span> writing about ${escHtml(p.name)}</h2>
        </div>
        <div class="posts-grid">${related.map(postCard).join('')}</div>
      </div>
    </section>` : '';

  const navLink = (proj, dir) => proj
    ? `<a href="${proj.pageUrl}" class="post-nav-link ${dir}" style="${accentStyle(proj)}">
        <span class="nav-arrow">${dir === 'prev' ? '←' : '→'}</span>
        <span class="nav-label">${dir === 'prev' ? 'Previous project' : 'Next project'}</span>
        <span class="nav-title">${escHtml(proj.name)}</span>
      </a>`
    : '<span></span>';

  return `
  <article class="project-page" style="${accentStyle(p)}">
    <header class="project-hero">
      <div class="container">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/">~</a><span>/</span><a href="/projects/">projects</a><span>/</span><span class="crumb-current">${escHtml(p.slug)}</span>
        </nav>
        <div class="project-hero-grid">
          <div class="project-hero-copy">
            <div class="project-title-row">
              ${p.logo ? `<img src="${assetUrl(p.logo)}" alt="" width="64" height="64">` : ''}
              <div>
                <h1 class="project-title">${escHtml(p.name)}</h1>
                <p class="project-category">${escHtml(p.category)} ${statusPill(p.status)}</p>
              </div>
            </div>
            <p class="project-hero-tagline">${escHtml(p.tagline)}</p>
            <p class="project-hero-summary">${escHtml(p.summary)}</p>
            <div class="hero-actions">
            ${actions}
            </div>
            ${facts ? `<div class="repo-facts">${facts}</div>` : ''}
          </div>
          ${shot}
        </div>
      </div>
    </header>

    <div class="container project-body">
      <div class="post-content">
        ${htmlContent}
      </div>
      <aside class="project-aside">${statsCard}${stackCard}${linksCard}
      </aside>
    </div>
    ${relatedHtml}
    <nav class="post-navigation" aria-label="Project navigation">
      <div class="container">
        ${navLink(prevProject, 'prev')}
        ${navLink(nextProject, 'next')}
      </div>
    </nav>
  </article>`;
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

/** Small stroke icons (24×24 grid). */
const ICONS = {
  search:   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  home:     '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  file:     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  user:     '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  enter:    '<path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
  star:    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
  arrow:    '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  scale:    '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M3 7h18"/><path d="M6 7l-3 7a3.5 3.5 0 0 0 6 0z"/><path d="M18 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
  grid:     '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  rss:      '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  'eye-off':'<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/>',
  code:     '<path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/>',
  bolt:     '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  lock:     '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  issue:    '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  chat:     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  commit:   '<circle cx="12" cy="12" r="3"/><path d="M3 12h6"/><path d="M15 12h6"/>',
  globe:    '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};

function icon(name, size = 16) {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}


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

function buildSitemap(posts, pageSlugs, projects = []) {
  const now = new Date().toISOString().slice(0, 10);
  const entry = (loc, lastmod, changefreq, priority) =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const staticUrls = [
    entry(`${config.baseUrl}/`, now, 'weekly', '1.0'),
    entry(`${config.baseUrl}/projects/`, now, 'weekly', '0.9'),
    entry(`${config.baseUrl}/blog/`, now, 'weekly', '0.8'),
    ...projects.filter(p => p.hasPage).map(p => entry(`${config.baseUrl}${p.pageUrl}`, now, 'weekly', '0.9')),
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

function writePage(relDir, html) {
  const dir = path.join(DIST, relDir);
  fs.ensureDirSync(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`  ✓  /${relDir ? relDir.replace(/\\/g, '/') + '/' : ''}`);
}

async function build() {
  const t0 = Date.now();
  console.log('\n⚡  Building coderator.dev…\n');

  // Projects + live GitHub stats (fetched before we touch dist/)
  const projects = readProjects();
  await Promise.all(projects.map(async p => { p.gh = await fetchRepoStats(p.repo); }));
  siteProjects = projects;
  siteBuild    = readBuildInfo();

  fs.emptyDirSync(DIST);

  // Copy static assets
  if (fs.existsSync(ASSETS)) fs.copySync(ASSETS, path.join(DIST, 'assets'));
  copyHighlightCss();
  ['CNAME', 'favicon.ico'].forEach(f => {
    if (fs.existsSync(path.join(ROOT, f))) fs.copySync(path.join(ROOT, f), path.join(DIST, f));
  });

  // Posts
  const posts = readPosts();
  siteSearch = buildSearchIndex(posts, projects);
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

  // Index (portal)
  const indexPage = baseTemplate({
    title:       `${config.author} · ${config.title}`,
    description: config.description,
    content:     indexTemplate(posts, projects),
    url:         `${config.baseUrl}/`,
    type:        'website',
  });
  fs.writeFileSync(path.join(DIST, 'index.html'), indexPage);
  console.log(`  ✓  /index.html`);

  // Blog listing
  writePage('blog', baseTemplate({
    title:       `Blog | ${config.title}`,
    description: 'Articles on Java, Spring Boot, design patterns and software craftsmanship.',
    content:     blogIndexTemplate(posts),
    url:         `${config.baseUrl}/blog/`,
  }));

  // Projects listing
  writePage('projects', baseTemplate({
    title:       `Open-source projects | ${config.title}`,
    description: `Open-source projects by ${config.author}: ${projects.map(p => p.name).join(', ')}.`,
    content:     projectsIndexTemplate(projects),
    url:         `${config.baseUrl}/projects/`,
  }));

  // Project pages
  const withPages = projects.filter(p => p.hasPage);
  withPages.forEach((p, i) => {
    const related = posts.filter(post => post.tags.some(t => p.tags.includes(String(t).toLowerCase())));
    const canonical = `${config.baseUrl}${p.pageUrl}`;
    writePage(path.join('projects', p.slug), baseTemplate({
      title:       `${p.name}: ${p.tagline} | ${config.title}`,
      description: p.summary,
      image:       p.image,
      content:     projectTemplate(p, marked.parse(p.body), related, withPages[i - 1] || null, withPages[i + 1] || null),
      url:         canonical,
      jsonLd: {
        '@type':               'SoftwareApplication',
        name:                  p.name,
        description:           p.summary,
        url:                   p.url || canonical,
        ...(p.image ? { image: `${config.baseUrl}${assetUrl(p.image)}` } : {}),
        applicationCategory:   'WebApplication',
        operatingSystem:       'Any (web browser)',
        offers:                { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        ...(p.repo ? { sameAs: [`https://github.com/${p.repo}`] } : {}),
      },
    }));
  });

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
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(posts, pageSlugs, projects));
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

build()
  .then(() => {
    if (!process.argv.includes('--watch')) return;
    const chokidar = require('chokidar');
    console.log('👁   Watching for changes… (Ctrl+C to stop)\n');
    chokidar
      .watch(['content', 'assets', 'config.js', 'build.js'], { ignoreInitial: true, cwd: ROOT })
      .on('all', (event, p) => {
        console.log(`\n📝  ${event}: ${p}`);
        build().catch(err => console.error('Build error:', err.message));
      });
  })
  .catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });


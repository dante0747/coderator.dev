# coderator.dev

Personal tech blog about Java, Spring Boot, design patterns, and software craftsmanship.  
Built with a zero-dependency custom static site generator.

## Quick start

```bash
npm install       # first time only
npm run build     # generate dist/
npm run preview   # build + serve at http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run build` | One-shot build → `dist/` |
| `npm run dev` | Watch mode — rebuilds on any change |
| `npm run serve` | Serve `dist/` at http://localhost:3000 (run build first) |
| `npm run preview` | Build + serve in one step |

## Writing a new post

1. Create `content/posts/YYYY-MM-DD-your-slug.md`
2. Add frontmatter:

```yaml
---
title: "Your Post Title"
date: 2026-04-14
tags: [java, spring boot]
image: assets/images/cover.jpg   # optional
description: "One-line summary shown in the post card."
---

Your content here…
```

3. Run `npm run build` (or let `npm run dev` pick it up automatically)

## Project structure

```
content/
  posts/          ← blog posts (markdown)
  pages/          ← static pages (about, etc.)
assets/
  css/style.css   ← dark theme
  js/main.js      ← scroll bar, copy-code, mobile nav
  images/         ← images referenced by posts
scripts/
  build.cmd       ← build shortcut (works without npm in PATH)
  preview.cmd     ← build + serve shortcut
build.js          ← static site generator
serve.js          ← local dev server
config.js         ← site metadata (title, author, nav, social links)
dist/             ← generated output (gitignored)
```

## Deploying to GitHub Pages

Push to `main` or `master` — the GitHub Actions workflow in
`.github/workflows/deploy.yml` will build and deploy automatically.

**One-time setup** in the repository settings:
1. Go to **Settings → Pages**
2. Under *Build and deployment*, set **Source** to **GitHub Actions**

That's it. Every push to `main` triggers a fresh build and deploy.


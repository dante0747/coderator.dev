# coderator.dev

Personal site of Majid Abarghooei: an introduction, a portal to my open-source projects
(GameBeeper, GeeksPulse, SpecLift, and soon ArchSim), and a blog about Java, Spring Boot,
design patterns and software craftsmanship.  
Built with a custom static site generator.

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

## Adding or updating a project

Each project is one file in `content/projects/`. The filename is the URL slug
(`content/projects/speclift.md` → `/projects/speclift/`).

```yaml
---
name: SpecLift
order: 3                      # position on the homepage
status: live                  # live | beta | soon ("soon" = teaser card, no page)
hidden: false                 # true removes it from the site
category: Swagger → OpenAPI converter
tagline: "Short, punchy one-liner."
summary: "Two sentences for the card and the page header."
url: https://example.com/     # live site (optional)
urlLabel: open converter      # button text (defaults to the domain)
repo: dante0747/spec-lift     # GitHub repo, used for stars/license/updated
accent: "#FF7A55"             # brand colour that tints the card and page
logo: assets/images/projects/speclift-logo.svg
image: assets/images/projects/speclift-cover.jpg   # 1200×630 works best
stack: [TypeScript, React]
stats:
  - { value: "99/99", label: "APIs match Swagger" }
tags: [speclift]              # blog posts with these tags show up on the project page
---

Markdown for the project page (## headings, lists, tables…).
```

Stars, license and last-updated dates come from the GitHub API at build time.
Set `SKIP_GITHUB=1` to build offline. The deploy workflow also rebuilds daily so
those numbers stay fresh.

Homepage text (greeting, role, intro, about blurb, shared principles) lives in
`config.js` under `portal`.

## Project structure

```
content/
  posts/          ← blog posts (markdown)
  pages/          ← static pages (about, etc.)
  projects/       ← one markdown file per open-source project
assets/
  css/style.css   ← dark theme
  js/main.js      ← scroll bar, copy-code, mobile nav
  images/         ← images referenced by posts
  images/projects ← project logos and preview images
  brand/          ← {c} logo sources (SVG); `npm i --no-save sharp && npm run icons`
                    regenerates favicon.ico/.svg, apple-touch-icon.png, assets/icons/
                    and site.webmanifest after a logo change
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


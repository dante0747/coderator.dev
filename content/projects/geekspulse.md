---
name: GeeksPulse
order: 2
status: live
category: developer news aggregator
tagline: "Developer news, minus the noise."
summary: "Your daily dev briefing from 51 hand-picked feeds: Hacker News, security, AI, Java, Rust, Go, DevOps and architecture, in one fast reader with no ads and no paywalls."
url: https://geekspulse.dev/
repo: dante0747/geekspulse.dev
accent: "#FFB224"
logo: assets/images/projects/geekspulse-logo.png
image: assets/images/projects/geekspulse-cover.jpg
stack: [Vanilla JS, Vite, Node.js, Vitest, Playwright, GitHub Actions]
stats:
  - { value: "51", label: "RSS feeds" }
  - { value: "11", label: "categories" }
  - { value: "0", label: "paywalls" }
tags: [geekspulse]
---

## What it is

GeeksPulse is a developer news reader. It gathers 51 hand-picked RSS feeds, from Hacker News and
Lobsters to Krebs on Security, the GitHub Blog and language blogs, and shows them newest first in
a calm, editorial layout. No doomscrolling required.

Topics: **general, security, AI, Python, JavaScript, Java, DevOps, open source, Rust, Go and
architecture**.

## Highlights

- **New since your last visit.** Stories you haven't seen yet are marked *New*.
- **AI summaries on demand.** Pre-cached snippets, with a local Ollama fallback.
- **Light and dark themes.** Follows your OS by default, with no flash on load.
- **Shareable views.** `?q=` search, `?topic=` and `?source=` filters are plain URLs.
- **Keyboard shortcuts.** `/` search, `j`/`k` navigate, `o` open, `b` save, `?` for help.
- **Accessible.** WCAG AA contrast in both themes, focus-trapped dialogs and reduced-motion support.

## Under the hood

A scheduled Node.js pipeline fetches every feed, normalises it and writes static JSON. The site
itself is vanilla HTML, CSS and JavaScript built with Vite, and it's tested with Vitest and
Playwright. The same pipeline later became the engine behind [GameBeeper](/projects/gamebeeper/).

## Get involved

Know a feed that belongs here? Suggest it in
[Discussions](https://github.com/dante0747/geekspulse.dev/discussions) or
[open an issue](https://github.com/dante0747/geekspulse.dev/issues). The project is MIT licensed.

---
name: GameBeeper
order: 1
status: live
category: video game news aggregator
tagline: "Gaming news, minus the noise."
summary: "One fast, clean feed of video game news from 34 trusted sources: PlayStation, Xbox, Nintendo, PC, indie, reviews and trailers. No ads, no trackers, no paywalls."
url: https://gamebeeper.gg/
repo: dante0747/gamebeeper.gg
accent: "#C8FF3D"
logo: assets/images/projects/gamebeeper-logo.svg
image: assets/images/projects/gamebeeper-cover.jpg
stack: [Vanilla JS, Vite, Node.js, Vitest, GitHub Actions]
stats:
  - { value: "34", label: "RSS feeds" }
  - { value: "11", label: "categories" }
  - { value: "0", label: "ads" }
tags: [gamebeeper]
---

## What it is

GameBeeper pulls video game news from 34 RSS feeds across 27 hand-picked outlets (official
platform blogs, independent sites and industry reporters) and shows it as one feed, newest first.
There's no algorithm deciding what you see, and every headline links straight to the publisher.

It covers **PlayStation, Xbox, Nintendo, PC gaming, indie, reviews, trailers and reveals, esports,
industry and hardware**.

## Highlights

- **Arcade broadcast look.** Poster-style type, LED scoreboard stats, a headline ticker and
  console-style topic tabs.
- **AI summaries on demand.** Pre-cached snippets, with a local Ollama fallback.
- **Keyboard first.** `/` to search, `[` and `]` to switch topics, `j`/`k` to move, `o` to open,
  and one classic cheat code.
- **Bookmarks, grid or list view, auto-refresh.** Your preferences stay in your browser.
- **Accessible.** Keyboard navigation, focus-trapped dialogs, a pausable ticker and
  `prefers-reduced-motion` support. axe-core reports no issues at desktop or mobile widths.

## Under the hood

A scheduled Node.js pipeline fetches and normalises the feeds into static JSON. The frontend is
plain HTML, CSS and JavaScript built with Vite, so pages load from a cache instead of waiting on 34
servers. There's no application server to run.

GameBeeper started as a fork of [GeeksPulse](/projects/geekspulse/), with the same pipeline
pointed at games instead of code.

## Get involved

Missing a favourite outlet, or found a bug? [Open an issue](https://github.com/dante0747/gamebeeper.gg/issues)
or send a pull request. The project is MIT licensed.

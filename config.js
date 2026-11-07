/** @type {SiteConfig} */
module.exports = {
  title: 'coderator.dev',
  description: 'Open-source projects and writing by Majid Abarghooei: GameBeeper, GeeksPulse, SpecLift, and articles on Java, Spring Boot and software design.',
  tagline: 'software engineer & open-source builder',

  /** Homepage copy. Edit freely; plain text only. */
  portal: {
    greeting: "hi, I'm",
    /** Shown in the homepage stats row. */
    yearsExperience: '15+',
    /** Shown under your name, in the accent gradient. */
    role: 'Software engineer. Open-source builder.',
    intro: "15+ years of building software, with a soft spot for architecture and design. " +
           'These days I build small, fast, open-source tools — news readers with no ads or trackers, ' +
           'a converter that never uploads your data, and soon a flight simulator for your architecture — ' +
           'and write about Java, Spring Boot and the craft of software.',
    /** Short about-me blurb near the bottom of the homepage; links to /about/. */
    aboutBlurb: "I've worn a few hats over the years: developer, chapter lead, and the person who asks " +
                '"but why are we doing it this way?" in design meetings. I care about how systems are ' +
                'structured, why patterns exist, and what makes a codebase a pleasure to work in.',
    /** Shared values shown under the project grid. */
    principles: [
      /* icon: one of eye-off | code | bolt | lock */
      { icon: 'eye-off', title: 'No ads, no trackers', text: 'Nothing watches you read, convert or browse.' },
      { icon: 'code',    title: 'Open source',         text: 'Permissive licenses. Read the code, fork it, send a PR.' },
      { icon: 'bolt',    title: 'Static and fast',     text: 'Plain HTML, CSS and JS. No servers to wait on.' },
      { icon: 'lock',    title: 'Private by design',   text: 'Your data stays in your browser.' },
    ],
  },
  author: 'Majid Abarghooei',
  baseUrl: 'https://coderator.dev',
  /** GitHub username — used for social link and footer repo link */
  github: 'dante0747',
  repoName: 'coderator.dev',
  twitter: '',
  linkedin: 'majidabarghooei',
  nav: [
    { label: 'home',     url: '/' },
    { label: 'projects', url: '/projects/' },
    { label: 'blog',     url: '/blog/' },
    { label: 'about',    url: '/about/' },
    { label: 'github', url: 'https://github.com/dante0747', external: true },
  ],

  /**
   * Comments + reactions via Giscus (GitHub Discussions).
   * Reactions (❤️ 👍 🎉 …) are tied to GitHub accounts — truly one per user.
   *
   * Setup: Enable Discussions on the repo → install https://github.com/apps/giscus
   * Set provider to 'none' to disable.
   */
  comments: {
    provider:   'giscus',
    repo:       'dante0747/coderator.dev',
    repoId:     'MDEwOlJlcG9zaXRvcnkyNTQ3MDU2OTM=',
    category:   'Announcements',
    categoryId: 'DIC_kwDODy6AHc4C61iP',
    mapping:    'pathname',
    theme:      'preferred_color_scheme',
  },
};

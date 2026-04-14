/** @type {SiteConfig} */
module.exports = {
  title: 'coderator.dev',
  description: 'Writing about Java, Spring Boot, design patterns, and software craftsmanship.',
  tagline: 'software engineer & tech writer',
  author: 'Majid Abarghooei',
  baseUrl: 'https://coderator.dev',
  /** GitHub username — used for social link and footer repo link */
  github: 'dante0747',
  repoName: 'coderator.dev',
  twitter: '',
  linkedin: 'majidabarghooei',
  nav: [
    { label: 'home',  url: '/' },
    { label: 'about', url: '/about/' },
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

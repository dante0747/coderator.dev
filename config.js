/** @type {SiteConfig} */
module.exports = {
  title: 'coderator.dev',
  /** Default meta description (homepage, RSS); keep it under ~155 characters for search results. */
  description: 'Software engineer Majid Abarghooei: open-source projects (GameBeeper, GeeksPulse, SpecLift) and writing on Java, Spring Boot and software design.',
  tagline: 'software engineer',

  /** Used in search-engine structured data (schema.org Person). */
  jobTitle: 'Software Engineer',
  personDescription: 'Software engineer with 16+ years of experience in software architecture and design, ' +
                     'and creator of the open-source projects GameBeeper, GeeksPulse and SpecLift.',
  knowsAbout: ['Software architecture', 'Software design', 'Design patterns', 'Java', 'Spring Boot',
               'Distributed systems', 'Open source'],

  /** Homepage copy. Edit freely; plain text only. */
  portal: {
    greeting: "hi, I'm",
    /** Shown in the homepage stats row. */
    yearsExperience: '16+',
    /** Shown under your name, in the accent gradient. */
    role: 'Software engineer.',
    /** Same as the short bio on my GitHub Sponsors profile. */
    intro: 'Code, coffee, video games & music. My whole life in a nutshell :)',
    /** Line after the intro that links to the about page. */
    introMore: { text: 'Want to know more?', label: 'Read about me', href: '/about/' },
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

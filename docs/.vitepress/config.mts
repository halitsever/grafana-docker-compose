import { defineConfig } from 'vitepress'

const site = 'https://halitsever.github.io/grafana-docker-compose/'
const name = 'grafana-docker-compose'
const homeTitle = 'Grafana Docker Compose stack with Prometheus'
const description =
  'A Grafana Docker Compose stack with Prometheus, Alertmanager, Node Exporter and cAdvisor. Ships with a provisioned dashboard and eight alert rules.'

const repo = 'https://github.com/halitsever/grafana-docker-compose'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  '@id': `${site}#source`,
  name,
  description,
  url: site,
  image: `${site}og.png`,
  codeRepository: repo,
  programmingLanguage: 'YAML',
  runtimePlatform: 'Docker Compose',
  license: 'https://opensource.org/licenses/MIT',
  author: { '@type': 'Person', name: 'Halit Sever', url: 'https://github.com/halitsever' },
}

export default defineConfig({
  /** keeps the page hash map out of every page's HTML, which Semrush reads as a low text-to-HTML ratio */
  metaChunk: true,
  base: '/grafana-docker-compose/',
  lang: 'en',
  title: name,
  titleTemplate: ':title | Grafana Docker stack',
  description,
  cleanUrls: true,
  appearance: 'force-dark',
  lastUpdated: false,
  sitemap: { hostname: site },

  head: [
    /** Cloudflare Web Analytics, one token for every page on halitsever.github.io. */
    ['script', { defer: '', src: 'https://static.cloudflareinsights.com/beacon.min.js', 'data-cf-beacon': '{"token": "dd7e54d3f48841c187d72d9dbb92a6b6"}' }],
    ['link', { rel: 'icon', href: '/grafana-docker-compose/favicon.png', sizes: '32x32', type: 'image/png' }],
    ['link', { rel: 'icon', href: '/grafana-docker-compose/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#101216' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: name }],
    ['meta', { property: 'og:image', content: `${site}og.png` }],
    ['meta', { property: 'og:image:width', content: '1280' }],
    ['meta', { property: 'og:image:height', content: '640' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${site}og.png` }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)],
  ],

  transformPageData(pageData) {
    const isHome = pageData.relativePath === 'index.md'
    const title = pageData.frontmatter.title ?? pageData.title
    const url = site + pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: isHome ? homeTitle : `${title} | Grafana Docker stack` }],
      ['meta', { property: 'og:description', content: pageData.frontmatter.description ?? description }],
    )
  },

  markdown: {
    theme: 'vitesse-dark',
  },

  themeConfig: {
    siteTitle: name,
    logo: { src: '/favicon.svg', alt: '' },
    nav: [
      { text: 'Quick start', link: '/guide/quick-start' },
      { text: 'Alerting', link: '/guide/alerting' },
      { text: 'Configuration', link: '/guide/configuration' },
    ],
    sidebar: [
      {
        text: 'Run it',
        items: [
          { text: 'Quick start', link: '/guide/quick-start' },
          { text: 'Docker Swarm deploy', link: '/guide/docker-swarm' },
        ],
      },
      {
        text: 'What it collects',
        items: [
          { text: 'Node Exporter and dashboard', link: '/guide/node-exporter' },
          { text: 'cAdvisor container metrics', link: '/guide/cadvisor' },
          { text: 'Alert rules and Alertmanager', link: '/guide/alerting' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'Configuration', link: '/guide/configuration' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: repo }],
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/halitsever/grafana-docker-compose/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'MIT licensed. An independent project, not affiliated with Grafana Labs, the Prometheus project or Docker.',
      copyright: 'Halit Sever',
    },
  },
})

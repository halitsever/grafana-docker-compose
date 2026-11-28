import { defineConfig } from 'vitepress'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'

const site = 'https://projects.halit.org/grafana-docker-compose/'
const name = 'grafana-docker-compose'
const homeTitle = 'Grafana Docker Compose stack with Prometheus'
const description =
  'A Grafana Docker Compose stack with Prometheus, Alertmanager, Node Exporter and cAdvisor. Ships with a provisioned dashboard and eight alert rules.'

const repo = 'https://github.com/halitsever/grafana-docker-compose'

const posts = [
  ['prometheus-alertmanager-explained', 'Alertmanager explained'],
  ['prometheus-alert-rule-templates', 'Alert rule templates'],
  ['alertmanager-silence', 'Silence an alert'],
  ['grafana-alerts-vs-prometheus-rules', 'Grafana alerts vs Prometheus rules'],
  ['alertmanager-best-practices', 'Alertmanager best practices'],
  ['grafana-export-import-dashboard', 'Export and import a dashboard'],
  ['cadvisor-image-gcr-vs-docker-hub', 'cAdvisor image registries'],
  ['cadvisor-metrics', 'cAdvisor metrics to graph'],
  ['promql-cheat-sheet', 'PromQL cheat sheet'],
  ['promql-if-function', 'Conditions in PromQL'],
  ['promql-rate', 'rate, irate and increase'],
  ['promql-group-by', 'Group by in PromQL'],
  ['promql-label-replace', 'label_replace'],
  ['promtool', 'promtool checks and tests'],
]

/** BlogPosting, breadcrumbs and, when the post shows an FAQ, FAQPage data for a blog post. */
function postJsonLd(fm: Record<string, any>, url: string) {
  const person = { '@type': 'Person', name: 'Halit Sever', url: 'https://halit.org' }
  const graph: object[] = [
    {
      '@type': 'BlogPosting',
      headline: fm.headline ?? fm.title,
      description: fm.description,
      url,
      mainEntityOfPage: url,
      datePublished: fm.date,
      dateModified: fm.date,
      inLanguage: 'en',
      image: `${site}og.png`,
      keywords: fm.keyword,
      author: person,
      publisher: person,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Grafana Docker Compose', item: site },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${site}blog/` },
        { '@type': 'ListItem', position: 3, name: fm.headline ?? fm.title, item: url },
      ],
    },
  ]
  if (fm.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: fm.faq.map((f: { q: string; a: string }) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

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
  /** llms.txt lives at the repo root, so the build copies it into the site instead of keeping a second copy. */
  buildEnd(siteConfig) {
    copyFileSync(join(siteConfig.root, '..', 'llms.txt'), join(siteConfig.outDir, 'llms.txt'))
  },
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
    /** Cloudflare Web Analytics, one token for every page on projects.halit.org. */
    ['script', { defer: '', src: 'https://static.cloudflareinsights.com/beacon.min.js', 'data-cf-beacon': '{"token": "dd7e54d3f48841c187d72d9dbb92a6b6"}' }],
    ['link', { rel: 'icon', href: '/grafana-docker-compose/favicon.png', sizes: '32x32', type: 'image/png' }],
    ['link', { rel: 'icon', href: '/grafana-docker-compose/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#101216' }],
    ['meta', { property: 'og:site_name', content: name }],
    ['meta', { property: 'og:image', content: `${site}og.png` }],
    ['meta', { property: 'og:image:width', content: '1280' }],
    ['meta', { property: 'og:image:height', content: '640' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${site}og.png` }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)],
  ],

  transformPageData(pageData) {
    const fm = pageData.frontmatter
    const isHome = pageData.relativePath === 'index.md'
    const title = fm.title ?? pageData.title
    const url = site + pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    fm.head ??= []
    fm.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:type', content: fm.date ? 'article' : 'website' }],
      ['meta', { property: 'og:title', content: isHome ? homeTitle : fm.titleTemplate === false ? title : `${title} | Grafana Docker stack` }],
      ['meta', { property: 'og:description', content: fm.description ?? description }],
    )
    if (fm.date) fm.head.push(['script', { type: 'application/ld+json' }, JSON.stringify(postJsonLd(fm, url))])
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
      { text: 'Dashboard', link: '/node-exporter-dashboard/' },
      { text: 'Blog', link: '/blog/', activeMatch: '/blog/' },
    ],
    sidebar: {
      '/blog/': [
        {
          text: 'Monitoring guides',
          items: [{ text: 'All posts', link: '/blog/' }, ...posts.map(([slug, text]) => ({ text, link: `/blog/${slug}` }))],
        },
      ],
      '/': [
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
          items: [
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Node Exporter dashboard', link: '/node-exporter-dashboard/' },
            { text: 'Blog', link: '/blog/' },
          ],
        },
      ],
    },
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

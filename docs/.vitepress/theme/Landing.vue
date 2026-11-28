<script setup lang="ts">
import { ref } from 'vue'
import { withBase } from 'vitepress'
import ArchitectureDiagram from './ArchitectureDiagram.vue'
import DashboardMap from './DashboardMap.vue'

const repo = 'https://github.com/halitsever/grafana-docker-compose'
const file = (path: string) => `${repo}/blob/main/${path}`

const startCommand = `git clone ${repo}.git
cd grafana-docker-compose
cp .env.example .env
docker compose up -d`

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(startCommand)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    copied.value = false
  }
}

/** Mirrors docker-compose.yml. Update both when an image tag or port changes. */
const services = [
  { name: 'Grafana', service: 'grafana', image: 'grafana/grafana:13.3.0', port: '1296', job: 'Dashboards and the web UI' },
  { name: 'Prometheus', service: 'prometheus', image: 'prom/prometheus:v3.16.0', port: '9090', job: 'Scrapes, stores, evaluates rules' },
  { name: 'Alertmanager', service: 'alertmanager', image: 'prom/alertmanager:v0.35.0', port: '9093', job: 'Groups and routes alerts' },
  { name: 'Node Exporter', service: 'myserver_node_exporter', image: 'prom/node-exporter:v1.12.1', port: '9100', job: 'Host CPU, memory, disk, network' },
  { name: 'cAdvisor', service: 'cadvisor', image: 'gcr.io/cadvisor/cadvisor:v0.55.1', port: '8080', job: 'Per-container metrics' },
]

/** Mirrors prometheus/rules/node.yml. */
const alerts = [
  { name: 'InstanceDown', when: 'A scrape target stops answering', expr: 'up == 0', hold: '1m', severity: 'critical' },
  { name: 'HighCpuUsage', when: 'CPU above 90%', expr: '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90', hold: '5m', severity: 'warning' },
  { name: 'HighMemoryUsage', when: 'Memory above 90%', expr: '100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 90', hold: '5m', severity: 'warning' },
  { name: 'CriticalMemoryUsage', when: 'Memory above 95%', expr: '100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 95', hold: '2m', severity: 'critical' },
  { name: 'DiskSpaceLow', when: 'Root filesystem above 85%', expr: '100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) * 100) > 85', hold: '5m', severity: 'warning' },
  { name: 'DiskSpaceCritical', when: 'Root filesystem above 95%', expr: '100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) * 100) > 95', hold: '2m', severity: 'critical' },
  { name: 'HighNetworkErrors', when: 'More than 10 network errors per second', expr: 'irate(node_network_receive_errs_total[5m]) + irate(node_network_transmit_errs_total[5m]) > 10', hold: '5m', severity: 'warning' },
  { name: 'SystemLoad', when: '15-minute load above 2x the CPU count', expr: 'node_load15 / count(node_cpu_seconds_total{mode="idle"}) without (cpu, mode) > 2', hold: '5m', severity: 'warning' },
]

/** Mirrors the route block of alertmanager/alertmanager.yml. */
const routing = [
  { key: 'group_by', value: 'alertname, instance' },
  { key: 'group_wait', value: '30s' },
  { key: 'group_interval', value: '5m' },
  { key: 'repeat_interval', value: '12h' },
  { key: 'critical repeat_interval', value: '1h' },
  { key: 'resolve_timeout', value: '5m' },
]

const guides = [
  { link: '/guide/quick-start', title: 'Quick start', text: 'Compose up, the five ports, first login.' },
  { link: '/guide/node-exporter', title: 'Node Exporter and its dashboard', text: 'What the exporter reads and what the eight panels query.' },
  { link: '/guide/cadvisor', title: 'cAdvisor container metrics', text: 'Why it runs privileged and how to query containers.' },
  { link: '/guide/alerting', title: 'Alert rules and Alertmanager', text: 'Every rule, the routing tree, adding a receiver.' },
  { link: '/guide/docker-swarm', title: 'Docker Swarm deploy', text: 'What docker stack deploy ignores in this file.' },
  { link: '/guide/configuration', title: 'Configuration reference', text: 'Every variable, file, volume and port.' },
  { link: '/node-exporter-dashboard/', title: 'The Node Exporter dashboard', text: 'Screenshot, panel list and how to import the JSON.' },
  { link: '/blog/', title: 'Blog', text: 'Alertmanager, alert templates, silences and cAdvisor metrics.' },
]
</script>

<template>
  <div class="wall">
    <div class="wall-grid">
      <section class="panel intro">
        <h1>One Grafana Docker Compose file for Prometheus, alerts and dashboards</h1>
        <p class="lede">
          One compose file starts Grafana, Prometheus, Alertmanager, Node Exporter and cAdvisor. The data source, a Node Exporter dashboard and
          eight alert rules are already wired, so the first page you open has graphs on it.
        </p>
        <div class="cmd-box">
          <button type="button" class="copy" @click="copy" :aria-label="copied ? 'Copied' : 'Copy the commands'">
            <svg v-if="!copied" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <rect x="5" y="5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" />
              <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" fill="none" stroke="currentColor" stroke-width="1.4" />
            </svg>
            <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span aria-live="polite">{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
          <pre class="cmd"><code><span v-for="(line, i) in startCommand.split('\n')" :key="i" class="cmd-line">{{ line }}</span></code></pre>
        </div>
        <div class="actions">
          <a class="btn primary" :href="withBase('/guide/quick-start')">Read the quick start</a>
          <a class="btn" :href="repo" rel="noopener">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.33.66.07-.52.28-.87.5-1.07-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"
              />
            </svg>
            View the source
          </a>
        </div>
      </section>

      <section class="panel preview" aria-labelledby="p-preview">
        <header class="panel-head">
          <h2 id="p-preview">The dashboard you get</h2>
          <a :href="file('grafana/provisioning/dashboards/json/node-exporter.json')" rel="noopener">node-exporter.json</a>
        </header>
        <DashboardMap />
        <p class="note">
          Panel titles, sizes and thresholds come from the provisioned JSON. The curves are a drawing, not live data.
        </p>
      </section>

      <section class="panel start" aria-labelledby="p-start">
        <header class="panel-head">
          <h2 id="p-start">After it starts</h2>
          <a :href="file('.env.example')" rel="noopener">.env.example</a>
        </header>
        <p>
          Set <code>GF_SECURITY_ADMIN_PASSWORD</code> in <code>.env</code> before the first start, then open
          <code>http://localhost:1296</code> and sign in as <code>admin</code>. Grafana is on host port 1296 here, not 3000.
        </p>
        <p>
          The dashboard named Node Exporter is already in the list. Prometheus shows its three scrape jobs at
          <code>http://localhost:9090/targets</code> and the loaded rules at <code>/alerts</code>.
        </p>
        <p>
          On Docker Swarm the same file works with <code>docker stack deploy</code>, with a few differences covered in the
          <a :href="withBase('/guide/docker-swarm')">Swarm guide</a>.
        </p>
      </section>

      <section class="panel services" aria-labelledby="p-services">
        <header class="panel-head">
          <h2 id="p-services">Services and host ports</h2>
          <a :href="file('docker-compose.yml')" rel="noopener">docker-compose.yml</a>
        </header>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col" class="num">Port</th>
                <th scope="col" class="hide-s">Image</th>
                <th scope="col" class="hide-m">Job in the stack</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in services" :key="s.service">
                <th scope="row">
                  {{ s.name }}
                  <span class="sub mono">{{ s.service }}</span>
                </th>
                <td class="num mono port">{{ s.port }}</td>
                <td class="mono hide-s">{{ s.image }}</td>
                <td class="hide-m">{{ s.job }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="note">Every service publishes its port on the host. Grafana maps 1296 to container port 3000. The rest use the same number on both sides.</p>
      </section>

      <section class="panel arch" aria-labelledby="p-arch">
        <header class="panel-head">
          <h2 id="p-arch">How the five services connect</h2>
          <a :href="file('prometheus.yml')" rel="noopener">prometheus.yml</a>
        </header>
        <ArchitectureDiagram />
        <div class="arch-text">
          <p>
            Prometheus pulls metrics. It scrapes Node Exporter every 5 seconds, cAdvisor every 10 and itself every 15. Grafana never talks to the
            exporters. It queries Prometheus at <code>http://prometheus:9090</code> through a provisioned data source.
          </p>
          <p>
            Rules in <code>prometheus/rules/node.yml</code> are evaluated every 30 seconds. When one fires, Prometheus sends it to
            <code>alertmanager:9093</code>, which groups it and hands it to the <code>default</code> or <code>critical</code> receiver.
          </p>
        </div>
      </section>

      <section class="panel alerts" aria-labelledby="p-alerts">
        <header class="panel-head">
          <h2 id="p-alerts">Alert rules</h2>
          <a :href="file('prometheus/rules/node.yml')" rel="noopener">prometheus/rules/node.yml</a>
        </header>
        <ul class="alert-list">
          <li v-for="a in alerts" :key="a.name" :class="a.severity">
            <span class="sev">
              <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
                <rect v-if="a.severity === 'critical'" x="1" y="1" width="8" height="8" rx="1.5" fill="currentColor" />
                <rect v-else x="1.75" y="1.75" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
              </svg>
              {{ a.severity }}
            </span>
            <span class="alert-name mono">{{ a.name }}</span>
            <span class="alert-when">{{ a.when }}</span>
            <span class="alert-for mono">for {{ a.hold }}</span>
            <code class="alert-expr">{{ a.expr }}</code>
          </li>
        </ul>
      </section>

      <section class="panel routing" aria-labelledby="p-routing">
        <header class="panel-head">
          <h2 id="p-routing">Alert routing</h2>
          <a :href="file('alertmanager/alertmanager.yml')" rel="noopener">alertmanager.yml</a>
        </header>
        <dl class="kv">
          <template v-for="r in routing" :key="r.key">
            <dt class="mono">{{ r.key }}</dt>
            <dd class="mono">{{ r.value }}</dd>
          </template>
        </dl>
        <p>
          Alerts labelled <code>severity: critical</code> go to the <code>critical</code> receiver and repeat every hour. Everything else lands on
          <code>default</code> and repeats every 12 hours.
        </p>
        <p>
          Both receivers ship empty. The email and Slack webhook blocks are commented out, so no notification leaves the box until you
          <a :href="withBase('/guide/alerting#add-a-receiver')">add a receiver</a>.
        </p>
      </section>

      <section class="panel guides" aria-labelledby="p-guides">
        <header class="panel-head">
          <h2 id="p-guides">Guides</h2>
        </header>
        <ul class="guide-list">
          <li v-for="g in guides" :key="g.link">
            <a :href="withBase(g.link)">
              <span class="guide-title">{{ g.title }}</span>
              <span class="guide-text">{{ g.text }}</span>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel about" aria-labelledby="p-about">
        <header class="panel-head">
          <h2 id="p-about">What is in the repository</h2>
        </header>
        <p>
          The repository is configuration only. There is no application code and nothing to build. You get a compose file, a Prometheus config with
          three scrape jobs, one rule file, an Alertmanager config and Grafana provisioning for the data source and one dashboard.
        </p>
        <p>
          Retention is 30 days by default and is set with <code>PROMETHEUS_RETENTION</code>. Prometheus runs with
          <code>--web.enable-lifecycle</code>, so a config change is applied with one HTTP call and no restart. To monitor another server, add its
          exporter as a second target under the <code>node</code> job.
        </p>
        <p>
          CI checks every change with <code>docker compose config</code>, <code>promtool check config</code> and <code>amtool check-config</code>.
          The project is MIT licensed and is not affiliated with Grafana Labs, the Prometheus project or Docker.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Names, ports and intervals mirror docker-compose.yml, prometheus.yml and alertmanager.yml. */
type Node = { id: string; port: string; lines: string[]; x: number; y: number; w: number; h: number }

const text = {
  grafana: ['UI on container port 3000', 'data source and dashboard provisioned'],
  prometheus: ['3 scrape jobs, 30 day retention', 'scrapes itself every 15s'],
  node: ['reads the host / at /host, read-only'],
  cadvisor: ['privileged, reads /sys and Docker data'],
  alertmanager: ['receivers: default, critical', 'email and Slack blocks commented out'],
}

const wide: Node[] = [
  { id: 'grafana', port: '1296', lines: text.grafana, x: 50, y: 192, w: 250, h: 92 },
  { id: 'prometheus', port: '9090', lines: text.prometheus, x: 430, y: 192, w: 230, h: 92 },
  { id: 'myserver_node_exporter', port: '9100', lines: text.node, x: 850, y: 56, w: 256, h: 74 },
  { id: 'cadvisor', port: '8080', lines: text.cadvisor, x: 850, y: 201, w: 256, h: 74 },
  { id: 'alertmanager', port: '9093', lines: text.alertmanager, x: 850, y: 337, w: 256, h: 92 },
]

const narrow: Node[] = [
  { id: 'grafana', port: '1296', lines: text.grafana, x: 10, y: 24, w: 320, h: 86 },
  { id: 'prometheus', port: '9090', lines: [...text.prometheus, 'evaluates 8 rules every 30s'], x: 10, y: 176, w: 320, h: 104 },
  { id: 'myserver_node_exporter', port: '9100', lines: text.node, x: 56, y: 340, w: 274, h: 68 },
  { id: 'cadvisor', port: '8080', lines: text.cadvisor, x: 56, y: 468, w: 274, h: 68 },
  { id: 'alertmanager', port: '9093', lines: text.alertmanager, x: 56, y: 596, w: 274, h: 86 },
]

const summary =
  'Architecture diagram. Grafana, published on host port 1296, queries Prometheus on port 9090. Prometheus scrapes Node Exporter on port 9100 every 5 seconds, cAdvisor on port 8080 every 10 seconds and itself every 15 seconds. It evaluates eight rules every 30 seconds and sends firing alerts to Alertmanager on port 9093, which routes them to the default or critical receiver.'
</script>

<template>
  <figure class="arch-fig">
    <svg class="d-wide" viewBox="0 0 1140 470" role="img" :aria-label="summary">
      <defs>
        <marker id="aw-cool" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="m-cool" /></marker>
        <marker id="aw-warm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="m-warm" /></marker>
        <marker id="aw-plain" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="m-plain" /></marker>
      </defs>

      <rect x="14" y="14" width="1112" height="442" rx="8" class="host" />
      <text x="34" y="42" class="t-host">Docker host, all five ports published</text>

      <path d="M300 238 H430" class="e plain" marker-end="url(#aw-plain)" />
      <text x="365" y="226" text-anchor="middle" class="t-edge">PromQL</text>
      <text x="365" y="258" text-anchor="middle" class="t-edge dim">queries</text>

      <path d="M660 218 H720 V93 H850" class="e cool" marker-end="url(#aw-cool)" />
      <text x="785" y="81" text-anchor="middle" class="t-edge cool">scrape every 5s</text>
      <text x="785" y="113" text-anchor="middle" class="t-edge dim">job node</text>

      <path d="M660 238 H850" class="e cool" marker-end="url(#aw-cool)" />
      <text x="790" y="226" text-anchor="middle" class="t-edge cool">scrape every 10s</text>
      <text x="790" y="258" text-anchor="middle" class="t-edge dim">job cadvisor</text>

      <path d="M660 258 H720 V383 H850" class="e warm" marker-end="url(#aw-warm)" />
      <text x="785" y="371" text-anchor="middle" class="t-edge warm">firing alerts</text>

      <path d="M545 284 V356" class="e dotted" />
      <rect x="430" y="356" width="230" height="62" rx="6" class="file" />
      <text x="446" y="382" class="t-file">prometheus/rules/node.yml</text>
      <text x="446" y="402" class="t-line">8 rules, evaluated every 30s</text>

      <g v-for="n in wide" :key="n.id">
        <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="6" class="node" />
        <text :x="n.x + 16" :y="n.y + 28" class="t-name">{{ n.id }}</text>
        <text v-for="(l, i) in n.lines" :key="l" :x="n.x + 16" :y="n.y + 50 + i * 20" class="t-line">{{ l }}</text>
        <rect :x="n.x + n.w - 76" :y="n.y - 12" width="64" height="24" rx="4" class="port" />
        <text :x="n.x + n.w - 44" :y="n.y + 5" text-anchor="middle" class="t-port">:{{ n.port }}</text>
      </g>
    </svg>

    <svg class="d-narrow" viewBox="0 0 340 700" role="img" :aria-label="summary">
      <defs>
        <marker id="an-cool" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="m-cool" /></marker>
        <marker id="an-warm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="m-warm" /></marker>
        <marker id="an-plain" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="m-plain" /></marker>
      </defs>

      <path d="M170 110 V176" class="e plain" marker-end="url(#an-plain)" />
      <text x="182" y="148" class="t-edge">PromQL queries</text>

      <path d="M34 280 V374 H56" class="e cool" marker-end="url(#an-cool)" />
      <text x="56" y="318" class="t-edge cool">scrape every 5s, job node</text>

      <path d="M34 374 V502 H56" class="e cool" marker-end="url(#an-cool)" />
      <text x="56" y="446" class="t-edge cool">scrape every 10s, job cadvisor</text>

      <path d="M20 280 V639 H56" class="e warm" marker-end="url(#an-warm)" />
      <text x="56" y="574" class="t-edge warm">firing alerts</text>

      <g v-for="n in narrow" :key="n.id">
        <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="6" class="node" />
        <text :x="n.x + 14" :y="n.y + 28" class="t-name">{{ n.id }}</text>
        <text v-for="(l, i) in n.lines" :key="l" :x="n.x + 14" :y="n.y + 50 + i * 20" class="t-line">{{ l }}</text>
        <rect :x="n.x + n.w - 72" :y="n.y - 12" width="62" height="24" rx="4" class="port" />
        <text :x="n.x + n.w - 41" :y="n.y + 5" text-anchor="middle" class="t-port">:{{ n.port }}</text>
      </g>
    </svg>

    <figcaption>
      <span class="key"><i class="k-port"></i>port published on the host</span>
      <span class="key"><i class="k-cool"></i>Prometheus scrapes</span>
      <span class="key"><i class="k-warm"></i>alert path</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.arch-fig {
  margin: 0;
}
svg {
  display: block;
  width: 100%;
  height: auto;
}
.d-narrow {
  display: none;
  max-width: 420px;
  margin: 0 auto;
}
@media (max-width: 860px) {
  .d-wide {
    display: none;
  }
  .d-narrow {
    display: block;
  }
}

.host {
  fill: none;
  stroke: var(--w-line);
  stroke-dasharray: 4 6;
}
.node {
  fill: var(--w-panel-2);
  stroke: var(--w-line-strong);
}
.file {
  fill: none;
  stroke: var(--w-line-strong);
  stroke-dasharray: 3 4;
}
.port {
  fill: var(--w-wall);
  stroke: var(--w-line-strong);
}
.e {
  fill: none;
  stroke-width: 1.5;
  stroke-linejoin: round;
}
.e.plain {
  stroke: var(--w-muted);
}
.e.cool {
  stroke: var(--w-cool);
}
.e.warm {
  stroke: var(--w-warm);
}
.e.dotted {
  stroke: var(--w-line-strong);
  stroke-dasharray: 3 4;
}
.m-plain {
  fill: var(--w-muted);
}
.m-cool {
  fill: var(--w-cool);
}
.m-warm {
  fill: var(--w-warm);
}

text {
  font-family: var(--w-sans);
  fill: var(--w-text);
}
.t-name,
.t-port,
.t-file {
  font-family: var(--w-mono);
}
.t-name {
  font-size: 15px;
  font-weight: 600;
}
.t-line {
  font-size: 12.5px;
  fill: var(--w-muted);
}
.t-file {
  font-size: 13px;
}
.t-port {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.t-host {
  font-size: 13px;
  fill: var(--w-muted);
}
.t-edge {
  font-size: 12.5px;
  fill: var(--w-text);
}
.t-edge.dim {
  fill: var(--w-muted);
}
.t-edge.cool {
  fill: var(--w-cool);
}
.t-edge.warm {
  fill: var(--w-warm);
}

figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--w-muted);
}
.key {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.key i {
  display: inline-block;
  width: 18px;
  height: 2px;
}
.k-cool {
  background: var(--w-cool);
}
.k-warm {
  background: var(--w-warm);
}
.key .k-port {
  height: 12px;
  border: 1px solid var(--w-line-strong);
  border-radius: 3px;
  background: var(--w-wall);
}
</style>

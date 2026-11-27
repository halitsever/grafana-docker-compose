<script setup lang="ts">
/** Titles, grid sizes, thresholds and legends mirror grafana/dashboards/node-exporter.json. Fill levels and curves are drawn by hand. */
const gauges = [
  { title: 'CPU Usage', fill: 31, yellow: 70, red: 90 },
  { title: 'Memory Usage', fill: 58, yellow: 70, red: 90 },
  { title: 'Disk Usage (/)', fill: 44, yellow: 70, red: 85 },
]

const series = [
  {
    title: 'CPU Usage Over Time',
    legend: [],
    lines: ['M0 48 L18 44 L34 50 L52 30 L70 36 L88 22 L104 34 L122 40 L140 26 L158 38 L176 44 L194 30 L212 36 L240 28'],
  },
  {
    title: 'Memory Usage Over Time',
    legend: ['Used', 'Total'],
    lines: ['M0 44 L30 43 L60 41 L90 42 L120 38 L150 37 L180 35 L210 36 L240 33', 'M0 12 L240 12'],
  },
  {
    title: 'Network I/O',
    legend: ['RX', 'TX'],
    lines: [
      'M0 50 L20 46 L36 28 L50 42 L68 48 L86 20 L100 40 L120 46 L140 34 L156 14 L172 40 L196 46 L216 30 L240 42',
      'M0 56 L24 54 L40 44 L58 52 L80 55 L96 40 L112 52 L136 54 L154 36 L170 50 L200 54 L220 46 L240 52',
    ],
  },
  {
    title: 'Disk I/O',
    legend: ['Read', 'Write'],
    lines: [
      'M0 54 L30 54 L38 30 L46 54 L96 54 L104 22 L114 54 L170 54 L178 36 L186 54 L240 54',
      'M0 48 L16 46 L32 40 L48 46 L64 34 L80 44 L96 42 L112 30 L128 44 L144 40 L160 46 L176 32 L192 44 L208 38 L224 44 L240 40',
    ],
  },
]

/** The gauge track covers 270 degrees, so a percent maps to 0.75 units of a 100-unit path. */
const arc = (from: number, to: number) => `${(to - from) * 0.75} 100`
const offset = (from: number) => `${-from * 0.75}`
</script>

<template>
  <div class="dash" role="img" aria-label="Layout of the provisioned Node Exporter dashboard: three gauges, an instance status panel and four time series panels.">
    <div v-for="g in gauges" :key="g.title" class="mini gauge">
      <span class="mini-title">{{ g.title }}</span>
      <svg viewBox="0 0 100 82" aria-hidden="true">
        <g transform="rotate(135 50 50)" fill="none">
          <circle cx="50" cy="50" r="34" pathLength="100" class="g-track" stroke-width="9" stroke-dasharray="75 100" />
          <circle cx="50" cy="50" r="34" pathLength="100" class="g-fill" stroke-width="9" :stroke-dasharray="arc(0, g.fill)" />
          <circle cx="50" cy="50" r="42" pathLength="100" class="g-ok" stroke-width="2" :stroke-dasharray="arc(0, g.yellow)" />
          <circle cx="50" cy="50" r="42" pathLength="100" class="g-warn" stroke-width="2" :stroke-dasharray="arc(g.yellow, g.red)" :stroke-dashoffset="offset(g.yellow)" />
          <circle cx="50" cy="50" r="42" pathLength="100" class="g-crit" stroke-width="2" :stroke-dasharray="arc(g.red, 100)" :stroke-dashoffset="offset(g.red)" />
        </g>
      </svg>
      <span class="mini-foot mono">{{ g.yellow }} / {{ g.red }}%</span>
    </div>

    <div class="mini stat">
      <span class="mini-title">Instance Status</span>
      <span class="stat-body mono">up{job="node"}</span>
      <span class="mini-foot">one tile per instance</span>
    </div>

    <div v-for="s in series" :key="s.title" class="mini ts">
      <span class="mini-title">{{ s.title }}</span>
      <svg viewBox="0 0 240 64" aria-hidden="true">
        <path d="M0 16 H240 M0 32 H240 M0 48 H240" class="ts-grid" />
        <path v-for="(d, i) in s.lines" :key="i" :d="d" pathLength="1" :class="['ts-line', i === 0 ? 'cool' : 'warm']" />
      </svg>
      <span v-if="s.legend.length" class="legend">
        <span v-for="(l, i) in s.legend" :key="l" :class="i === 0 ? 'cool' : 'warm'">{{ l }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.dash {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: 8px;
}
.mini {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 12px 10px;
  border: 1px solid var(--w-line);
  border-radius: 4px;
  background: var(--w-wall);
}
.gauge,
.stat {
  grid-column: span 6;
}
.ts {
  grid-column: span 12;
}
.mini-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--w-text);
}
.mini-foot {
  font-size: 11px;
  color: var(--w-muted);
  text-align: center;
}
.gauge svg {
  width: 100%;
  max-width: 120px;
  margin: 6px auto 0;
}
.g-track {
  stroke: var(--w-line);
}
.g-fill {
  stroke: var(--w-cool);
}
.g-ok {
  stroke: var(--w-line-strong);
}
.g-warn {
  stroke: var(--w-warm-soft);
}
.g-crit {
  stroke: var(--w-warm);
}
.stat-body {
  flex: 1;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--w-cool);
  overflow-wrap: anywhere;
  text-align: center;
}
.ts svg {
  width: 100%;
  height: auto;
  margin-top: 8px;
}
.ts-grid {
  stroke: var(--w-line);
  stroke-width: 1;
  fill: none;
}
.ts-line {
  fill: none;
  stroke-width: 1.75;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.ts-line.cool {
  stroke: var(--w-cool);
}
.ts-line.warm {
  stroke: var(--w-warm);
}
.legend {
  display: flex;
  gap: 14px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--w-muted);
}
.legend span::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 2px;
  margin-right: 6px;
  vertical-align: middle;
  background: currentColor;
}
.legend .cool::before {
  background: var(--w-cool);
}
.legend .warm::before {
  background: var(--w-warm);
}

/* The lines draw once on load. Without motion they are simply there. */
@media (prefers-reduced-motion: no-preference) {
  .ts-line {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw 1.4s ease-out 0.2s forwards;
  }
  .ts:nth-of-type(6) .ts-line,
  .ts:nth-of-type(8) .ts-line {
    animation-delay: 0.45s;
  }
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (max-width: 560px) {
  .gauge,
  .stat {
    grid-column: span 12;
  }
  .ts {
    grid-column: span 24;
  }
}
</style>

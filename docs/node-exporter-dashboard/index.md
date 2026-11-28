---
title: Grafana Prometheus Dashboard for Node Exporter
titleTemplate: false
description: A free Grafana Prometheus dashboard for Node Exporter, provisioned by this Docker stack. See the eight panels, their PromQL and how to import the JSON.
---

# The Node Exporter dashboard this stack provisions

<p class="lead">One Grafana dashboard ships with the stack: eight panels that show a server's CPU, memory, disk and network from Node Exporter metrics in Prometheus. It loads on first start with no clicks, and the JSON file imports into any other Grafana that has a Prometheus data source.</p>

![The provisioned Node Exporter dashboard in Grafana 13.3.0: CPU, memory and disk gauges, an UP status tile, and CPU, memory, network and disk I/O graphs](/node-exporter-dashboard.webp)

The screenshot is the dashboard as it ships, taken from Grafana 13.3.0 running the repository's own provisioning files on 28 November 2026, about 20 minutes after start-up. The server name in the legends is the placeholder label from `prometheus.yml`, which the [quick start](/guide/quick-start#rename-your-server) tells you to change.

## Get it running

With Docker and Docker Compose installed:

```bash
git clone https://github.com/halitsever/grafana-docker-compose.git
cd grafana-docker-compose
cp .env.example .env
docker compose up -d
```

Open `http://localhost:1296`, sign in as `admin` with the password from `.env`, and go to **Dashboards** → **Node Exporter**, or straight to `http://localhost:1296/d/node-exporter`. The Prometheus data source and the dashboard are both provisioned, so there is nothing to set up in the UI.

## Import it into your own Grafana

Already run Grafana and Prometheus? Take only the dashboard:

1. Download [node-exporter.json](https://github.com/halitsever/grafana-docker-compose/blob/main/grafana/provisioning/dashboards/json/node-exporter.json) (use **Download raw file** on GitHub).
2. In Grafana, go to **Dashboards** → **New** → **Import**.
3. Upload the file and click **Import**.
4. Pick your Prometheus data source in the **Datasource** drop-down at the top of the dashboard.

Every panel queries `${datasource}`, a template variable of type Prometheus, so the file does not depend on the uid of any data source. Your Prometheus needs to scrape Node Exporter under `job="node"` for the status tile, since that panel filters on the job name. The other panels read any `node_*` series.

## The eight panels

| Panel | Type | Query | Thresholds |
| --- | --- | --- | --- |
| CPU Usage | Gauge | `100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` | yellow 70%, red 90% |
| Memory Usage | Gauge | `100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)` | yellow 70%, red 90% |
| Disk Usage (/) | Gauge | root filesystem used, excluding `tmpfs` | yellow 70%, red 85% |
| Instance Status | Stat | `up{job="node"}`, shown as UP or DOWN | green UP, red DOWN |
| CPU Usage Over Time | Time series | `1 - avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m]))` | none |
| Memory Usage Over Time | Time series | used (`MemTotal - MemAvailable`) and total | none |
| Network I/O | Time series | receive and transmit bytes per second, per interface except `lo` | none |
| Disk I/O | Time series | read and written bytes per second, per device | none |

The gauge thresholds line up with the alert rules: the red mark on memory is the 90% at which `HighMemoryUsage` fires, and the red mark on disk is the 85% of `DiskSpaceLow`. When a gauge turns red, an alert is a few minutes away. The [alerting guide](/guide/alerting) lists all eight rules.

The dashboard refreshes every 30 seconds and opens on the last hour. Prometheus keeps 30 days of data by default (`PROMETHEUS_RETENTION` in `.env`), so you can widen the time range that far back.

## What it does not show

- **Containers.** The dashboard covers the host. cAdvisor's per-container metrics are in Prometheus, but no panel reads them yet. [cAdvisor metrics you should graph](/blog/cadvisor-metrics) has the queries.
- **The host's own network interfaces.** Node Exporter runs on the compose network, so the Network I/O panel shows the interfaces the container can see, such as its `eth0`. The [Node Exporter guide](/guide/node-exporter) explains how to switch to host networking.
- **More than one server, nicely.** Add more targets to the `node` job and each panel draws one line per `instance`. The gauges then show one needle per server.

## Change it and keep the change

The dashboard is provisioned from a file, so Grafana will not save edits made in the UI. Edit it, copy the JSON from the save dialog or from **Export** → **Export as code**, and paste it over `grafana/provisioning/dashboards/json/node-exporter.json`. Grafana reloads the file within 30 seconds. [Export, import and copy a Grafana dashboard](/blog/grafana-export-import-dashboard) covers the details, including the second copy of the file the repository keeps.

## Questions

### Is this the same as dashboard 1860 on grafana.com?

No. It is a smaller dashboard written for this stack, with eight panels and the same queries as the alert rules. Dashboard IDs from grafana.com import the same way if you want a larger one.

### Does it work with Grafana 10, 11 or 12?

The JSON uses schema version 38 and standard gauge, stat and time series panels. It was checked on the 13.3.0 the stack pins. Older versions that support those panel types should load it, but that has not been tested here.

### Where are the alerts?

In Prometheus, not in Grafana. The rules live in `prometheus/rules/node.yml` and go through Alertmanager. [Grafana alerts vs Prometheus alert rules](/blog/grafana-alerts-vs-prometheus-rules) explains why.

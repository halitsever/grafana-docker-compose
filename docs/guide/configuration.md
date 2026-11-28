---
title: Configuration reference
description: Every environment variable, file, port, volume and image tag in the Grafana Docker Compose stack, with defaults and how to apply a change.
---

# Stack configuration: files, ports, variables and image tags

Everything the stack does is defined by a few files in the repository. This page lists each one with its defaults.

## Environment variables

Copy `.env.example` to `.env`. `docker compose` loads it automatically. `docker stack deploy` does not, see the [Swarm guide](./docker-swarm#env-is-not-read).

| Variable | Default in compose | Value in `.env.example` | Used by |
| --- | --- | --- | --- |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | `changeme` | Grafana admin password, applied when Grafana first creates its database |
| `GF_SERVER_ROOT_URL` | `http://localhost:1296` | `http://localhost:1296` | The public URL Grafana uses in links. Set it to your domain behind a reverse proxy |
| `PROMETHEUS_RETENTION` | `30d` | `30d` | Passed to `--storage.tsdb.retention.time`. How long Prometheus keeps data |

`.env` is gitignored. If you add a variable, add it to `.env.example` and give it a default in `docker-compose.yml` with the `${VAR:-default}` form.

## Files

```txt
docker-compose.yml                       the five services, ports and volumes
.env.example                             template for .env
prometheus.yml                           global intervals, Alertmanager target, scrape jobs
prometheus/rules/node.yml                the node_alerts group, eight rules
alertmanager/alertmanager.yml            routing tree, receivers, inhibit rule
grafana/provisioning/datasources/prometheus.yml    the Prometheus data source
grafana/provisioning/dashboards/dashboard.yml      dashboard file provider
grafana/provisioning/dashboards/json/node-exporter.json   the mounted dashboard
grafana/dashboards/node-exporter.json    second copy of the dashboard, not mounted
```

## Services, images and ports

| Service | Image | Host port | Container port |
| --- | --- | --- | --- |
| `grafana` | `grafana/grafana:13.3.0` | 1296 | 3000 |
| `prometheus` | `prom/prometheus:v3.16.0` | 9090 | 9090 |
| `alertmanager` | `prom/alertmanager:v0.35.0` | 9093 | 9093 |
| `myserver_node_exporter` | `prom/node-exporter:v1.12.1` | 9100 | 9100 |
| `cadvisor` | `gcr.io/cadvisor/cadvisor:v0.55.1` | 8080 | 8080 |

Every service has `restart: unless-stopped`. Grafana declares `depends_on: prometheus`, and Prometheus declares `depends_on: myserver_node_exporter`.

The repository is the source of truth for image tags. Dependabot raises them monthly, so check `docker-compose.yml` if this table looks behind.

## Volumes

Three named volumes hold state:

| Volume | Mounted at | Holds |
| --- | --- | --- |
| `grafana_data` | `/var/lib/grafana` | Users, preferences, dashboards saved in the UI |
| `prometheus_data` | `/prometheus` | The time series database |
| `alertmanager_data` | `/alertmanager` | Silences and notification state |

`docker compose down` keeps them. `docker compose down -v` deletes them.

## Prometheus

Flags set in the compose file:

| Flag | Value |
| --- | --- |
| `--config.file` | `/etc/prometheus/prometheus.yml` |
| `--storage.tsdb.path` | `/prometheus` |
| `--storage.tsdb.retention.time` | `${PROMETHEUS_RETENTION:-30d}` |
| `--web.enable-lifecycle` | on |

Settings in `prometheus.yml`:

| Setting | Value |
| --- | --- |
| `global.scrape_interval` | 15s |
| `global.evaluation_interval` | 15s |
| Alertmanager target | `alertmanager:9093` |
| `rule_files` | `/etc/prometheus/rules/*.yml` |
| Job `node` | `myserver_node_exporter:9100`, every 5s, label `instance` |
| Job `cadvisor` | `cadvisor:8080`, every 10s |
| Job `prometheus` | `localhost:9090`, global interval |

The `node_alerts` rule group sets its own `interval: 30s`, which overrides the global evaluation interval for those rules.

Because the lifecycle API is on, a change to `prometheus.yml` or a rule file is applied with:

```bash
curl -X POST localhost:9090/-/reload
```

## Grafana provisioning

The compose file mounts `./grafana/provisioning` at `/etc/grafana/provisioning`.

**Data source.** One data source named `Prometheus`, type `prometheus`, URL `http://prometheus:9090`, access mode `proxy`. It is the default and is marked `editable: false`, so change it in the file and not in the UI.

**Dashboards.** One file provider named `default` reads `/etc/grafana/provisioning/dashboards/json` every 30 seconds and places dashboards in the root folder. `disableDeletion` is `false`. Dashboard panels reference the `${datasource}` template variable.

Details on the dashboard are in the [Node Exporter guide](./node-exporter#the-grafana-node-exporter-dashboard).

## Alertmanager

Started with `--config.file=/etc/alertmanager/alertmanager.yml` and `--storage.path=/alertmanager`. Routing values and receivers are covered in the [alerting guide](./alerting#how-alertmanager-routes).

## Validate a change

CI runs three checks on every push and pull request to `main`. Run the same ones locally before you commit:

```bash
docker compose config -q

docker run --rm \
  -v "$PWD/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  -v "$PWD/prometheus/rules:/etc/prometheus/rules:ro" \
  --entrypoint promtool prom/prometheus:v3.16.0 \
  check config /etc/prometheus/prometheus.yml

docker run --rm -v "$PWD/alertmanager:/cfg:ro" \
  --entrypoint amtool prom/alertmanager:v0.35.0 \
  check-config /cfg/alertmanager.yml
```

`docker compose config` warns that `version` is obsolete. The warning does not fail the check.

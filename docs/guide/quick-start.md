---
title: 'Quick start: Grafana Docker Compose'
description: Start Grafana, Prometheus, Alertmanager, Node Exporter and cAdvisor with Docker Compose. Covers the ports, the first login and the usual gotchas.
---

# Quick start with Docker Compose

This page takes you from an empty directory to a Grafana dashboard with live host metrics. The stack is five containers defined in one `docker-compose.yml`. There is nothing to build.

## What you need

- Docker with the Compose plugin, so that `docker compose` works.
- A Linux host. Node Exporter mounts the host root filesystem and cAdvisor mounts `/sys` and `/var/lib/docker`, which assumes a Linux Docker host.
- Host ports 1296, 9090, 9093, 9100 and 8080 free.

## Start the stack

```bash
git clone https://github.com/halitsever/grafana-docker-compose.git
cd grafana-docker-compose
cp .env.example .env
```

Open `.env` and replace the example password before the first start:

```ini
# Grafana
GF_SECURITY_ADMIN_PASSWORD=changeme
GF_SERVER_ROOT_URL=http://localhost:1296

# Prometheus
PROMETHEUS_RETENTION=30d
```

Then bring everything up:

```bash
docker compose up -d
docker compose ps
```

`docker compose` prints a warning that the `version` attribute is obsolete. It is harmless.

## Ports

| Service | URL | What you find there |
| --- | --- | --- |
| Grafana | `http://localhost:1296` | Dashboards |
| Prometheus | `http://localhost:9090` | Query UI, targets, alert state |
| Alertmanager | `http://localhost:9093` | Active alerts and silences |
| Node Exporter | `http://localhost:9100/metrics` | Raw host metrics |
| cAdvisor | `http://localhost:8080` | Container metrics and its own UI |

::: warning Grafana is on 1296, not 3000
The compose file maps host port 1296 to Grafana's container port 3000. If `localhost:3000` shows nothing, that is why.
:::

## First login

Open `http://localhost:1296` and sign in with the user `admin` and the password from `.env`. If you started the stack without a `.env` file, the compose default applies and the password is `admin`.

Grafana uses this variable when it creates its database on the first start. Editing `.env` later does not change the password of an admin user that already exists. Change it in the Grafana UI instead.

The Prometheus data source and a dashboard named **Node Exporter** are provisioned from files, so both exist as soon as Grafana is up. The dashboard lives at `http://localhost:1296/d/node-exporter`. The [Node Exporter guide](./node-exporter) explains each panel.

## Check that Prometheus sees its targets

Open `http://localhost:9090/targets`. You should see three jobs, all up:

| Job | Target | Interval |
| --- | --- | --- |
| `node` | `myserver_node_exporter:9100` | 5s |
| `cadvisor` | `cadvisor:8080` | 10s |
| `prometheus` | `localhost:9090` | 15s |

The loaded alert rules are listed at `http://localhost:9090/alerts`.

## Rename your server

The `node` job ships with a placeholder label. It shows up in the dashboard legend and in every alert summary, so change it early in `prometheus.yml`:

```yaml
- job_name: "node"
  scrape_interval: 5s
  static_configs:
    - targets: ["myserver_node_exporter:9100"]
      labels:
        instance: "My Favorite Server Name"
```

Prometheus runs with `--web.enable-lifecycle`, so you can apply the change without a restart:

```bash
curl -X POST localhost:9090/-/reload
```

## Before you expose it

All five ports are published on the host. Grafana has a login. Prometheus, Alertmanager, Node Exporter and cAdvisor do not. On a server with a public address, close 9090, 9093, 9100 and 8080 with a firewall or remove those `ports` entries. The containers still reach each other over the compose network by service name.

## Stop or remove

```bash
docker compose down      # stop, keep data
docker compose down -v   # stop and delete the three named volumes
```

Next: [set up alert delivery](./alerting), or read the [configuration reference](./configuration).

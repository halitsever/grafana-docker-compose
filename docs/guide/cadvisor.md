---
title: cAdvisor Docker container monitoring
description: What cAdvisor is and how this stack runs it for Docker container monitoring with Prometheus and Grafana, including why it needs privileged mode.
---

# cAdvisor for Docker container monitoring

cAdvisor, short for Container Advisor, is an open source tool from Google that reports resource usage per container. It watches the containers on a host and exposes CPU, memory, filesystem and network figures for each one, both in its own web UI and as Prometheus metrics.

Node Exporter answers "how is the server doing". cAdvisor answers "which container is using it". This stack runs both.

## How the stack runs cAdvisor

```yaml
cadvisor:
  image: ghcr.io/google/cadvisor:v0.61.1
  ports:
    - "8080:8080"
  restart: unless-stopped
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker:/var/lib/docker:ro
    - /dev/disk:/dev/disk:ro
  privileged: true
```

Each mount is read-only and has a purpose:

| Mount | Why cAdvisor needs it |
| --- | --- |
| `/` at `/rootfs` | Host filesystem usage |
| `/var/run` | The Docker socket, to list containers and their names |
| `/sys` | Kernel cgroup data, where per-container CPU and memory counters live |
| `/var/lib/docker` | Docker's data directory, for image and container layer sizes |
| `/dev/disk` | Disk device details |

`privileged: true` gives the container the access it needs to read all of that.

cAdvisor's own UI is at `http://localhost:8080`. The metrics endpoint Prometheus reads is `http://localhost:8080/metrics`.

## The scrape job

Prometheus scrapes cAdvisor every 10 seconds:

```yaml
- job_name: "cadvisor"
  scrape_interval: 10s
  static_configs:
    - targets: ["cadvisor:8080"]
```

`cadvisor:8080` is the service name on the compose network, so the scrape works even if you stop publishing port 8080 on the host.

## Query container metrics

The stack does not ship a container dashboard. The provisioned dashboard covers the host only. Container metrics are in Prometheus from the first scrape, so you can explore them in Grafana's Explore view or at `http://localhost:9090`.

CPU cores used per container, averaged over five minutes:

```txt
sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[5m]))
```

Memory in use per container:

```txt
container_memory_working_set_bytes{name!=""}
```

Network traffic received per container, in bytes per second:

```txt
sum by (name) (rate(container_network_receive_bytes_total{name!=""}[5m]))
```

The `name!=""` filter keeps named containers and drops the cgroup rows that have no container name.

To keep a panel built from these queries, save the dashboard JSON into `grafana/provisioning/dashboards/json/`. Grafana rescans that folder every 30 seconds. Use the `${datasource}` variable for the data source, the same way the Node Exporter dashboard does.

## Alerts for containers

None of the shipped rules look at container metrics. `InstanceDown` is the one rule that covers cAdvisor: it fires when any scrape target, including the `cadvisor` job, has been unreachable for a minute. If you want container alerts, add a new file under `prometheus/rules/`. Prometheus loads every `*.yml` file in that directory. The [alerting guide](./alerting) shows the format.

## Missing container metrics on Docker Swarm

`docker stack deploy` ignores `privileged`. If you deployed the stack to Swarm and container metrics are missing, that is the likely reason. Start the stack with `docker compose up -d` instead, which honours the flag. The [Swarm guide](./docker-swarm) lists the other differences.

## Troubleshooting

- **Target is down.** Open `http://localhost:9090/targets` and read the error next to the `cadvisor` job. Then check `docker compose logs cadvisor`.
- **Port 8080 is taken.** Many applications use 8080. Change the host side of the mapping, for example `"8081:8080"`. Leave the scrape target alone, because Prometheus talks to the container port.
- **You do not want the UI public.** cAdvisor has no login. Remove the `ports` entry or block 8080 at the firewall.

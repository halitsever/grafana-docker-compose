---
title: Node Exporter with Docker Compose
description: What Node Exporter is, how this stack runs it in Docker Compose, and what each panel of the provisioned Grafana Node Exporter dashboard queries.
---

# Node Exporter and the Grafana dashboard

Node Exporter is the Prometheus exporter for host metrics. It reads CPU, memory, filesystem, disk and network counters from the Linux kernel and serves them as plain text on port 9100. It stores nothing. Prometheus fetches that page on a schedule and keeps the history.

In this stack Node Exporter is the source for the provisioned dashboard and for seven of the eight alert rules.

## How the stack runs Node Exporter

The service is called `myserver_node_exporter` in `docker-compose.yml`:

```yaml
myserver_node_exporter:
  image: prom/node-exporter:v1.12.1
  ports:
    - "9100:9100"
  restart: unless-stopped
  command:
    - --path.rootfs=/host
  volumes:
    - /:/host:ro,rslave
```

A container normally sees only its own filesystem. The volume mounts the host root at `/host`, read-only, and `--path.rootfs=/host` tells the exporter to treat that path as the real root. This is why the disk panels and disk alerts can filter on `mountpoint="/"` and get the host's root filesystem.

You can look at the raw output at `http://localhost:9100/metrics`.

::: tip Network panels
The container is attached to the compose network, not the host network. Interface metrics therefore describe the interfaces the container can see. If you need the host's own interfaces, run the exporter with host networking and point the scrape target at the host address.
:::

## The scrape job

`prometheus.yml` scrapes the exporter every 5 seconds, faster than the 15 second global default:

```yaml
- job_name: "node"
  scrape_interval: 5s
  static_configs:
    - targets: ["myserver_node_exporter:9100"]
      labels:
        instance: "My Favorite Server Name"
    # - targets: ["anotherserver_node_exporter:9100"]
    #   labels:
    #     instance: "Another Server"
```

The `instance` label replaces the default `host:port` value with a readable name. Change the placeholder to your server's name.

### Monitor more servers

Run Node Exporter on the other machine, make port 9100 reachable from Prometheus, and add a second entry under the same job with its own `instance` label. The commented lines show the shape. Reload Prometheus afterwards:

```bash
curl -X POST localhost:9090/-/reload
```

Every panel and alert groups by `instance`, so a new server appears on the dashboard without editing it.

## The Grafana Node Exporter dashboard

Grafana loads one dashboard from `grafana/provisioning/dashboards/json/node-exporter.json`. Its title is **Node Exporter**, its uid is `node-exporter`, it refreshes every 30 seconds and opens on the last hour.

| Panel | Type | Query |
| --- | --- | --- |
| CPU Usage | Gauge | `100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` |
| Memory Usage | Gauge | `100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)` |
| Disk Usage (/) | Gauge | `100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) * 100)` |
| Instance Status | Stat | `up{job="node"}` |
| CPU Usage Over Time | Time series | `(1 - avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])))` |
| Memory Usage Over Time | Time series | `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes` and `node_memory_MemTotal_bytes` |
| Network I/O | Time series | `irate(node_network_receive_bytes_total{device!~"lo"}[5m])` and the matching transmit counter |
| Disk I/O | Time series | `irate(node_disk_read_bytes_total[5m])` and `irate(node_disk_written_bytes_total[5m])` |

The CPU and memory gauges turn yellow at 70% and red at 90%. The disk gauge turns yellow at 70% and red at 85%. The red marks match the thresholds of the warning alerts in `prometheus/rules/node.yml`.

### Editing the dashboard

The provider in `grafana/provisioning/dashboards/dashboard.yml` rescans its folder every 30 seconds, so a saved JSON file shows up without restarting Grafana. Two details matter when you change it:

- Panels use the `${datasource}` template variable, not a fixed data source uid. Keep that when you add panels so the dashboard works on any install.
- The same JSON also sits in `grafana/dashboards/node-exporter.json`. Only the copy under `provisioning` is mounted into the container. Keep the two files identical.

To add your own dashboard, drop another JSON file next to the existing one.

Related: [alert rules built on these metrics](./alerting) and [cAdvisor for container metrics](./cadvisor).

---
title: "cAdvisor Metrics You Should Graph"
titleTemplate: false
description: "The cAdvisor metrics worth graphing for Docker containers: CPU, working set memory, throttling, network, filesystem and restarts, with PromQL for each one."
headline: "The cAdvisor container metrics worth a Grafana panel"
date: "2026-11-28"
keyword: "cadvisor metrics"
faq: [{"q": "Does cAdvisor have a container restart count metric?", "a": "No. cAdvisor exports container_start_time_seconds, which changes when a container restarts. changes() over that metric counts restarts. The restart counter people often quote comes from kube-state-metrics in Kubernetes."}, {"q": "Should I graph container_memory_usage_bytes or container_memory_working_set_bytes?", "a": "Working set. Usage includes page cache that the kernel can reclaim. Working set is closer to what is at risk when a memory limit is hit."}, {"q": "Why do I see rows with an empty name label?", "a": "cAdvisor reports every cgroup, including system slices that are not containers. Filter them out with name!= followed by empty quotes."}]
---

::: v-pre

# The cAdvisor container metrics worth a Grafana panel

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">cAdvisor exports a long list of container metrics, and most of them you will never look at. These are the ones that answer which container is using the server, with a PromQL query for each. The stack already scrapes them every 10 seconds; it just ships no dashboard for them.</p>

## How the stack collects them

The `cadvisor` service publishes its metrics on port 8080, and Prometheus scrapes the `cadvisor` job every 10 seconds. Every metric below is in Prometheus from the first scrape. Open Grafana's **Explore** view (port 1296) or Prometheus itself (port 9090) and paste the queries. Setup and the reasons for `privileged: true` are in the [cAdvisor guide](/guide/cadvisor).

Names and descriptions come from cAdvisor's [Prometheus metrics list](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md).

## Filter out non-containers

cAdvisor reports every cgroup on the host, including system slices. Docker containers carry a `name` label with the container name. Add `name!=""` to every query to keep only named containers.

## CPU

`container_cpu_usage_seconds_total` is a counter of CPU seconds consumed. Its rate is the number of cores in use:

```txt
sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[5m]))
```

A value of 0.5 means half a core. To see a container against its limit, divide by the quota. For containers started with `--cpus`, cAdvisor exports `container_spec_cpu_quota` and `container_spec_cpu_period`:

```txt
sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[5m]))
/ on (name) (container_spec_cpu_quota{name!=""} / container_spec_cpu_period{name!=""})
```

## CPU throttling

A container with a CPU limit is throttled when it wants more than its share. That shows up as latency, not as high CPU:

```txt
rate(container_cpu_cfs_throttled_periods_total{name!=""}[5m])
/ rate(container_cpu_cfs_periods_total{name!=""}[5m])
```

The result is the fraction of scheduling periods in which the container was throttled. Containers without a limit report no periods.

## Memory

| Metric | What it counts |
| --- | --- |
| `container_memory_usage_bytes` | All memory, including page cache |
| `container_memory_working_set_bytes` | Current working set |
| `container_memory_rss` | Anonymous memory (RSS) |
| `container_memory_cache` | Page cache |
| `container_spec_memory_limit_bytes` | The limit, 0 when none is set |

Graph the working set. Usage includes cache that the kernel frees under pressure, so it often looks alarming when nothing is wrong:

```txt
container_memory_working_set_bytes{name!=""}
```

Against a limit, for containers that have one:

```txt
container_memory_working_set_bytes{name!=""}
/ (container_spec_memory_limit_bytes{name!=""} > 0)
```

Out-of-memory kills are counted directly:

```txt
increase(container_oom_events_total{name!=""}[1h])
```

## Network

```txt
sum by (name) (rate(container_network_receive_bytes_total{name!=""}[5m]))
sum by (name) (rate(container_network_transmit_bytes_total{name!=""}[5m]))
```

Bytes per second in and out. Containers that share the host network do not get their own figures.

## Filesystem and disk I/O

```txt
# bytes the container uses on its filesystems
container_fs_usage_bytes{name!=""}

# disk reads and writes per second
sum by (name) (rate(container_fs_reads_bytes_total{name!=""}[5m]))
sum by (name) (rate(container_fs_writes_bytes_total{name!=""}[5m]))
```

## Restarts

There is no restart counter in cAdvisor's list. What it has is `container_start_time_seconds`, the start time of the container. A restart changes it, so counting changes counts restarts:

```txt
changes(container_start_time_seconds{name!=""}[1h])
```

A container stuck in a restart loop shows up here long before anyone opens `docker ps`. `container_last_seen` (the last time cAdvisor saw a container) helps with the opposite case, a container that disappeared:

```txt
time() - container_last_seen{name!=""} > 60
```

## Turning queries into a dashboard

1. Build the panels in Grafana, using the `${datasource}` variable as the data source, the same way the provisioned [Node Exporter dashboard](/node-exporter-dashboard/) does.
2. Export the JSON (**Export** → **Export as code**).
3. Save it next to `node-exporter.json` in `grafana/provisioning/dashboards/json/`. Grafana loads it within 30 seconds.

[Export, import and copy a Grafana dashboard](/blog/grafana-export-import-dashboard) has the details.

## Alerting on containers

None of the eight shipped rules read cAdvisor metrics. `InstanceDown` only tells you when cAdvisor itself stops answering. A first container rule could be a restart loop:

```yaml
- alert: ContainerRestarting
  expr: changes(container_start_time_seconds{name!=""}[15m]) > 2
  for: 0m
  labels:
    severity: warning
  annotations:
    summary: "Container {{ $labels.name }} restarted more than twice in 15 minutes"
```

Save it as a new file in `prometheus/rules/` and reload Prometheus. The [template post](/blog/prometheus-alert-rule-templates) explains the `$labels` part.

## FAQ

### Does cAdvisor have a container restart count metric?

No. cAdvisor exports container_start_time_seconds, which changes when a container restarts. changes() over that metric counts restarts. The restart counter people often quote comes from kube-state-metrics in Kubernetes.

### Should I graph container_memory_usage_bytes or container_memory_working_set_bytes?

Working set. Usage includes page cache that the kernel can reclaim. Working set is closer to what is at risk when a memory limit is hit.

### Why do I see rows with an empty name label?

cAdvisor reports every cgroup, including system slices that are not containers. Filter them out with name!= followed by empty quotes.

## Related posts

- [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)
- [Moving Grafana dashboards around as JSON](/blog/grafana-export-import-dashboard)
- [Which registry to pull the cAdvisor image from](/blog/cadvisor-image-gcr-vs-docker-hub)
- [All posts](/blog/)

:::

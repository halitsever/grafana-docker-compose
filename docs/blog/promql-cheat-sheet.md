---
title: "PromQL Cheat Sheet With Node Exporter Examples"
titleTemplate: false
description: "A PromQL cheat sheet built on a real Node Exporter stack: selectors, matchers, range vectors, rate, aggregation, comparisons and the functions alerts use."
headline: "The PromQL queries you need for one server, on one page"
date: "2026-11-28"
keyword: "promql cheat sheet"
faq: [{"q": "What is PromQL?", "a": "The Prometheus Query Language. It selects time series by metric name and labels, and lets you compute rates, aggregate across labels, compare values and call functions. Grafana panels and Prometheus alert rules both use it."}, {"q": "Where can I try PromQL queries?", "a": "In the Prometheus web UI. In this stack it is on port 9090, under Query. Grafana's Explore view sends the same queries to the Prometheus data source."}, {"q": "What is the difference between an instant vector and a range vector?", "a": "An instant vector has one sample per series, the latest one. A range vector, written with a duration in square brackets such as [5m], has every sample in that window. Functions like rate() need a range vector."}]
---

::: v-pre

# The PromQL queries you need for one server, on one page

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">PromQL is the query language of Prometheus, and Grafana panels and alert rules in this stack are all written in it. This page collects the pieces you reach for most, each one shown with the metrics this stack really collects, so you can paste a query into the Prometheus UI on port 9090 and see the same shape of result.</p>

The outputs below come from running this repository's `prometheus.yml` and `prometheus/rules/node.yml` on Prometheus v3.16.0 with node-exporter v1.12.1 in Docker on 28 November 2026. cAdvisor was not started, so its target shows as down. Values change from machine to machine; the labels and the shape of each result are what to look at.

## Selectors

| Query | Returns |
| --- | --- |
| `up` | Every series of the metric `up`, one per scrape target |
| `up{job="node"}` | Only series whose `job` label equals `node` |
| `up{job!="prometheus"}` | Every series except that job |
| `up{job=~"node\|prometheus"}` | Regex match, here two jobs |
| `up{instance!~".*:.*"}` | Regex non-match, here targets without a port |
| `{__name__=~"node_load.*"}` | Any metric whose name matches |

The [querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) say regex matches are fully anchored, so `=~"node"` matches only the exact value `node`. On this stack, `up{instance!~".*:.*"}` returned one series: the node target, because the repository replaces its `instance` with the label `My Favorite Server Name`.

## Instant and range vectors

```promql
node_load15                                   # instant vector: latest sample per series
node_cpu_seconds_total{cpu="0",mode="idle"}[5m]   # range vector: every sample in the last 5 minutes
rate(node_cpu_seconds_total{mode="idle"}[5m] offset 1h)   # the same window, one hour earlier
```

A range vector cannot be graphed directly. Wrap it in a function such as `rate()`. The window must hold at least two samples. The node job scrapes every 5 seconds here, so even `[10s]` returned a value, but the repository's panels and rules use `[5m]`.

## Rates of counters

| Query | Use |
| --- | --- |
| `rate(node_network_receive_bytes_total[5m])` | Average bytes per second over 5 minutes |
| `irate(node_disk_read_bytes_total[5m])` | Rate from the last two samples, for spiky graphs |
| `increase(node_network_receive_errs_total[1h])` | Total increase over the hour |

The [rate post](/blog/promql-rate) explains when each one fits and why the docs prefer `rate` in alerts.

## Aggregation

```promql
sum(rate(node_cpu_seconds_total[5m]))                       # one number
sum by (mode) (rate(node_cpu_seconds_total[5m]))            # one series per CPU mode
avg without (cpu) (rate(node_cpu_seconds_total{mode="idle"}[5m]))
count(node_cpu_seconds_total{mode="idle"})                   # number of CPUs
topk(3, node_filesystem_size_bytes)                          # three largest filesystems
```

On the test machine `count(...)` returned `10`, one idle series per CPU core, and `sum by (mode)` returned eight series, one per mode. More in the [group by post](/blog/promql-group-by).

## The queries this stack ships

These come from the provisioned dashboard and from `node.yml`:

| What | Query |
| --- | --- |
| CPU busy, percent | `100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` |
| Memory used, percent | `100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)` |
| Root disk used, percent | `100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) * 100)` |
| Load per CPU | `node_load15 / count(node_cpu_seconds_total{mode="idle"}) without (cpu, mode)` |
| Target down | `up == 0` |

The [Node Exporter dashboard page](/node-exporter-dashboard/) lists every panel query.

## Comparisons and conditions

```promql
up == 0                    # keeps only series that are 0
up == bool 0               # keeps every series, value 1 where true and 0 where false
sum(up{job="nope"}) or vector(0)   # 0 instead of an empty result
absent(up{job="nope"})     # 1 when no such series exists
```

Comparisons filter by default, which is how alert rules work: a rule fires for every series the expression returns. The [PromQL if post](/blog/promql-if-function) covers the patterns that stand in for an if statement.

## Labels

```promql
label_replace(up, "target", "$1", "instance", "(.*):.*")
```

This copied the host part of `instance` into a new `target` label: `cadvisor` for `cadvisor:8080` and `localhost` for `localhost:9090`. The node series, whose `instance` has no colon, came back unchanged. Details in the [label_replace post](/blog/promql-label-replace).

## Functions for alerts and capacity

| Function | Example |
| --- | --- |
| `predict_linear` | `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 4 * 3600) < 0` |
| `absent_over_time` | `absent_over_time(up{job="node"}[10m])` |
| `clamp_min` | `clamp_min(node_memory_MemAvailable_bytes, 0)` |
| `time` | `time() - node_boot_time_seconds` (uptime in seconds) |

All of them are described in the [functions reference](https://prometheus.io/docs/prometheus/latest/querying/functions/). Before a new rule goes live, check it with [promtool](/blog/promtool).

## FAQ

### What is PromQL?

The Prometheus Query Language. It selects time series by metric name and labels, and lets you compute rates, aggregate across labels, compare values and call functions. Grafana panels and Prometheus alert rules both use it.

### Where can I try PromQL queries?

In the Prometheus web UI. In this stack it is on port 9090, under Query. Grafana's Explore view sends the same queries to the Prometheus data source.

### What is the difference between an instant vector and a range vector?

An instant vector has one sample per series, the latest one. A range vector, written with a duration in square brackets such as [5m], has every sample in that window. Functions like rate() need a range vector.

## Related posts

- [Writing if-then logic in PromQL with filters and bool](/blog/promql-if-function)
- [Counting per second in PromQL: rate, irate and increase](/blog/promql-rate)
- [Grouping PromQL results with by and without](/blog/promql-group-by)
- [All posts](/blog/)

:::

---
title: "PromQL rate vs irate vs increase, With Examples"
titleTemplate: false
description: "How PromQL rate, irate and increase work on counters, how to pick the range, why the docs prefer rate for alerts, and where this stack still uses irate."
headline: "Counting per second in PromQL: rate, irate and increase"
date: "2026-11-28"
keyword: "promql rate"
faq: [{"q": "What is the difference between rate and irate in PromQL?", "a": "rate averages the per-second increase over the whole range. irate uses only the last two samples in the range. The Prometheus docs say irate should only be used for graphing volatile, fast-moving counters, and rate for alerts and slow-moving counters."}, {"q": "What range should I use with rate?", "a": "The range must contain at least two samples, so it has to be longer than the scrape interval. This stack scrapes Node Exporter every 5 seconds and uses [5m] in its panels and rules, which smooths out single slow scrapes."}, {"q": "Should I sum before or after rate?", "a": "After. The functions reference says to take rate first and aggregate afterwards, otherwise rate cannot detect counter resets when a target restarts."}]
---

::: v-pre

# Counting per second in PromQL: rate, irate and increase

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">Most of what Node Exporter and cAdvisor export are counters: numbers that only go up, such as seconds of CPU time or bytes received. Graphing them raw shows a rising line. rate, irate and increase turn them into something you can read. This post explains the difference with queries from this stack, and points out one place where the stack does not follow the documentation's advice.</p>

The outputs below come from running this repository's `prometheus.yml` and `prometheus/rules/node.yml` on Prometheus v3.16.0 with node-exporter v1.12.1 in Docker on 28 November 2026. cAdvisor was not started, so its target shows as down. Values change from machine to machine; the labels and the shape of each result are what to look at.

## Counters need a rate

```promql
node_cpu_seconds_total{cpu="0", mode="idle"}
```

On the test machine that returned `505394.79`: seconds CPU 0 had spent idle since boot. The number is correct and useless on a graph. What you want is how fast it grows.

## rate()

The [functions reference](https://prometheus.io/docs/prometheus/latest/querying/functions/) describes `rate()` as the per-second average rate of increase over the range. It adjusts for counter resets, so a restarted exporter does not produce a negative spike, and it extrapolates to the edges of the window.

```promql
rate(node_cpu_seconds_total{cpu="0", mode="idle"}[5m])
```

The result is in seconds of idle time per second, a value between 0 and 1 for one CPU. The docs call `rate` best suited for alerting and for graphing slow-moving counters.

## irate()

`irate()` looks only at the last two samples in the range. The range just sets how far back it may look for them.

```promql
irate(node_cpu_seconds_total{cpu="0", mode="idle"}[5m])
```

Run back to back on the same busy machine, the two queries returned `0.113` for `rate` and `0.494` for `irate`: the five-minute average and the last five seconds. On a graph, `irate` shows every spike and `rate` shows the trend.

The docs are explicit: `irate` should only be used when graphing volatile, fast-moving counters. For alerts, use `rate`, because brief changes can reset the `for` clause of a rule.

## increase()

`increase()` is `rate()` multiplied by the length of the window, written for readability:

```promql
increase(node_network_receive_errs_total[1h])
```

That is the number of receive errors in the last hour. Because of extrapolation, the docs note, it can return a non-integer even though the counter only grows by whole numbers.

## Choosing the range

- It must hold at least two samples. Node Exporter is scraped every 5 seconds here, so `[10s]` already worked on the test machine. cAdvisor is scraped every 10 seconds and Prometheus itself every 15.
- Longer ranges smooth more. `[5m]` is what the repository's dashboard and rules use.
- In Grafana, the `$__rate_interval` variable picks a range from the panel's resolution and the scrape interval, which avoids empty panels when you zoom out.

## Rate first, then aggregate

```promql
sum by (instance) (rate(node_network_receive_bytes_total[5m]))   # right
rate(sum by (instance) (node_network_receive_bytes_total)[5m:])  # wrong
```

The functions reference gives the reason: aggregate first and `rate` can no longer see counter resets when a target restarts. The [group by post](/blog/promql-group-by) has more on the aggregation side.

## Where this stack uses irate

The repository's `HighCpuUsage` rule in [prometheus/rules/node.yml](https://github.com/halitsever/grafana-docker-compose/blob/main/prometheus/rules/node.yml) is:

```promql
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
```

with `for: 5m`, and `HighNetworkErrors` also uses `irate`. That is the case the documentation warns about: one quiet five-second interval resets the five-minute wait, so a CPU that is busy most of the time may never fire. If you depend on these alerts, switch them to `rate`:

```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
```

The dashboard panels use `irate` too, which suits a live graph. The [cAdvisor metrics post](/blog/cadvisor-metrics) uses `rate` for container CPU for the same reason.

## FAQ

### What is the difference between rate and irate in PromQL?

rate averages the per-second increase over the whole range. irate uses only the last two samples in the range. The Prometheus docs say irate should only be used for graphing volatile, fast-moving counters, and rate for alerts and slow-moving counters.

### What range should I use with rate?

The range must contain at least two samples, so it has to be longer than the scrape interval. This stack scrapes Node Exporter every 5 seconds and uses [5m] in its panels and rules, which smooths out single slow scrapes.

### Should I sum before or after rate?

After. The functions reference says to take rate first and aggregate afterwards, otherwise rate cannot detect counter resets when a target restarts.

## Related posts

- [The PromQL queries you need for one server, on one page](/blog/promql-cheat-sheet)
- [Grouping PromQL results with by and without](/blog/promql-group-by)
- [The cAdvisor container metrics worth a Grafana panel](/blog/cadvisor-metrics)
- [All posts](/blog/)

:::

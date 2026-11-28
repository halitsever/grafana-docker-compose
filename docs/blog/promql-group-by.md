---
title: "PromQL Group By: sum by, avg by and without"
titleTemplate: false
description: "Group by in PromQL: sum by, avg by, count by and without, where the clause can go, how labels are dropped, and examples from a Node Exporter stack."
headline: "Grouping PromQL results with by and without"
date: "2026-11-28"
keyword: "promql group by"
faq: [{"q": "How do I group by a label in PromQL?", "a": "Put by (label) on an aggregation operator, for example sum by (mode) (rate(node_cpu_seconds_total[5m])). The result has one series per value of that label."}, {"q": "What is the difference between by and without in PromQL?", "a": "by keeps only the labels you list and drops the rest. without drops the labels you list and keeps the rest. without is handy when you want to remove one label such as cpu and keep everything else."}, {"q": "Can the by clause go after the expression?", "a": "Yes. The operators page says the clause may be used before or after the expression, so sum by (job) (up) and sum(up) by (job) are the same query."}]
---

::: v-pre

# Grouping PromQL results with by and without

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">PromQL has no GROUP BY keyword, but every aggregation operator takes a by or without clause that does the same job. This post shows how they decide which labels survive, with the CPU, disk and target metrics this stack collects.</p>

The outputs below come from running this repository's `prometheus.yml` and `prometheus/rules/node.yml` on Prometheus v3.16.0 with node-exporter v1.12.1 in Docker on 28 November 2026. cAdvisor was not started, so its target shows as down. Values change from machine to machine; the labels and the shape of each result are what to look at.

## The syntax

From the [operators page](https://prometheus.io/docs/prometheus/latest/querying/operators/):

```text
<aggr-op> [without|by (<label list>)] ([parameter,] <vector expression>)
```

The operators are `sum`, `avg`, `min`, `max`, `count`, `group`, `stddev`, `stdvar`, `topk`, `bottomk`, `limitk`, `limit_ratio`, `count_values` and `quantile`. The clause can go before or after the expression.

## No clause: one series

```promql
sum(rate(node_cpu_seconds_total[5m]))
```

Every label is dropped and one series with an empty label set, `{}`, comes back.

## by: keep only these labels

```promql
sum by (mode) (rate(node_cpu_seconds_total[5m]))
```

This returned eight series, `{mode="idle"}`, `{mode="iowait"}`, `{mode="irq"}` and so on. Every other label, including `instance` and `cpu`, was dropped.

The dashboard's CPU panel uses `avg by(instance)`, which turns one series per core into one per server:

```promql
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

## without: drop only these labels

```promql
avg without (cpu) (rate(node_cpu_seconds_total{mode="idle"}[5m]))
```

The result kept `instance`, `job` and `mode` and removed `cpu`. Use `without` when the series carry labels you want to keep but do not want to list, which matters once you add relabeling or more targets.

The `SystemLoad` rule in the repository uses it in the trailing form:

```promql
node_load15 / count(node_cpu_seconds_total{mode="idle"}) without (cpu, mode) > 2
```

`count ... without (cpu, mode)` leaves `instance` and `job`, the same labels `node_load15` has, so the division matches one to one.

## sum by vs count by

```promql
sum by (job) (up)     # targets that are up, per job
count by (job) (up)   # targets in total, per job
```

On this stack, `sum by (job)` returned `0` for cadvisor, because it was not running, and `count by (job)` returned `1` for every job. The pair gives you a ratio of healthy targets.

## Grouping changes what you can divide

Binary operators match series by their full label sets. If one side is grouped `by (instance)` and the other still has `cpu` and `mode`, nothing matches and the result is empty. Group both sides to the same labels, or use `on (...)` and `ignoring (...)` on the operator. The [PromQL if post](/blog/promql-if-function) shows `and on (instance)`.

## Order: rate first

Aggregate the output of `rate()`, never the raw counter. The [rate post](/blog/promql-rate) explains the counter reset problem.

## topk and friends

```promql
topk(3, node_filesystem_size_bytes)
```

On the test machine this returned three entries for the same 92.5 GB disk: `/`, `/etc/hostname` and `/etc/hosts`. Inside a container, Docker's bind-mounted files show up as their own mount points. Filter with `mountpoint="/"` as the repository's disk rules do, or add `fstype` and `mountpoint` conditions before ranking.

## FAQ

### How do I group by a label in PromQL?

Put by (label) on an aggregation operator, for example sum by (mode) (rate(node_cpu_seconds_total[5m])). The result has one series per value of that label.

### What is the difference between by and without in PromQL?

by keeps only the labels you list and drops the rest. without drops the labels you list and keeps the rest. without is handy when you want to remove one label such as cpu and keep everything else.

### Can the by clause go after the expression?

Yes. The operators page says the clause may be used before or after the expression, so sum by (job) (up) and sum(up) by (job) are the same query.

## Related posts

- [The PromQL queries you need for one server, on one page](/blog/promql-cheat-sheet)
- [Counting per second in PromQL: rate, irate and increase](/blog/promql-rate)
- [Rewriting labels at query time with label_replace](/blog/promql-label-replace)
- [All posts](/blog/)

:::

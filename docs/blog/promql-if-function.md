---
title: "PromQL If Statement: Conditions Without an if()"
titleTemplate: false
description: "PromQL has no if function. How comparison filters, the bool modifier, and, or, unless and vector(0) express conditions in queries, panels and alert rules."
headline: "Writing if-then logic in PromQL with filters and bool"
date: "2026-11-28"
keyword: "promql if function"
faq: [{"q": "Does PromQL have an if function?", "a": "No. The PromQL function list has no if or case. Comparisons such as > or == filter out series that do not match, and the bool modifier returns 1 or 0 instead of filtering."}, {"q": "How do I return 0 instead of no data in PromQL?", "a": "Add or vector(0) to an aggregated expression, for example sum(up{job=\"api\"}) or vector(0). vector(0) has no labels, so it only fills in when the left side is empty."}, {"q": "How do I combine two conditions in PromQL?", "a": "Use and between two filtering expressions. The result keeps the left-hand series that also have a match on the right, matched on all labels unless you add on() or ignoring()."}]
---

::: v-pre

# Writing if-then logic in PromQL with filters and bool

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">People coming from SQL or spreadsheets look for an if() function in PromQL. There is none. Conditions are expressed with comparison operators that filter series, the bool modifier that turns a comparison into 0 or 1, and the set operators and, or and unless. This post shows each one with real results from this stack.</p>

The outputs below come from running this repository's `prometheus.yml` and `prometheus/rules/node.yml` on Prometheus v3.16.0 with node-exporter v1.12.1 in Docker on 28 November 2026. cAdvisor was not started, so its target shows as down. Values change from machine to machine; the labels and the shape of each result are what to look at.

## Comparisons filter

The [operators page](https://prometheus.io/docs/prometheus/latest/querying/operators/) puts it in three words: by default they filter. A comparison keeps the series for which it is true and drops the rest.

```promql
up == 0
```

On this stack that returned one series, the cAdvisor target, with its value `0`. The other two targets disappeared from the result. This is the whole idea behind alert rules. The repository's `InstanceDown` rule is exactly `up == 0` with `for: 1m`: every series that survives the filter for a minute becomes an alert.

Thresholds work the same way:

```promql
100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 90
```

That returns the memory percentage only while it is above 90, and nothing otherwise.

## bool: a true or false value

Add `bool` after the operator and nothing is dropped. Each series gets `1` where the comparison is true and `0` where it is false:

```promql
up == bool 0
```

| Series | Value |
| --- | --- |
| `{instance="localhost:9090", job="prometheus"}` | 0 |
| `{instance="cadvisor:8080", job="cadvisor"}` | 1 |
| `{instance="My Favorite Server Name", job="node"}` | 0 |

Note that the metric name is gone. A `bool` comparison produces a new value, so Prometheus drops `__name__`. The plain filter kept it.

Use `bool` for Grafana stat panels and for counting: `sum(up == bool 0)` is the number of targets that are down, as a number even when it is zero. Between two scalars the docs say `bool` is required.

## and, or, unless

The set operators work between instant vectors and match series on their labels ([operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)):

| Expression | Keeps |
| --- | --- |
| `a and b` | Series of `a` that have a matching series in `b` |
| `a or b` | All of `a`, plus series of `b` with no match in `a` |
| `a unless b` | Series of `a` that have no match in `b` |

A two-condition alert, high memory while the machine is also loaded:

```promql
(100 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90)
  and on (instance)
(node_load15 / count without (cpu, mode) (node_cpu_seconds_total{mode="idle"}) > 2)
```

`on (instance)` matters. Without it, `and` compares every label, and two different metrics rarely share all of them.

## A default value: or vector(0)

An expression that matches nothing returns no data, which Grafana shows as an empty panel. `vector(0)` is a single series with no labels and the value 0, so `or` fills the gap:

```promql
sum(up{job="nope"}) or vector(0)
```

That returned `{}` with the value `0`. Use it after an aggregation, not on raw series. On this stack, `up{job="cadvisor"} == 0 or vector(0)` returned two series, the cAdvisor one and the label-less zero, because `or` only skips the right side when the labels match.

## Alert when something is missing

A filter cannot fire on a series that does not exist. `absent()` covers that case:

```promql
absent(up{job="nope"})
```

It returned `{job="nope"}` with the value 1. For a target that might vanish from service discovery, `absent_over_time(up{job="node"}[10m])` does the same over a window.

## Picking between two values

There is no `if a then x else y`, but a filter on the left of `or` does the job. The left side only exists while the condition holds, and `or` falls back to the right side for every series it does not cover:

```promql
(up == 0) + 100
  or on (instance, job)
up * 5
```

On this stack the cAdvisor target, which was down, came back as `100`, and the two healthy targets as `5`. Write the condition as a plain filter, not with `bool`: a `bool` comparison returns a series in both cases, so `or` never reaches the right side.

If an expression like that grows past two lines, a recording rule or two separate panels are usually easier to read. The [alert template post](/blog/prometheus-alert-rule-templates) shows how to put the value of a filtered series into the alert text.

## FAQ

### Does PromQL have an if function?

No. The PromQL function list has no if or case. Comparisons such as > or == filter out series that do not match, and the bool modifier returns 1 or 0 instead of filtering.

### How do I return 0 instead of no data in PromQL?

Add or vector(0) to an aggregated expression, for example sum(up{job="api"}) or vector(0). vector(0) has no labels, so it only fills in when the left side is empty.

### How do I combine two conditions in PromQL?

Use and between two filtering expressions. The result keeps the left-hand series that also have a match on the right, matched on all labels unless you add on() or ignoring().

## Related posts

- [The PromQL queries you need for one server, on one page](/blog/promql-cheat-sheet)
- [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)
- [Grouping PromQL results with by and without](/blog/promql-group-by)
- [All posts](/blog/)

:::

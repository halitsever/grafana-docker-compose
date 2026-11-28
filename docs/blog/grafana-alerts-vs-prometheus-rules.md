---
title: "Grafana Alerts vs Prometheus Alert Rules"
titleTemplate: false
description: "Grafana-managed alert rules compared with Prometheus alert rules and Alertmanager: where each is evaluated, how to alert on the latest value, and which to pick."
headline: "Grafana-managed alerts or Prometheus rules: which to use"
date: "2026-11-28"
keyword: "grafana best practice prometheus alert on latest value"
---

::: v-pre

# Grafana-managed alerts or Prometheus rules: which to use

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">Grafana can alert on a Prometheus query, and so can Prometheus. Both can send email or Slack messages. This stack alerts in Prometheus and routes through Alertmanager. Here is how the two approaches differ, what Grafana's own docs recommend, and how each one alerts on the latest value of a metric.</p>

## Two places a rule can live

**Prometheus alert rules** are YAML files that Prometheus loads at start-up and evaluates on its own schedule. This stack keeps eight of them in `prometheus/rules/node.yml`, evaluated every 30 seconds. Firing alerts go to Alertmanager, which groups and sends them. Grafana is not involved at all: if Grafana is down, alerts still go out.

**Grafana-managed alert rules** are created in Grafana's UI (or provisioned), stored in Grafana's database and evaluated by Grafana. Grafana queries the data source, applies expressions and a condition, and sends notifications through its built-in Alertmanager or an external one.

Grafana also lists a third kind, **data source-managed rules**, which are rules stored in the data source itself. According to [Grafana's docs](https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-data-source-managed-rule/), you can create and edit those only for Mimir and Loki. For a plain Prometheus server, Grafana can show them (with "Manage alerts via Alerting UI" enabled) but not create or edit them. That is the case for this stack.

## Side by side

| | Prometheus rules + Alertmanager | Grafana-managed rules |
| --- | --- | --- |
| Where the rule is stored | Rule files on disk, in git | Grafana's database, or provisioning files |
| Who evaluates it | Prometheus | Grafana |
| Data sources | Only that Prometheus | Any backend data source with alerting, several in one rule |
| Still works when Grafana is down | Yes | No |
| Expressions (reduce, math, threshold) | Written in PromQL | Separate expression steps in the UI |
| Images of panels in notifications | No | Yes |
| Alert history and RBAC | Not built in | Yes |

The last three rows come from the comparison table in Grafana's documentation, which recommends Grafana-managed rules "whenever possible" for their feature set. That advice is written for people who already run Grafana as their alerting hub.

## Why this stack alerts in Prometheus

- **The rules are files.** They are reviewed in pull requests and checked by `promtool` in CI, the same as the rest of the config.
- **Fewer moving parts in the alert path.** Prometheus and Alertmanager are two small binaries. A Grafana upgrade, a broken plugin or a locked admin account cannot stop an alert.
- **One data source.** Everything the stack watches is already in Prometheus, so Grafana's multi-source rules add nothing yet.

If you add Loki for logs or want panel images in alerts, Grafana-managed rules become the better fit for those alerts. Nothing stops you from using both, but give each alert one home so you do not get two messages for the same problem.

## Alerting on the latest value

The keyword behind this post is a common question: how do you alert on the current value of a metric rather than an average over the graph?

**In Prometheus** an alert expression is an instant query. Each evaluation takes the latest sample of every series (within the lookback window), so `node_load15 > 4` is already "the latest value". Smoothing is something you add on purpose with a range function, as the stack's CPU rule does with `irate(...[5m])`. The `for: 5m` clause then requires the condition to hold on every evaluation for five minutes, which is how the rules avoid alerting on a single spike.

**In a Grafana-managed rule** the query and the condition are separate steps:

1. Write the PromQL query. For the latest value, set the query type to **Instant**.
2. If you leave it as a **Range** query, add a **Reduce** expression and pick **Last** to keep only the newest point. **Mean**, **Max** and **Min** are the other common choices.
3. Add a **Threshold** expression on the result and make it the alert condition.
4. Set the pending period, Grafana's equivalent of `for`.

A Range query reduced with **Last** and an Instant query give the same answer for most metrics. The Instant query asks Prometheus for less data.

## Moving a rule between the two

The stack's `HighMemoryUsage` rule in Prometheus form:

```yaml
- alert: HighMemoryUsage
  expr: 100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 90
  for: 5m
  labels:
    severity: warning
```

As a Grafana-managed rule: query A is the expression without `> 90` (Instant), expression B is a Threshold "A is above 90", pending period 5m, label `severity=warning`. The [template post](/blog/prometheus-alert-rule-templates) explains the annotation side, which Grafana also supports with `$labels` and `$values`.

## Where to start

Keep the eight shipped rules in Prometheus, add a receiver so they actually reach you (see the [alerting guide](/guide/alerting#add-a-receiver)), and only add Grafana-managed rules for what Prometheus cannot see. The provisioned [Node Exporter dashboard](/node-exporter-dashboard/) shows the same queries as the rules, so you can watch a metric approach its threshold before it fires.

## Related posts

- [How Prometheus Alertmanager routes, groups and mutes alerts](/blog/prometheus-alertmanager-explained)
- [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)
- [Moving Grafana dashboards around as JSON](/blog/grafana-export-import-dashboard)
- [All posts](/blog/)

:::

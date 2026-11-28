---
title: "Prometheus, Alertmanager and Grafana Guides"
titleTemplate: false
description: "Guides to PromQL, Alertmanager routing and silences, alert rule templates and tests, Grafana dashboard export and cAdvisor metrics, on one Docker Compose stack."
---

::: v-pre

# Monitoring guides for the Grafana Docker stack

<p class="lead">Short guides that start from the files in this repository: the Alertmanager config, the eight Prometheus alert rules, the provisioned Grafana dashboard and the cAdvisor service. Each one says what the stack does today, including the parts that need fixing before you rely on them.</p>

## [How Prometheus Alertmanager routes, groups and mutes alerts](/blog/prometheus-alertmanager-explained)

Alertmanager explained with a real config: the routing tree, grouping, receivers, inhibition and silences, and the parts of the file you fill in yourself.

## [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)

How the $labels, $value and $externalLabels placeholders work in Prometheus alerting rules, with printf and humanize examples taken from eight working rules.

## [Silencing an alert in Alertmanager from the UI or amtool](/blog/alertmanager-silence)

Silence an alert in Alertmanager from the web UI on port 9093 or with amtool silence add: matchers, duration, comments, listing and expiring silences early.

## [Grafana-managed alerts or Prometheus rules: which to use](/blog/grafana-alerts-vs-prometheus-rules)

Grafana-managed alert rules compared with Prometheus alert rules and Alertmanager: where each is evaluated, how to alert on the latest value, and which to pick.

## [Alertmanager settings that keep a small server quiet](/blog/alertmanager-best-practices)

Practical Alertmanager best practices for one to five servers: group_by, repeat_interval, a separate critical receiver, Slack templates and alerts that work.

## [Moving Grafana dashboards around as JSON](/blog/grafana-export-import-dashboard)

Export a Grafana dashboard as JSON, import it on another server, duplicate it with Save as copy, and provision it from a file the way this Docker stack does.

## [Which registry to pull the cAdvisor image from](/blog/cadvisor-image-gcr-vs-docker-hub)

Where the cAdvisor container image lives: gcr.io up to v0.55.1, ghcr.io for v0.53.0 and later, and why the google/cadvisor image on Docker Hub stops at 2019.

## [The cAdvisor container metrics worth a Grafana panel](/blog/cadvisor-metrics)

The cAdvisor metrics worth graphing for Docker containers: CPU, working set memory, throttling, network, filesystem and restarts, with PromQL for each one.

## [The PromQL queries you need for one server, on one page](/blog/promql-cheat-sheet)

A PromQL cheat sheet built on a real Node Exporter stack: selectors, matchers, range vectors, rate, aggregation, comparisons and the functions alerts use.

## [Writing if-then logic in PromQL with filters and bool](/blog/promql-if-function)

PromQL has no if function. How comparison filters, the bool modifier, and, or, unless and vector(0) express conditions in queries, panels and alert rules.

## [Counting per second in PromQL: rate, irate and increase](/blog/promql-rate)

How PromQL rate, irate and increase work on counters, how to pick the range, why the docs prefer rate for alerts, and why this stack's alerts use rate.

## [Grouping PromQL results with by and without](/blog/promql-group-by)

Group by in PromQL: sum by, avg by, count by and without, where the clause can go, how labels are dropped, and examples from a Node Exporter stack.

## [Rewriting labels at query time with label_replace](/blog/promql-label-replace)

How PromQL label_replace works: argument order, anchored regex, capture groups, what happens without a match, label_join, and when relabeling is better.

## [Catching broken Prometheus rules before they ship with promtool](/blog/promtool)

How to use promtool from the Prometheus Docker image: check config and rules, unit test an alert with test rules, read a failure, and run it all in CI.

:::

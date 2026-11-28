---
title: "Prometheus, Alertmanager and Grafana Guides"
titleTemplate: false
description: "Guides to Alertmanager routing and silences, Prometheus alert templates, Grafana dashboard export and cAdvisor metrics, built on one Docker Compose stack."
---

::: v-pre

# Monitoring guides for the Grafana Docker stack

<p class="lead">Short guides that start from the files in this repository: the Alertmanager config, the eight Prometheus alert rules, the provisioned Grafana dashboard and the cAdvisor service. Each one says what the stack does today, including the parts that need fixing before you rely on them.</p>

## [How Prometheus Alertmanager routes, groups and mutes alerts](/blog/prometheus-alertmanager-explained)

Alertmanager explained with a real config: the routing tree, grouping, receivers, inhibition and silences, and the parts of the file that need fixing first.

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

:::

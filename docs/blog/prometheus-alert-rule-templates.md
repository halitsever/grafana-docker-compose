---
title: "Prometheus Alert Rule Templates: $labels and $value"
titleTemplate: false
description: "How the $labels, $value and $externalLabels placeholders work in Prometheus alerting rules, with printf and humanize examples taken from eight working rules."
headline: "Using $labels and $value in Prometheus alert annotations"
date: "2026-11-28"
keyword: "prometheus alerting rules placeholder variable example"
faq: [{"q": "What variables can I use in Prometheus alert annotations?", "a": "Prometheus documents three: $labels for the label set of the alert instance, $value for the evaluated value of the expression, and $externalLabels for the external labels from the global config."}, {"q": "Why does my alert show a long number like 91.34129870129871?", "a": "The $value variable is a raw float. Format it with printf, for example printf with %.1f, or with a helper such as humanize or humanizePercentage."}, {"q": "Can I use templates in alert labels too?", "a": "Yes. Label values are templated the same way as annotations, but a label that changes with the value creates a new alert each time it changes, so keep labels stable and put changing numbers in annotations."}]
---

::: v-pre

# Using $labels and $value in Prometheus alert annotations

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">An alert that says DiskSpaceLow is a start. An alert that says disk usage is 91.3% on web-1 at / is something you can act on. Prometheus fills those blanks with three template variables. This post shows how they work, using the eight rules in prometheus/rules/node.yml.</p>

## The three variables

The [alerting rules docs](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) define three variables you can use inside label and annotation values:

| Variable | Holds |
| --- | --- |
| `$labels` | The label key/value pairs of the alert instance, so `$labels.instance` or `$labels.mountpoint` |
| `$value` | The evaluated value of the alert instance, the number your expression returned |
| `$externalLabels` | The external labels set under `global.external_labels` in `prometheus.yml` |

They use Go's template syntax, so a variable sits inside double curly braces: `{{ $labels.instance }}`.

## A rule from this stack, line by line

```yaml
- alert: DiskSpaceLow
  expr: 100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) * 100) > 85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Low disk space on {{ $labels.instance }}"
    description: "Disk usage is {{ printf \"%.1f\" $value }}% on {{ $labels.instance }} ({{ $labels.mountpoint }})."
```

- `expr` returns one series per matching filesystem, and each series carries the labels of the node_exporter metrics: `instance`, `job`, `device`, `fstype`, `mountpoint`.
- `$labels.instance` is the `instance` label. In this stack it is set by hand in `prometheus.yml` to `My Favorite Server Name`, which is why the [quick start](/guide/quick-start#rename-your-server) asks you to rename it.
- `$value` is the percentage the expression computed. Comparison operators such as `> 85` filter series but keep their value, so `$value` is the usage, not `1`.
- `printf "%.1f"` rounds it to one decimal. The quotes inside the YAML string are escaped as `\"`.

The rendered description reads like `Disk usage is 91.3% on web-1 (/).`

## Formatting $value

A raw `$value` prints every digit of a float. The [template reference](https://prometheus.io/docs/prometheus/latest/configuration/template_reference/) lists helpers for the common cases:

| Function | Input | Output |
| --- | --- | --- |
| `printf "%.1f" $value` | 91.3412 | `91.3` |
| `humanize $value` | 1234567 | `1.235M` |
| `humanize1024 $value` | 1073741824 | `1Gi` |
| `humanizePercentage $value` | 0.913 | `91.3%` |
| `humanizeDuration $value` | 3725 | `1h 2m 5s` |

`humanizePercentage` expects a ratio between 0 and 1. The stack's rules already multiply by 100, which is why they use `printf` and add the `%` sign themselves.

## Examples from the eight rules

The other rules use the same pattern. The ones worth reading:

```yaml
# CPU, averaged per server
summary: "High CPU usage on {{ $labels.instance }}"
description: "CPU usage is {{ printf \"%.1f\" $value }}% on {{ $labels.instance }} for more than 5 minutes."

# Network errors, one alert per interface
description: "Network error rate is {{ printf \"%.0f\" $value }} errors/s on {{ $labels.instance }} ({{ $labels.device }})."

# Load as a multiple of CPU count
description: "15-minute load average is {{ printf \"%.2f\" $value }}x CPU count on {{ $labels.instance }}."
```

Notice which labels each rule can use. `HighCpuUsage` aggregates with `avg by(instance)`, so only `instance` survives and `$labels.device` would print nothing. `HighNetworkErrors` keeps `device`, so it can name the interface. A placeholder only works if the label is still on the series after your aggregation.

## InstanceDown and the job label

```yaml
- alert: InstanceDown
  expr: up == 0
  for: 1m
  annotations:
    summary: "Instance {{ $labels.instance }} down"
```

`up` exists for every scrape target, so this rule covers the `node`, `cadvisor` and `prometheus` jobs. For the cAdvisor target nothing sets a custom instance label, so the summary prints the address: `Instance cadvisor:8080 down`. Adding `{{ $labels.job }}` to the description makes it clearer which service stopped.

## Labels versus annotations

Labels identify an alert. Annotations describe it. Prometheus treats a change in any label value as a different alert, so a label such as `value: "{{ $value }}"` would create a new alert on every evaluation, and Alertmanager would group and repeat them as separate alerts. Keep numbers in annotations, and keep labels to stable values such as `severity`.

## Test a rule before reloading

```bash
docker run --rm \
  -v "$PWD/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  -v "$PWD/prometheus/rules:/etc/prometheus/rules:ro" \
  --entrypoint promtool prom/prometheus:v3.16.0 \
  check config /etc/prometheus/prometheus.yml

curl -X POST localhost:9090/-/reload
```

`promtool` checks template syntax as part of the rule file, so a missing closing brace fails here rather than at 3 a.m. After the reload, `http://localhost:9090/alerts` shows each rule with its rendered annotations once it is pending or firing.

## How Alertmanager uses these fields

Alertmanager does not render `$labels` again. It receives the finished `summary` and `description` strings and exposes them to its own [notification templates](https://prometheus.io/docs/alerting/latest/notifications/) as `.Annotations.summary` on each alert, or `.CommonAnnotations.summary` when every alert in a group shares it. That is where a Slack or email message picks them up. The [Alertmanager explainer](/blog/prometheus-alertmanager-explained) covers the receiving side.

## FAQ

### What variables can I use in Prometheus alert annotations?

Prometheus documents three: $labels for the label set of the alert instance, $value for the evaluated value of the expression, and $externalLabels for the external labels from the global config.

### Why does my alert show a long number like 91.34129870129871?

The $value variable is a raw float. Format it with printf, for example printf with %.1f, or with a helper such as humanize or humanizePercentage.

### Can I use templates in alert labels too?

Yes. Label values are templated the same way as annotations, but a label that changes with the value creates a new alert each time it changes, so keep labels stable and put changing numbers in annotations.

## Related posts

- [How Prometheus Alertmanager routes, groups and mutes alerts](/blog/prometheus-alertmanager-explained)
- [Alertmanager settings that keep a small server quiet](/blog/alertmanager-best-practices)
- [The cAdvisor container metrics worth a Grafana panel](/blog/cadvisor-metrics)
- [Catching broken Prometheus rules before they ship with promtool](/blog/promtool)
- [All posts](/blog/)

:::

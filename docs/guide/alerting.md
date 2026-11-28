---
title: Alertmanager with Docker Compose
description: How alerting works in this Alertmanager Docker Compose setup. Covers the eight Prometheus alert rules, the routing tree and how to add a receiver.
---

# Prometheus alert rules and Alertmanager

Alerting in this stack has two halves. Prometheus decides **when** something is wrong by evaluating rules against its data. Alertmanager decides **who hears about it**: it groups alerts, repeats them on a schedule and sends them to a receiver.

Both halves are configured from files in the repository, and both run as services in the same compose file.

## The path of an alert

1. Prometheus loads every file matching `/etc/prometheus/rules/*.yml`. The compose file mounts `./prometheus/rules` there.
2. The `node_alerts` group is evaluated every 30 seconds.
3. A rule whose expression stays true for its `for` duration starts firing.
4. Prometheus sends firing alerts to `alertmanager:9093`, set under `alerting` in `prometheus.yml`.
5. Alertmanager groups them and passes them to the `default` or `critical` receiver.

You can watch the first three steps at `http://localhost:9090/alerts` and the last two at `http://localhost:9093`.

## The eight shipped rules

All rules live in `prometheus/rules/node.yml`.

| Alert | Fires when | For | Severity |
| --- | --- | --- | --- |
| `InstanceDown` | `up == 0` for any scrape target | 1m | critical |
| `HighCpuUsage` | CPU usage above 90% | 5m | warning |
| `HighMemoryUsage` | Memory usage above 90% | 5m | warning |
| `CriticalMemoryUsage` | Memory usage above 95% | 2m | critical |
| `DiskSpaceLow` | Root filesystem above 85% full | 5m | warning |
| `DiskSpaceCritical` | Root filesystem above 95% full | 2m | critical |
| `HighNetworkErrors` | Receive plus transmit errors above 10 per second | 5m | warning |
| `SystemLoad` | 15-minute load average above 2x the CPU count | 5m | warning |

`InstanceDown` covers all three scrape jobs, so it also tells you when cAdvisor or Prometheus itself stops answering. The other seven read Node Exporter metrics.

A rule looks like this:

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

The summary uses the `instance` label, which is why it pays to [rename the placeholder](./quick-start#rename-your-server) in `prometheus.yml`.

### Add or change a rule

Edit `node.yml` or add a new `.yml` file next to it. Check it, then reload Prometheus:

```bash
docker run --rm \
  -v "$PWD/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  -v "$PWD/prometheus/rules:/etc/prometheus/rules:ro" \
  --entrypoint promtool prom/prometheus:v3.16.0 \
  check config /etc/prometheus/prometheus.yml

curl -X POST localhost:9090/-/reload
```

`promtool check config` also validates every rule file, so one command covers both.

## How Alertmanager routes

`alertmanager/alertmanager.yml` defines one route with one child:

```yaml
route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'default'

  routes:
    - matchers:
        - severity="critical"
      receiver: 'critical'
      repeat_interval: 1h
```

| Setting | Value | Effect |
| --- | --- | --- |
| `group_by` | `alertname`, `instance` | One notification per alert per server |
| `group_wait` | 30s | Wait before the first notification of a new group |
| `group_interval` | 5m | Wait before sending news about a group that already notified |
| `repeat_interval` | 12h, 1h for critical | How often a still-firing alert is sent again |
| `resolve_timeout` | 5m | When an alert that stopped arriving counts as resolved |

There is also one inhibit rule. While a critical alert fires, it mutes the matching warning on the same server: `CriticalMemoryUsage` mutes `HighMemoryUsage`, and `DiskSpaceCritical` mutes `DiskSpaceLow` for the same mount point. The pairs have different alert names, so the rule matches on a shared `resource` label instead (`memory` or `disk`):

```yaml
inhibit_rules:
  - source_matchers:
      - severity="critical"
      - resource=~".+"
    target_matchers:
      - severity="warning"
    equal: ['instance', 'resource', 'mountpoint']
```

Only critical alerts that carry a `resource` label mute anything, so `InstanceDown` or a critical rule you add yourself does not hide unrelated warnings. Give your own warning and critical pair the same `resource` value to join in.

## Add a receiver

::: warning Nothing is delivered out of the box
Both receivers are defined without any integration. The email and Slack blocks are commented out. Alerts reach Alertmanager and show in its UI, but no message is sent until you configure a receiver.
:::

For email, uncomment the SMTP lines under `global` and the `email_configs` block of the receiver you want:

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'your-password'

receivers:
  - name: 'critical'
    email_configs:
      - to: 'oncall@example.com'
        send_resolved: true
```

For Slack, uncomment the `slack_configs` block and paste your incoming webhook URL. Use `slack_configs`, not `webhook_configs`: a webhook receiver posts Alertmanager's own JSON format, while a Slack incoming webhook expects Slack's message format:

```yaml
receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        send_resolved: true
```

Validate the file and restart the service to load it:

```bash
docker run --rm -v "$PWD/alertmanager:/cfg:ro" \
  --entrypoint amtool prom/alertmanager:v0.35.0 \
  check-config /cfg/alertmanager.yml

docker compose restart alertmanager
```

`alertmanager.yml` holds credentials once you fill it in. Keep your edited copy out of public forks.

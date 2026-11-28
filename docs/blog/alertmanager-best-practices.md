---
title: "Alertmanager Best Practices for Small Servers"
titleTemplate: false
description: "Practical Alertmanager best practices for one to five servers: group_by, repeat_interval, a separate critical receiver, Slack templates and alerts that work."
headline: "Alertmanager settings that keep a small server quiet"
date: "2026-11-28"
keyword: "prometheus alertmanager best practices"
---

::: v-pre

# Alertmanager settings that keep a small server quiet

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">Most Alertmanager advice is written for teams with on-call rotations and hundreds of services. A side project or a small company server has different problems: one person reads every alert, often on a phone. These are the settings in this stack and the reasons behind them, and the parts you fill in yourself.</p>

## 1. Make sure something is delivered

The first practice is the one most setups skip. In this stack both receivers, `default` and `critical`, have every integration commented out. Alertmanager accepts alerts and shows them in its UI on port 9093, and sends nothing. Fill in at least one receiver before you trust the stack. Email is in the [alerting guide](/guide/alerting#add-a-receiver). For Slack, use `slack_configs`:

```yaml
receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        send_resolved: true
```

The repository's `alertmanager.yml` carries this block commented out. Older copies used `webhook_configs` with a Slack URL instead, which sends Alertmanager's own JSON format, not a Slack message, so replace that one if you have it. [How to get a Slack webhook URL](https://projects.halit.org/supadomain/blog/slack-webhook-url) covers the URL itself.

Then test the path end to end: stop a service on purpose (`docker compose stop cadvisor`), wait for `InstanceDown`, and check that the message arrives.

## 2. Group by what you act on

```yaml
group_by: ['alertname', 'instance']
```

One message per alert per server. With one server that is close to one message per problem. The alternatives:

- `group_by: ['instance']` sends one message per server listing everything wrong with it. Good when a broken server tends to trip several rules at once.
- `group_by: ['...']` (the literal three dots) disables grouping, one message per alert. Rarely what a person wants.
- Leaving `group_by` empty groups everything into a single message. Fine for a digest, bad for finding the cause.

## 3. Repeat less often than you think

| Receiver | `repeat_interval` here | Default |
| --- | --- | --- |
| `default` (warnings) | 12h | 4h |
| `critical` | 1h | 4h |

A warning such as `DiskSpaceLow` (over 85% for five minutes) is something to fix today, not something to hear about every four hours. A critical such as `InstanceDown` is worth repeating hourly until someone acts. Matching the repeat to the urgency is the cheapest way to keep alerts from being muted by habit.

## 4. Send critical alerts somewhere else

The child route sends `severity="critical"` to its own receiver:

```yaml
routes:
  - matchers:
      - severity="critical"
    receiver: 'critical'
    repeat_interval: 1h
```

Point `critical` at a channel that wakes you up (a phone notification, an SMS gateway, a pager) and `default` at email or a quiet chat channel. Three of the eight shipped rules are critical: `InstanceDown`, `CriticalMemoryUsage` and `DiskSpaceCritical`. The [configuration reference](https://prometheus.io/docs/alerting/latest/configuration/) marks `match:` as deprecated, so the shipped file uses `matchers:`. An older copy with `match:` still loads in v0.35.0.

## 5. Let critical mute warning, correctly

When memory is above 95%, it is also above 90%, so `CriticalMemoryUsage` and `HighMemoryUsage` fire together. An inhibit rule can drop the warning. Earlier versions of the shipped file required equal `alertname`, and the pairs have different names, so it never matched. There are two ways to pair them:

- Rename each pair to one alert name with two severities (for example both `MemoryUsage`), and keep `equal: ['alertname', 'instance']`.
- Keep the names, add a shared label such as `resource: memory` to both rules, and match on it.

The stack does the second, which keeps the rule names readable in the UI:

```yaml
inhibit_rules:
  - source_matchers:
      - severity="critical"
      - resource=~".+"
    target_matchers:
      - severity="warning"
    equal: ['instance', 'resource', 'mountpoint']
```

`mountpoint` keeps a full `/data` from muting the warning for `/`. If you change the rule, check it with `amtool check-config` and by triggering both alerts once.

## 6. Write messages for a phone screen

Slack's default template prints the alert name and labels. The annotations the rules already carry read better. A compact template:

```yaml
slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#alerts'
    send_resolved: true
    title: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ "\n" }}{{ end }}'
```

`.Status`, `.CommonLabels` and `.Alerts` come from Alertmanager's [notification template data](https://prometheus.io/docs/alerting/latest/notifications/). The descriptions come from the rule annotations, which the [template post](/blog/prometheus-alert-rule-templates) explains.

## 7. Name your servers

The node scrape target ships with `instance: "My Favorite Server Name"`, and every summary prints it. Rename it before the first real alert, or your messages will all say the same thing. The [quick start](/guide/quick-start#rename-your-server) shows where.

## 8. Silence with an end time

Planned work gets a silence with a duration, created in the UI or with `amtool silence add --duration=2h`. A silence without a sensible end time is how real problems go unseen. [How to silence alerts](/blog/alertmanager-silence) walks through it.

## 9. Validate on every change

```bash
docker run --rm -v "$PWD/alertmanager:/cfg:ro" \
  --entrypoint amtool prom/alertmanager:v0.35.0 \
  check-config /cfg/alertmanager.yml
```

The repository's CI runs this check, plus `promtool check config` for the rules, on every pull request.

## What to skip on a small server

High availability (an Alertmanager cluster) matters when an outage of the monitoring host must not hide alerts. With one monitoring host on the same machine it watches, a cluster does not help: if the server is down, so is Alertmanager. An external uptime check from somewhere else covers that case more cheaply.

## Related posts

- [How Prometheus Alertmanager routes, groups and mutes alerts](/blog/prometheus-alertmanager-explained)
- [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)
- [Silencing an alert in Alertmanager from the UI or amtool](/blog/alertmanager-silence)
- [Catching broken Prometheus rules before they ship with promtool](/blog/promtool)
- [All posts](/blog/)

:::

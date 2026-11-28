---
title: "Prometheus Alertmanager Explained: Routes and Receivers"
titleTemplate: false
description: "Alertmanager explained with a real config: the routing tree, grouping, receivers, inhibition and silences, and the parts of the file you fill in yourself."
headline: "How Prometheus Alertmanager routes, groups and mutes alerts"
date: "2026-11-28"
keyword: "alertmanager"
faq: [{"q": "What is Alertmanager used for?", "a": "Alertmanager receives alerts from Prometheus, groups related alerts into one notification, sends them to receivers such as email or Slack, repeats them while they keep firing, and mutes them through inhibition rules and silences."}, {"q": "Does Prometheus send emails by itself?", "a": "No. Prometheus only evaluates alert rules and pushes firing alerts to the Alertmanagers listed under alerting in prometheus.yml. Every notification is sent by Alertmanager."}, {"q": "What port does Alertmanager use?", "a": "The web UI and API listen on 9093 by default. This stack publishes that port on the host, so the UI opens on port 9093 of the server."}]
---

::: v-pre

# How Prometheus Alertmanager routes, groups and mutes alerts

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">Prometheus decides when something is wrong. Alertmanager decides who hears about it, how often and in how many messages. This post walks through the pieces of an Alertmanager config using the file this stack ships, including two places where earlier versions of that file did not do what they looked like they did.</p>

## Where Alertmanager sits

Alerting in Prometheus is split in two. Prometheus evaluates [alert rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) against its data and, when one holds for its `for` duration, sends the alert to every Alertmanager listed in `prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

From there on, [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/) owns the alert. Its own docs list four jobs: grouping, inhibition, silencing and sending notifications to receivers. All four are set in one YAML file, which this stack mounts from `alertmanager/alertmanager.yml`.

## The routing tree

Every alert enters at the top-level `route` and walks down its children. The stack's tree has one child:

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

An alert labelled `severity="critical"` matches the child and goes to the `critical` receiver. Everything else stays on the root route and goes to `default`. Children inherit the parent's settings unless they override them, which is why the child only sets `repeat_interval`.

You can ask Alertmanager which receiver a label set reaches without sending anything. `amtool` ships in the official image:

```bash
docker compose exec alertmanager amtool --alertmanager.url=http://localhost:9093 config routes test severity=critical
# critical

docker compose exec alertmanager amtool --alertmanager.url=http://localhost:9093 config routes
# Routing tree:
# .
# └── default-route  receiver: default
#     └── {severity="critical"}  receiver: critical
```

By default a child that matches stops the walk. Set `continue: true` on a child when an alert should also be checked against the siblings that follow it, for example to send critical alerts to a pager and to a chat channel.

The child uses `matchers`, a list of PromQL-style label matchers. The [configuration reference](https://prometheus.io/docs/alerting/latest/configuration/) marks the older `match` and `match_re` maps as deprecated, along with `source_match` and `target_match` in inhibit rules. Both forms still load in v0.35.0, the version this stack pins, so older copies of this file keep working.

## Grouping and timing

`group_by: ['alertname', 'instance']` puts every alert with the same name on the same server into one group, and one group becomes one notification. Three timers decide when that notification goes out:

| Setting | This stack | Alertmanager default | What it does |
| --- | --- | --- | --- |
| `group_wait` | 30s | 30s | How long a new group waits for more alerts before the first message |
| `group_interval` | 5m | 5m | How long to wait before telling you about changes to a group that already notified |
| `repeat_interval` | 12h, 1h for critical | 4h | How often a group that is still firing is sent again |

The stack keeps the default first two and stretches the repeat for warnings to 12 hours, so a disk that sits at 86% does not message you every four hours. The [best practices post](/blog/alertmanager-best-practices) goes through these choices for a small server.

## Receivers

A receiver is a name plus zero or more integrations: `email_configs`, `slack_configs`, `webhook_configs` and others. The stack defines two receivers, `default` and `critical`, with every integration commented out. Alerts still reach Alertmanager and show in its UI, but no message leaves the server until you fill one in. The [alerting guide](/guide/alerting#add-a-receiver) has the email block.

The commented Slack example in the file uses `slack_configs` with `api_url`. Older copies used `webhook_configs` with a `hooks.slack.com` URL, which does not work as Slack delivery: `webhook_configs` posts Alertmanager's own JSON body, and a Slack incoming webhook expects Slack's message format. How to get that URL is covered in [How to get a Slack webhook URL](https://projects.halit.org/supadomain/blog/slack-webhook-url).

```yaml
receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        send_resolved: true
```

`send_resolved` defaults to `false` for Slack, so set it if you want the "resolved" message too.

## Inhibition

An inhibit rule mutes target alerts while a source alert is firing. The reference describes `equal` as the labels that must have the same value in both alerts for the rule to apply. The stack ships this rule:

```yaml
inhibit_rules:
  - source_matchers:
      - severity="critical"
      - resource=~".+"
    target_matchers:
      - severity="warning"
    equal: ['instance', 'resource', 'mountpoint']
```

The rules come in warning and critical pairs with different names, such as `DiskSpaceLow` and `DiskSpaceCritical`, and each pair shares a `resource` label (`memory` or `disk`). While `DiskSpaceCritical` fires for `/` on a server, `DiskSpaceLow` for `/` on that server is muted. A label that is missing from both alerts counts as equal, which is why `mountpoint` can sit in `equal` for the memory pair too.

Earlier versions of the file used `equal: ['alertname', 'instance']`. No warning ever has the same `alertname` as a critical alert, so that rule never muted anything. `equal: ['instance']` alone would go too far: any critical alert on a server would mute every warning on it. The `resource=~".+"` matcher keeps critical alerts without a pair, such as `InstanceDown`, out of the rule.

## Silences

Silences are the manual mute: a set of matchers and an end time, created in the web UI on port 9093 or with `amtool silence add`. They live in Alertmanager's data directory, which the stack keeps on the `alertmanager_data` volume, so they survive a restart. [How to silence alerts in Alertmanager](/blog/alertmanager-silence) shows both ways.

## Check the file before you reload

```bash
docker run --rm -v "$PWD/alertmanager:/cfg:ro" \
  --entrypoint amtool prom/alertmanager:v0.35.0 \
  check-config /cfg/alertmanager.yml

docker compose restart alertmanager
```

The repository's CI runs the same `check-config` on every pull request.

## FAQ

### What is Alertmanager used for?

Alertmanager receives alerts from Prometheus, groups related alerts into one notification, sends them to receivers such as email or Slack, repeats them while they keep firing, and mutes them through inhibition rules and silences.

### Does Prometheus send emails by itself?

No. Prometheus only evaluates alert rules and pushes firing alerts to the Alertmanagers listed under alerting in prometheus.yml. Every notification is sent by Alertmanager.

### What port does Alertmanager use?

The web UI and API listen on 9093 by default. This stack publishes that port on the host, so the UI opens on port 9093 of the server.

## Related posts

- [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)
- [Silencing an alert in Alertmanager from the UI or amtool](/blog/alertmanager-silence)
- [Alertmanager settings that keep a small server quiet](/blog/alertmanager-best-practices)
- [All posts](/blog/)

:::

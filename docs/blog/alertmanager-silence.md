---
title: "How to Silence Alerts in Alertmanager"
titleTemplate: false
description: "Silence an alert in Alertmanager from the web UI on port 9093 or with amtool silence add: matchers, duration, comments, listing and expiring silences early."
headline: "Silencing an alert in Alertmanager from the UI or amtool"
date: "2026-11-28"
keyword: "alertmanager silence"
faq: [{"q": "Does a silence stop the alert from firing?", "a": "No. Prometheus keeps evaluating the rule and the alert stays active. Alertmanager marks it as suppressed and sends no notifications for it until the silence ends."}, {"q": "How long does an amtool silence last?", "a": "One hour by default. Pass --duration, for example --duration=2h, or --end with an RFC3339 time to change it."}, {"q": "Do silences survive an Alertmanager restart?", "a": "Yes, as long as the data directory is kept. This stack stores it on the alertmanager_data Docker volume."}, {"q": "What is the difference between a silence and inhibition?", "a": "A silence is created by hand and expires at a set time. Inhibition is a rule in alertmanager.yml that mutes some alerts automatically while another alert is firing."}]
---

::: v-pre

# Silencing an alert in Alertmanager from the UI or amtool

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">A silence tells Alertmanager to stop notifying about alerts that match a set of labels until a given time. The alert keeps firing in Prometheus and stays visible in the UI. Only the messages stop. Here is how to create one from the web UI and from the command line, with real output from this stack.</p>

## What a silence is

The [Alertmanager docs](https://prometheus.io/docs/alerting/latest/alertmanager/) put it in two lines: silences are configured with matchers, just like the routing tree, and an incoming alert that matches all the matchers of an active silence gets no notifications. A silence has:

- one or more **matchers**, such as `alertname="InstanceDown"` or `instance=~"web-.*"`
- a **start** and an **end** time
- a **creator** and a **comment**, so the next person knows why

Silences are the tool for planned work and known noise: a reboot window, a disk you are already cleaning up, a service you switched off on purpose.

## A firing alert to silence

To get a real example, the stack was started without its cAdvisor service. Prometheus could not scrape `cadvisor:8080`, so `InstanceDown` fired after its one-minute `for`:

```bash
$ docker compose exec alertmanager amtool --alertmanager.url=http://localhost:9093 alert query
Alertname     Starts At                Summary                      State
InstanceDown  2026-11-28 01:45:05 UTC  Instance cadvisor:8080 down  active
```

## Silence from the web UI

Alertmanager's UI is on port 9093, which the stack publishes on the host. Open `http://localhost:9093`:

1. On the **Alerts** page, find the alert and use its **Silence** button. That opens the form with the alert's labels filled in as matchers. Or click **New Silence** at the top to start empty.
2. Set **Duration** (or **Start** and **End**).
3. Trim the matchers. Keep only the labels that identify what you want muted. Every extra label makes the silence narrower.
4. Fill in **Creator** and **Comment**.
5. Click **Preview Alerts** to see which current alerts the silence would catch, then **Create**.

The **Silences** page lists active, pending and expired silences, each with **View**, **Edit** and **Expire** buttons.

## Silence with amtool

`amtool` is Alertmanager's command-line client, and it is inside the `prom/alertmanager` image, so there is nothing to install:

```bash
$ docker compose exec alertmanager amtool --alertmanager.url=http://localhost:9093 \
    silence add alertname=InstanceDown job=cadvisor \
    --duration=2h --author=halit --comment="cAdvisor is off on this host"
68e37702-d896-4ae8-a63b-7484f789468b
```

The command prints the silence ID. The flags, from `amtool silence add --help` in v0.35.0:

| Flag | Default | Meaning |
| --- | --- | --- |
| `-d, --duration` | `1h` | How long the silence lasts |
| `--start`, `--end` | now, start + duration | RFC3339 times; `--end` overrides `--duration` |
| `-a, --author` | `nobody` | Stored as the creator |
| `-c, --comment` | none | Why the silence exists |

Matchers use the same syntax as PromQL: `=` for equality and `=~` for a regex. If the first argument has no `=`, amtool treats it as the alert name, so `amtool silence add InstanceDown` works too.

After the silence, the alert is still there, but marked suppressed:

```bash
$ docker compose exec alertmanager amtool --alertmanager.url=http://localhost:9093 alert query --silenced
Alertname     Starts At                Summary                      State
InstanceDown  2026-11-28 01:45:05 UTC  Instance cadvisor:8080 down  suppressed
```

## List and expire silences

```bash
$ docker compose exec alertmanager amtool --alertmanager.url=http://localhost:9093 silence query
ID                                    Matchers                                 Ends At                  Created By  Comment
68e37702-d896-4ae8-a63b-7484f789468b  alertname="InstanceDown" job="cadvisor"  2026-11-28 03:48:44 UTC  halit       cAdvisor is off on this host

# end one silence now
amtool silence expire 68e37702-d896-4ae8-a63b-7484f789468b

# end every silence that matches
amtool silence expire $(amtool silence query -q job="cadvisor")
```

`-q` prints only IDs, which is what makes the second form work. `silence query --expired` shows silences that already ended.

To skip the `--alertmanager.url` flag every time, `amtool` reads `$HOME/.config/amtool/config.yml` or `/etc/amtool/config.yml`, as the [Alertmanager README](https://github.com/prometheus/alertmanager#amtool) describes:

```yaml
alertmanager.url: "http://localhost:9093"
author: you@example.com
comment_required: true
```

## Pick the narrowest matcher

- `alertname="InstanceDown"` alone mutes that alert on every server. Add `instance` or `job` when only one target is affected.
- A regex such as `instance=~"web-.*"` is handy for a group of servers, and easy to make too wide. Use **Preview Alerts** before creating it.
- A silence also matches alerts that start after it was created. That is the point for a maintenance window, and a trap for a silence you forget. Give it an end time you would be happy with if you never came back.

## Silences, inhibition and routing

Silences are manual and time-limited. Inhibition rules are automatic and live in `alertmanager.yml`. Routing decides where an alert goes, not whether it goes. If you find yourself renewing the same silence every week, the alert is probably wrong: change the rule threshold or route it to a quieter receiver. The [Alertmanager explainer](/blog/prometheus-alertmanager-explained) covers inhibition, including why the one in this stack never matches.

## FAQ

### Does a silence stop the alert from firing?

No. Prometheus keeps evaluating the rule and the alert stays active. Alertmanager marks it as suppressed and sends no notifications for it until the silence ends.

### How long does an amtool silence last?

One hour by default. Pass --duration, for example --duration=2h, or --end with an RFC3339 time to change it.

### Do silences survive an Alertmanager restart?

Yes, as long as the data directory is kept. This stack stores it on the alertmanager_data Docker volume.

### What is the difference between a silence and inhibition?

A silence is created by hand and expires at a set time. Inhibition is a rule in alertmanager.yml that mutes some alerts automatically while another alert is firing.

## Related posts

- [How Prometheus Alertmanager routes, groups and mutes alerts](/blog/prometheus-alertmanager-explained)
- [Grafana-managed alerts or Prometheus rules: which to use](/blog/grafana-alerts-vs-prometheus-rules)
- [Alertmanager settings that keep a small server quiet](/blog/alertmanager-best-practices)
- [All posts](/blog/)

:::

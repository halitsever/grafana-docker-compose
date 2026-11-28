---
title: "promtool: Check Config and Unit Test Alert Rules"
titleTemplate: false
description: "How to use promtool from the Prometheus Docker image: check config and rules, unit test an alert with test rules, read a failure, and run it all in CI."
headline: "Catching broken Prometheus rules before they ship with promtool"
date: "2026-11-28"
keyword: "promtool"
faq: [{"q": "How do I install promtool?", "a": "It ships in the Prometheus release archives and in the prom/prometheus Docker image, so docker run --entrypoint promtool prom/prometheus:v3.16.0 works without installing anything."}, {"q": "What does promtool check config check?", "a": "The prometheus.yml syntax and every rule file it references. On this stack one command validates the config and all eight rules in prometheus/rules/node.yml."}, {"q": "Can promtool test alert rules?", "a": "Yes. promtool test rules reads a test file with input series and expected alerts at given times, evaluates the rules and prints a diff when the expected and actual alerts differ."}]
---

::: v-pre

# Catching broken Prometheus rules before they ship with promtool

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">promtool is the command-line tool that ships with Prometheus. It checks configuration and rule files, runs unit tests for alerts and can send queries to a server. This repository runs it in CI on every pull request. This post shows the commands with real output, including a test for the stack's InstanceDown alert.</p>

The outputs below come from running this repository's `prometheus.yml` and `prometheus/rules/node.yml` on Prometheus v3.16.0 with node-exporter v1.12.1 in Docker on 28 November 2026. cAdvisor was not started, so its target shows as down. Values change from machine to machine; the labels and the shape of each result are what to look at.

## Run it from the Docker image

There is nothing to install. The `prom/prometheus` image contains `promtool`; override the entrypoint:

```bash
docker run --rm --entrypoint promtool prom/prometheus:v3.16.0 --version
# promtool, version 3.16.0 (branch: HEAD, revision: e2e28adeee2c...)
```

Use the same tag as the server so both parse rules the same way. The repository keeps the two in step: the image tag in `docker-compose.yml` and in `.github/workflows/ci.yml` must match.

## Check the config and every rule

This is the command from the repository's CI:

```bash
docker run --rm \
  -v "$PWD/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  -v "$PWD/prometheus/rules:/etc/prometheus/rules:ro" \
  --entrypoint promtool prom/prometheus:v3.16.0 \
  check config /etc/prometheus/prometheus.yml
```

`check config` follows `rule_files` and validates each rule file it finds, so new files in `prometheus/rules/` are covered without changing CI. To check only rules:

```text
$ promtool check rules node.yml
Checking node.yml
  SUCCESS: 8 rules found
```

A typo fails with a position:

```text
$ promtool check rules broken.yml
Checking broken.yml
  FAILED:
broken.yml: 5:15: group "broken", rule 1, "Typo": could not parse expression: 1:6: parse error: unexpected end of input
```

The exit code is 1, which is what fails the CI job.

## Unit test an alert

`check` proves a rule parses. It does not prove it fires. [Unit tests](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) do. This test feeds a fake `up` series that drops to 0 and expects `InstanceDown` one minute later:

```yaml
rule_files:
  - node.yml

evaluation_interval: 30s

tests:
  - interval: 15s
    input_series:
      - series: 'up{job="node", instance="My Favorite Server Name"}'
        values: '1 1 0 0 0 0 0 0 0 0'
    alert_rule_test:
      - eval_time: 1m
        alertname: InstanceDown
        exp_alerts: []
      - eval_time: 2m
        alertname: InstanceDown
        exp_alerts:
          - exp_labels:
              severity: critical
              job: node
              instance: My Favorite Server Name
            exp_annotations:
              summary: "Instance My Favorite Server Name down"
              description: "My Favorite Server Name has been unreachable for more than 1 minute."
```

`values` are samples 15 seconds apart, so the target goes down at 30 seconds. At one minute the rule is still inside its `for: 1m` and no alert is expected. At two minutes it fires.

```text
$ promtool test rules node_test.yml
Processing test file: node_test.yml
  SUCCESS
```

## Reading a failure

Change the second check to `eval_time: 1m` and the test fails, because the alert is still pending:

```text
  FAILED:
    alertname: InstanceDown, time: 1m,
        exp:[
            0:
              Labels:{alertname="InstanceDown", instance="My Favorite Server Name", job="node", severity="critical"}
              Annotations:{description="My Favorite Server Name has been unreachable for more than 1 minute.", summary="Instance My Favorite Server Name down"}
            ],
        got:[]
```

`got:[]` with a non-empty `exp` almost always means a `for` duration or an `eval_time` that does not line up. The annotations are compared after templating, so the test also catches a broken `$labels` reference. The [template post](/blog/prometheus-alert-rule-templates) explains those.

The repository does not ship unit tests today; the file above is a starting point you can add next to `node.yml` and run with one more CI step.

## Other subcommands

The [promtool reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/) lists more. Two that help on a small server:

- `promtool query instant http://localhost:9090 'up == 0'` runs a query from the shell.
- `promtool tsdb analyze /prometheus` reports which metrics use the most series, to run inside the container when disk use grows.

Alertmanager has its own checker, `amtool check-config`, which the same CI job runs on `alertmanager/alertmanager.yml`.

## FAQ

### How do I install promtool?

It ships in the Prometheus release archives and in the prom/prometheus Docker image, so docker run --entrypoint promtool prom/prometheus:v3.16.0 works without installing anything.

### What does promtool check config check?

The prometheus.yml syntax and every rule file it references. On this stack one command validates the config and all eight rules in prometheus/rules/node.yml.

### Can promtool test alert rules?

Yes. promtool test rules reads a test file with input series and expected alerts at given times, evaluates the rules and prints a diff when the expected and actual alerts differ.

## Related posts

- [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)
- [Alertmanager settings that keep a small server quiet](/blog/alertmanager-best-practices)
- [The PromQL queries you need for one server, on one page](/blog/promql-cheat-sheet)
- [All posts](/blog/)

:::

---
title: "PromQL label_replace: Copy and Rename Labels"
titleTemplate: false
description: "How PromQL label_replace works: argument order, anchored regex, capture groups, what happens without a match, label_join, and when relabeling is better."
headline: "Rewriting labels at query time with label_replace"
date: "2026-11-28"
keyword: "promql label_replace"
faq: [{"q": "What does label_replace do in PromQL?", "a": "For each series it matches a regex against the value of one label and, on a match, writes the expanded replacement into another label. Series that do not match come back unchanged."}, {"q": "Is the label_replace regex anchored?", "a": "Yes, it has to match the whole label value. On Prometheus v3.16.0, the regex visor(.*) did not match cadvisor:8080, while cad(.*) did."}, {"q": "Does label_replace change stored data?", "a": "No. It only changes the query result. To change labels for good, use relabel_configs or metric_relabel_configs in prometheus.yml."}]
---

::: v-pre

# Rewriting labels at query time with label_replace

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">label_replace changes labels in a query result without touching what Prometheus stores. It is the tool for a Grafana legend that shows a host name instead of host:port, or for making two metrics share a label so they can be divided. This post walks through its five arguments with results from this stack.</p>

The outputs below come from running this repository's `prometheus.yml` and `prometheus/rules/node.yml` on Prometheus v3.16.0 with node-exporter v1.12.1 in Docker on 28 November 2026. cAdvisor was not started, so its target shows as down. Values change from machine to machine; the labels and the shape of each result are what to look at.

## The signature

From the [functions reference](https://prometheus.io/docs/prometheus/latest/querying/functions/):

```text
label_replace(v instant-vector, dst_label string, replacement string, src_label string, regex string)
```

For each series in `v`, the regex is matched against the value of `src_label`. If it matches, `dst_label` is set to `replacement`, in which `$1`, `$2` or `$name` refer to capture groups. If it does not match, the series is returned unchanged.

Note the order: destination first, source fourth. Swapping them is the most common mistake.

## Strip the port from instance

```promql
label_replace(up, "target", "$1", "instance", "(.*):.*")
```

| `instance` | new `target` |
| --- | --- |
| `localhost:9090` | `localhost` |
| `cadvisor:8080` | `cadvisor` |
| `My Favorite Server Name` | (no label added) |

The node target kept its labels as they were, because this repository sets its `instance` to a name without a colon and the regex needs one.

## The regex is anchored

Two queries against the same data:

```promql
label_replace(up, "host", "$1", "instance", "cad(.*)")     # matches, host="visor:8080"
label_replace(up, "host", "$1", "instance", "visor(.*)")   # matches nothing
```

The second one would match `cadvisor:8080` if the pattern could start anywhere. It did not add a label to any series, so the regex has to cover the whole value. Add `.*` on either side when you want a partial match. The syntax is RE2, as for every regex in Prometheus ([querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)).

## Overwrite a label in place

Use the same name for source and destination:

```promql
label_replace(node_filesystem_avail_bytes, "device", "$1", "device", "/dev/(.*)")
```

On the test machine `device="/dev/sda1"` became `device="sda1"`.

## Make two metrics divisible

Division matches series on every label. When one side calls the label `instance` and the other something else, copy it across first:

```promql
label_replace(some_metric, "instance", "$1", "host", "(.*)")
```

then divide, or group both sides to the same labels as the [group by post](/blog/promql-group-by) shows.

## label_join

`label_join` concatenates several labels into one, with a separator:

```promql
label_join(up, "job_instance", "/", "job", "instance")
```

That gives values such as `node/My Favorite Server Name`, handy for one legend string in Grafana.

## Query time or scrape time

label_replace runs on every query and every panel refresh. If you find yourself writing the same one in several dashboards, move it into `prometheus.yml`. `relabel_configs` changes target labels before the scrape, and `metric_relabel_configs` changes series labels before they are stored. This stack sets its `instance` label statically in `static_configs` instead, which is why alert summaries say `My Favorite Server Name` until you change it.

In Grafana you can also often skip label_replace: the legend field accepts a template such as the label name in double curly braces.

## FAQ

### What does label_replace do in PromQL?

For each series it matches a regex against the value of one label and, on a match, writes the expanded replacement into another label. Series that do not match come back unchanged.

### Is the label_replace regex anchored?

Yes, it has to match the whole label value. On Prometheus v3.16.0, the regex visor(.*) did not match cadvisor:8080, while cad(.*) did.

### Does label_replace change stored data?

No. It only changes the query result. To change labels for good, use relabel_configs or metric_relabel_configs in prometheus.yml.

## Related posts

- [Grouping PromQL results with by and without](/blog/promql-group-by)
- [The PromQL queries you need for one server, on one page](/blog/promql-cheat-sheet)
- [Moving Grafana dashboards around as JSON](/blog/grafana-export-import-dashboard)
- [All posts](/blog/)

:::

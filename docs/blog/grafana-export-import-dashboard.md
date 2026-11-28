---
title: "Export, Import and Copy a Grafana Dashboard"
titleTemplate: false
description: "Export a Grafana dashboard as JSON, import it on another server, duplicate it with Save as copy, and provision it from a file the way this Docker stack does."
headline: "Moving Grafana dashboards around as JSON"
date: "2026-11-28"
keyword: "grafana export dashboard"
faq: [{"q": "Where is the export button in Grafana 13?", "a": "Open the dashboard and click Export in the toolbar, then Export as code. The drawer lets you download the JSON file or copy it to the clipboard."}, {"q": "What does Share dashboard with another instance do?", "a": "It is a toggle in the export drawer that removes details specific to your Grafana server, such as data source uids, and adds inputs so the importer can pick their own data source."}, {"q": "Why can I not save changes to a provisioned dashboard?", "a": "Provisioned dashboards come from files. Unless the provider sets allowUiUpdates to true, Grafana will not save them from the UI. Use Save as copy, or copy the JSON from the save dialog and replace the file."}]
---

::: v-pre

# Moving Grafana dashboards around as JSON

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">A Grafana dashboard is a JSON document. Exporting it, importing it on another server, copying it and keeping it in git are all ways of moving that document around. The menu names below are from Grafana 13.3.0, the version this stack runs, checked against Grafana's docs.</p>

## Export a dashboard as JSON

From Grafana's [sharing docs](https://grafana.com/docs/grafana/latest/dashboards/share-dashboards-panels/) and the 13.3.0 UI:

1. Open the dashboard.
2. Click **Export** in the toolbar and choose **Export as code**. (The same menu has **Export as image**.)
3. Optionally open **Advanced options** and turn on **Share dashboard with another instance**.
4. Click **Download file** or **Copy to clipboard**.

The toggle in step 3 matters. Without it, the JSON points at your data source by its internal uid, and an import on another server fails to find it. With it, Grafana removes the instance-specific parts and adds an input, so whoever imports the file picks their own Prometheus.

The **Advanced options** also offer a choice of model (Classic or V2 Resource). Classic is the format older Grafana versions and most shared dashboards use.

## Import a dashboard

From the [import docs](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/import-dashboards/):

1. Go to **Dashboards**, click **New** and pick **Import**.
2. Upload a JSON file, paste the JSON, or paste a grafana.com dashboard URL or ID and click **Load**.
3. Change the name, folder or UID if you want.
4. Pick the data source when the dashboard asks for one.
5. Click **Import**.

If a dashboard with the same UID already exists, change the UID in step 3 to keep both.

## Duplicate (copy) a dashboard

To copy a dashboard on the same server, open it, click **Edit**, open **More save options** next to **Save** and pick **Save as copy**. Grafana asks for a new title and folder and gives the copy a new UID. Exporting and re-importing with a changed UID does the same thing and also works across servers.

## Provision a dashboard from a file

This is how the stack ships its dashboard. The compose file mounts `./grafana/provisioning` into Grafana, and a provider file tells Grafana where to find dashboard JSON:

```yaml
# grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1
providers:
  - name: default
    orgId: 1
    folder: ""
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /etc/grafana/provisioning/dashboards/json
      foldersFromFilesStructure: false
```

Every `.json` file in that folder becomes a dashboard. Grafana rescans it every 30 seconds, so dropping a new file in shows up without a restart. The [provisioning docs](https://grafana.com/docs/grafana/latest/administration/provisioning/) describe the fields:

| Field | Effect |
| --- | --- |
| `updateIntervalSeconds` | How often Grafana scans for changed files |
| `disableDeletion` | If `false`, removing the file removes the dashboard |
| `allowUiUpdates` | Not set here, so it is `false`: UI saves are blocked |
| `foldersFromFilesStructure` | Use subfolders on disk as Grafana folders |

The stack's dashboard is `grafana/provisioning/dashboards/json/node-exporter.json`, with the UID `node-exporter`, so it opens at `http://localhost:1296/d/node-exporter`. The [dashboard page](/node-exporter-dashboard/) lists its eight panels and queries.

## Editing a provisioned dashboard

Because `allowUiUpdates` is off, clicking **Save** on this dashboard in 13.3.0 opens a dialog that says it cannot be saved from the Grafana UI because it was provisioned from another source, and offers the JSON to copy or save to a file. That is on purpose: the file in git stays the source of truth. The workflow is:

1. Edit the dashboard in the UI.
2. Click **Save** and copy the JSON from that dialog, or use **Export** → **Export as code** → **Copy to clipboard** with the sharing toggle off.
3. Paste over `grafana/provisioning/dashboards/json/node-exporter.json`.
4. Commit. Grafana picks up the file within 30 seconds.

The repository keeps a second copy of the same JSON at `grafana/dashboards/node-exporter.json`, and only the provisioning copy is mounted. Update both, or delete the second one in your fork.

## Make the JSON portable

The panels in this dashboard use a `${datasource}` template variable instead of a fixed data source uid:

```json
"datasource": { "type": "prometheus", "uid": "${datasource}" }
```

A dashboard built that way imports on any server with a Prometheus data source, with or without the sharing toggle. When you add your own panels, keep the same variable. The [cAdvisor metrics post](/blog/cadvisor-metrics) has container queries worth saving as a second provisioned dashboard.

## Quick reference

| Task | Where |
| --- | --- |
| Export JSON | Dashboard → Export → Export as code |
| Export a picture | Dashboard → Export → Export as image |
| Import | Dashboards → New → Import |
| Duplicate | Edit → More save options → Save as copy |
| Keep in git | Provisioning folder plus a provider file |

## FAQ

### Where is the export button in Grafana 13?

Open the dashboard and click Export in the toolbar, then Export as code. The drawer lets you download the JSON file or copy it to the clipboard.

### What does Share dashboard with another instance do?

It is a toggle in the export drawer that removes details specific to your Grafana server, such as data source uids, and adds inputs so the importer can pick their own data source.

### Why can I not save changes to a provisioned dashboard?

Provisioned dashboards come from files. Unless the provider sets allowUiUpdates to true, Grafana will not save them from the UI. Use Save as copy, or copy the JSON from the save dialog and replace the file.

## Related posts

- [Using $labels and $value in Prometheus alert annotations](/blog/prometheus-alert-rule-templates)
- [Grafana-managed alerts or Prometheus rules: which to use](/blog/grafana-alerts-vs-prometheus-rules)
- [The cAdvisor container metrics worth a Grafana panel](/blog/cadvisor-metrics)
- [All posts](/blog/)

:::

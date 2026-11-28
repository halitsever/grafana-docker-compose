---
title: "cAdvisor Image: gcr.io, ghcr.io or Docker Hub?"
titleTemplate: false
description: "Where the cAdvisor container image lives: gcr.io up to v0.55.1, ghcr.io for v0.53.0 and later, and why the google/cadvisor image on Docker Hub stops at 2019."
headline: "Which registry to pull the cAdvisor image from"
date: "2026-11-28"
keyword: "cadvisor docker hub image alternative to gcr.io"
faq: [{"q": "What is the official cAdvisor Docker image?", "a": "The cAdvisor README points to ghcr.io/google/cadvisor for v0.53.0 and later, and to gcr.io/cadvisor/cadvisor for earlier versions."}, {"q": "Is google/cadvisor on Docker Hub still updated?", "a": "No. On 28 November 2026 its newest tag was v0.33.0, last updated in February 2019, apart from a canary tag from 2021."}, {"q": "Why is the ghcr.io tag without a v?", "a": "The cAdvisor README example uses the version number without a leading v, for example 0.55.1. The registry holds both forms for recent releases."}]
---

::: v-pre

# Which registry to pull the cAdvisor image from

<p class="post-meta">By <a href="https://halit.org">Halit Sever</a> · <time datetime="2026-11-28">28 November 2026</time></p>

<p class="lead">Search for a cAdvisor Docker image and you find three registries. Only one of them gets new releases today. This post lists what each registry holds, as checked against the registries themselves on 28 November 2026, and how to switch this stack's image.</p>

## The three registries

| Registry | Image | Newest tag on 28 Nov 2026 | Status |
| --- | --- | --- | --- |
| GitHub Container Registry | `ghcr.io/google/cadvisor` | `0.61.1` / `v0.61.1` | Current releases |
| Google Container Registry | `gcr.io/cadvisor/cadvisor` | `v0.55.1` | No newer tags |
| Docker Hub | `google/cadvisor` | `v0.33.0` (Feb 2019) | Abandoned |

The [cAdvisor README](https://github.com/google/cadvisor) says it in one comment: use `ghcr.io/google/cadvisor:$VERSION`, and "for versions prior to v0.53.0, use gcr.io/cadvisor/cadvisor instead". The tag lists above come from each registry's API on the date shown. The newest release on GitHub at that time was v0.61.1, published 18 November 2026.

## What this stack pins

```yaml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:v0.55.1
  privileged: true
```

That image exists and pulls fine. It is also the last tag on gcr.io, so Dependabot, which bumps the compose file, has nothing newer to offer from that registry. Moving to ghcr.io is a one-line change.

## Switch to ghcr.io

```yaml
cadvisor:
  image: ghcr.io/google/cadvisor:0.61.1
```

Then pull and recreate only that service:

```bash
docker compose pull cadvisor
docker compose up -d cadvisor
```

Nothing else changes: the port (8080), the volumes and the Prometheus scrape job (`cadvisor:8080` every 10 seconds) stay the same. Check `http://localhost:9090/targets` afterwards; the `cadvisor` target should be up again within a scrape or two. Read the release notes between the two versions before you jump six minor versions on a server you care about.

## When gcr.io or ghcr.io is blocked

Some networks block one registry but not another. Three options, from simplest:

1. **Use the other registry.** ghcr.io holds v0.53.0 and later. gcr.io holds older versions up to v0.55.1, so v0.54.1 and v0.55.1 are on both.
2. **Mirror it yourself.** On a machine that can reach the registry:

```bash
docker pull ghcr.io/google/cadvisor:0.61.1
docker tag ghcr.io/google/cadvisor:0.61.1 registry.example.com/cadvisor:0.61.1
docker push registry.example.com/cadvisor:0.61.1
```

   Then point `image:` at your registry.
3. **Move the file.** `docker save` the image to a tar file, copy it over and `docker load` it on the server.

Avoid copies that other Docker Hub users uploaded under their own names. You cannot tell how they were built, and cAdvisor runs with `privileged: true` and the Docker socket mounted, so it can do anything on the host.

## Why the Docker Hub image is still in tutorials

`google/cadvisor` was the official image until 2019, and many older blog posts and compose files still use `google/cadvisor:latest`. On Docker Hub, `latest` was last updated in January 2019, more than seven years and dozens of releases before v0.61.1. If you inherit a compose file that uses it, the switch above is the fix.

## Check what you are running

```bash
docker compose images cadvisor
```

The output shows the repository and tag each running container was created from. The [cAdvisor guide](/guide/cadvisor) explains the volumes and why the container runs privileged, and the [metrics post](/blog/cadvisor-metrics) covers what to graph once it runs.

## FAQ

### What is the official cAdvisor Docker image?

The cAdvisor README points to ghcr.io/google/cadvisor for v0.53.0 and later, and to gcr.io/cadvisor/cadvisor for earlier versions.

### Is google/cadvisor on Docker Hub still updated?

No. On 28 November 2026 its newest tag was v0.33.0, last updated in February 2019, apart from a canary tag from 2021.

### Why is the ghcr.io tag without a v?

The cAdvisor README example uses the version number without a leading v, for example 0.55.1. The registry holds both forms for recent releases.

## Related posts

- [Alertmanager settings that keep a small server quiet](/blog/alertmanager-best-practices)
- [Moving Grafana dashboards around as JSON](/blog/grafana-export-import-dashboard)
- [The cAdvisor container metrics worth a Grafana panel](/blog/cadvisor-metrics)
- [All posts](/blog/)

:::

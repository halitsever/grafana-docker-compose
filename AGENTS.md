# AGENTS.md

A self-hosted Grafana, Prometheus, Alertmanager, Node Exporter and cAdvisor stack for people monitoring their own servers with Docker.

## Verify a change

CI (`.github/workflows/ci.yml`) runs these on push and PR to `main`. Run them locally with Docker before pushing:

```bash
docker compose config -q
docker run --rm -v "$PWD/prometheus.yml:/etc/prometheus/prometheus.yml:ro" -v "$PWD/prometheus/rules:/etc/prometheus/rules:ro" --entrypoint promtool prom/prometheus:v3.16.0 check config /etc/prometheus/prometheus.yml
docker run --rm -v "$PWD/prometheus:/p:ro" --entrypoint promtool prom/prometheus:v3.16.0 test rules /p/tests/node_test.yml
docker run --rm -v "$PWD/alertmanager:/cfg:ro" --entrypoint amtool prom/alertmanager:v0.35.0 check-config /cfg/alertmanager.yml
```

- `prometheus/tests/node_test.yml` holds promtool unit tests for the alert rules. It lives outside `prometheus/rules/` because Prometheus loads every `.yml` there as a rule file.
- `promtool check config` also checks every file in `prometheus/rules/`, so new rule files need no extra step.
- `docker compose config` warns that `version` is obsolete. The warning does not fail CI.

## Gotchas

- The Alertmanager inhibit rule pairs warning and critical alerts through their shared `resource` label. A new warning and critical pair needs the same `resource` value on both rules.
- Image tags live in two places: `docker-compose.yml` and the `promtool` / `amtool` images in `ci.yml`. Dependabot bumps only the compose file, so update the CI tags in the same PR.
- The dashboard JSON exists twice: `grafana/dashboards/node-exporter.json` and `grafana/provisioning/dashboards/json/node-exporter.json`. Only the provisioning copy is mounted. Keep both identical.
- Dashboard panels use the `${datasource}` template variable, not a fixed data source uid.
- The README's main command is `docker stack deploy`, which does not read `.env` and ignores `restart`, `depends_on` and `privileged` (cAdvisor needs it). `docker compose up -d` honours all of them.
- `.env` is gitignored. Add new variables to `.env.example` with a default in `docker-compose.yml` (`${VAR:-default}`).
- Grafana listens on host port 1296, not 3000.
- Prometheus runs with `--web.enable-lifecycle`, so `curl -X POST localhost:9090/-/reload` applies config changes without a restart.
- The node scrape target carries the placeholder label `instance: "My Favorite Server Name"`. Alert summaries show it.

## Docs site

The VitePress site in `docs/` deploys to https://projects.halit.org/grafana-docker-compose/ through `.github/workflows/docs.yml`. Build it with:

```bash
cd docs && npm ci && npm run build
```

- The site quotes image tags, ports, scrape intervals, alert rules and dashboard panels. When one changes in the config, update `docs/guide/*.md` and the data arrays in `docs/.vitepress/theme/*.vue` in the same PR.
- Dark theme only. The landing page is `docs/.vitepress/theme/Landing.vue`.

## Conventions

- Commit subjects in conventional-commit style, English, subject line only, no body or trailer.
- Work on a branch and open a PR. The owner merges.
- No emoji in new text. YAML comments are short, one line, and explain why.
- The README follows the owner's template. Every image from `halitsever-api.vercel.app` stays byte-for-byte, except the `title=` value of `api/repo-title` and the issue wrapper link.

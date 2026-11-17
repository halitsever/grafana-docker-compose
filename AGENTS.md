# AGENTS.md

A self-hosted Grafana, Prometheus, Alertmanager, Node Exporter and cAdvisor stack for people monitoring their own servers with Docker.

## Verify a change

CI (`.github/workflows/ci.yml`) runs these on push and PR to `main`. Run them locally with Docker before pushing:

```bash
docker compose config -q
docker run --rm -v "$PWD/prometheus.yml:/etc/prometheus/prometheus.yml:ro" -v "$PWD/prometheus/rules:/etc/prometheus/rules:ro" --entrypoint promtool prom/prometheus:v2.53.0 check config /etc/prometheus/prometheus.yml
docker run --rm -v "$PWD/alertmanager:/cfg:ro" --entrypoint amtool prom/alertmanager:v0.35.0 check-config /cfg/alertmanager.yml
```

- `promtool check config` also checks every file in `prometheus/rules/`, so new rule files need no extra step.
- `docker compose config` warns that `version` is obsolete. The warning does not fail CI.

## Gotchas

- Image tags live in two places: `docker-compose.yml` and the `promtool` / `amtool` images in `ci.yml`. Dependabot bumps only the compose file, so update the CI tags in the same PR.
- The dashboard JSON exists twice: `grafana/dashboards/node-exporter.json` and `grafana/provisioning/dashboards/json/node-exporter.json`. Only the provisioning copy is mounted. Keep both identical.
- Dashboard panels use the `${datasource}` template variable, not a fixed data source uid.
- The README's main command is `docker stack deploy`, which does not read `.env` and ignores `restart`, `depends_on` and `privileged` (cAdvisor needs it). `docker compose up -d` honours all of them.
- `.env` is gitignored. Add new variables to `.env.example` with a default in `docker-compose.yml` (`${VAR:-default}`).
- Grafana listens on host port 1296, not 3000.
- Prometheus runs with `--web.enable-lifecycle`, so `curl -X POST localhost:9090/-/reload` applies config changes without a restart.
- The node scrape target carries the placeholder label `instance: "My Favorite Server Name"`. Alert summaries show it.

## Conventions

- Commit subjects in conventional-commit style, English, subject line only, no body or trailer.
- Work on a branch and open a PR. The owner merges.
- No emoji in new text. YAML comments are short, one line, and explain why.
- The README follows the owner's template. Every image from `halitsever-api.vercel.app` stays byte-for-byte, except the `title=` value of `api/repo-title` and the issue wrapper link.

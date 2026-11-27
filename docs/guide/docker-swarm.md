---
title: Grafana on Docker Swarm
description: Deploy this Grafana Docker stack to Docker Swarm with docker stack deploy. Lists what Swarm ignores in the compose file and how to work around it.
---

# Deploy the Grafana stack on Docker Swarm

The compose file also works as a Swarm stack file. One command deploys all five services:

```bash
docker stack deploy -c docker-compose.yml monitoring-stack
```

Swarm reads the same file differently from `docker compose`, though. A handful of keys are ignored, and `.env` is not loaded. This page lists each difference and what to do about it.

## Deploy step by step

Swarm mode has to be active on the host. On a single machine:

```bash
docker swarm init
```

Run the deploy from the repository root, because the file uses relative bind mounts such as `./prometheus.yml` and `./grafana/provisioning`:

```bash
git clone https://github.com/halitsever/grafana-docker-compose.git
cd grafana-docker-compose
docker stack deploy -c docker-compose.yml monitoring-stack
```

Check the result:

```bash
docker stack services monitoring-stack
docker service logs monitoring-stack_prometheus
```

Swarm prefixes every service and volume with the stack name, so Grafana's service is `monitoring-stack_grafana` and its volume is `monitoring-stack_grafana_data`. Inside the stack network the short names still resolve. Prometheus keeps reaching `cadvisor:8080` and `alertmanager:9093`, and Grafana keeps reaching `prometheus:9090`.

The ports are the same as with Compose. Grafana is on port 1296.

## What `docker stack deploy` does differently

| In the compose file | With `docker compose up` | With `docker stack deploy` |
| --- | --- | --- |
| `.env` file | Loaded automatically | Not read |
| `restart: unless-stopped` | Applied | Ignored. Swarm restarts failed tasks by its own policy |
| `depends_on` | Controls start order | Ignored. Services start in any order |
| `privileged: true` on cAdvisor | Applied | Ignored |

### `.env` is not read

The compose file falls back to defaults when a variable is missing:

| Variable | Default without `.env` |
| --- | --- |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` |
| `GF_SERVER_ROOT_URL` | `http://localhost:1296` |
| `PROMETHEUS_RETENTION` | `30d` |

So a plain `docker stack deploy` gives you a Grafana admin password of `admin`. `docker stack deploy` does substitute variables that are set in your shell. Export the file's contents first:

```bash
cp .env.example .env
# edit .env, then:
set -a; . ./.env; set +a
docker stack deploy -c docker-compose.yml monitoring-stack
```

### Start order

Without `depends_on`, Grafana can start before Prometheus, and Prometheus before its targets. This settles by itself. Prometheus retries a failed scrape at the next interval, and Grafana queries Prometheus only when a dashboard is open.

### cAdvisor without privileged mode

cAdvisor needs `privileged` to read container data. Swarm drops the flag, so container metrics can be missing. If you need them, run the stack with `docker compose up -d` on that host. See the [cAdvisor guide](./cadvisor).

## Docker Swarm monitoring on more than one node

The file is written for one host. Keep these limits in mind before you point it at a multi-node cluster:

- Each service runs as a single replica with no placement rule. Node Exporter and cAdvisor therefore report on the one node their task lands on, not on every node.
- The bind-mounted config files must exist on whichever node runs the task. On a cluster, Swarm can schedule Prometheus on a node that has no copy of the repository.
- The named volumes are local to a node. If a service moves, it starts with an empty volume.

For a single-node swarm none of this applies. To watch other servers from there, run Node Exporter on each of them and add them as extra targets under the `node` job, as described in the [Node Exporter guide](./node-exporter#monitor-more-servers).

## Update and remove

Apply a change to the stack file by running the same deploy command again. For a change to `prometheus.yml` or the rule files, a reload is enough:

```bash
curl -X POST localhost:9090/-/reload
```

Remove the stack with:

```bash
docker stack rm monitoring-stack
```

The named volumes stay behind. Delete them with `docker volume rm` if you want a clean slate.

## Compose or Swarm

If you have one server and no existing swarm, `docker compose up -d` is the simpler route. It reads `.env`, keeps the restart policy and runs cAdvisor with the access it needs. Use `docker stack deploy` when the host is already a swarm manager and you want the stack managed like your other services. The [quick start](./quick-start) covers the Compose route.

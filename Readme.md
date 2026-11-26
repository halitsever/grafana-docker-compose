<p align="center" class="logo-section">
<img src="https://i.ibb.co/QmfBjVw/grafana.png" height="80" width="80" alt="Grafana logo"/>
</br>
<img src="https://halitsever-api.vercel.app/api/repo-title?title=Grafana%20Docker%20Compose">

<p align="center">
Grafana Docker Compose stack with Prometheus, Alertmanager, Node Exporter and cAdvisor for monitoring your servers and containers.<br>
It ships with a provisioned Grafana dashboard and Prometheus alert rules.<br>
<br/>
<br/>
<img src="https://img.shields.io/github/sponsors/halitsever" alt="GitHub Sponsors"/>
</p>
<p align="center">
<a align="center" href="https://www.linkedin.com/pulse/using-grafana-system-monitoring-deep-dive-docker-halit-sever-iu6kf">Documentation</a>
  </p>
</p>

<a align="center">
<img src="https://halitsever-api.vercel.app/api/details"/>
</a>

- [**Please check the article**](https://www.linkedin.com/pulse/using-grafana-system-monitoring-deep-dive-docker-halit-sever-iu6kf)
- **Grafana** with Prometheus provisioned as the default data source and a Node Exporter dashboard (CPU, memory, disk)
- **Prometheus** scraping Node Exporter, cAdvisor and itself, with configurable retention (30 days by default)
- **Alert rules** for instance down, CPU, memory, disk space, network errors and system load
- **Alertmanager** routing critical alerts to their own receiver, with commented email and Slack webhook receivers
- **cAdvisor** for Docker container metrics
- CI validates the compose file, Prometheus config and rules, and Alertmanager config

<a align="center" >
<img src="https://halitsever-api.vercel.app/api/installation"/>
</a>

```bash
docker stack deploy -c docker-compose.yml monitoring-stack
```

### Prometheus and Grafana with Docker Compose

To run it with plain Docker Compose, copy `.env.example` to `.env`, set the Grafana admin password and start the stack:

```bash
cp .env.example .env
docker compose up -d
```

| Service       | Port |
| ------------- | ---- |
| Grafana       | 1296 |
| Prometheus    | 9090 |
| Alertmanager  | 9093 |
| Node Exporter | 9100 |
| cAdvisor      | 8080 |

Add more servers under the `node` job in `prometheus.yml`, and alert receivers in `alertmanager/alertmanager.yml`.

### cAdvisor in Docker Compose

cAdvisor runs as the `cadvisor` service with `privileged: true` and read-only mounts of the host filesystem and Docker's data directory. Prometheus scrapes it every 10 seconds. `docker stack deploy` ignores `privileged`, so if container metrics are missing, start the stack with `docker compose up -d` instead.

<a align="center" href="https://github.com/halitsever/grafana-docker-compose/issues">
<img src="https://halitsever-api.vercel.app/api/issue"/>
</a>

<p align="center">
Found a bug or have an idea? Open an <a href="https://github.com/halitsever/grafana-docker-compose/issues">issue</a>.<br/>
Read the <a href=".github/CONTRIBUTING.md">contributing guide</a> before sending a pull request.
</p>

<a align="center">
<img src="https://halitsever-api.vercel.app/api/sponsor"/>
</a>

<a align="center">
<img src="https://halitsever-api.vercel.app/api/license"/>
</a>

<p align="center">
  MIT LICENSE - Halit Sever
</p>

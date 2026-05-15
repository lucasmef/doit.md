# Dev standby on the shared VPS

The development deployments prepare the latest build on disk but intentionally
leave dev services stopped to save RAM. Production workflows are unchanged and
still restart/healthcheck their production services.

## Services

- doit dev: `doit-dev.service` on port `8111`
- Salomao dev: `salomao-dev.service` on port `8101`
- Salomao Inter dev: `salomao-inter-dev.service` on port `8102`

## Stop dev services

```bash
sudo systemctl stop doit-dev.service salomao-dev.service salomao-inter-dev.service
```

## Prevent dev services from starting on boot

```bash
sudo systemctl disable doit-dev.service salomao-dev.service salomao-inter-dev.service
```

## Start dev temporarily

```bash
sudo systemctl start doit-dev.service salomao-dev.service salomao-inter-dev.service
```

Healthchecks:

```bash
curl --fail http://127.0.0.1:8111/api/health
curl --fail http://127.0.0.1:8101/api/v1/health
```

## Return dev to standby after use

```bash
sudo systemctl stop doit-dev.service salomao-dev.service salomao-inter-dev.service
```

`systemctl start` does not re-enable boot startup. If the services were disabled
before starting them, stopping them returns the server to standby.

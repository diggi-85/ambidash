# Ambidash-Spike (Wegwerf-Code)

Beweist: Dashboard-Strategy `custom:ambidash` zeigt eine vollflächige Kachel mit Live-Zustand. Nichts davon wandert 1:1 ins Repo.

```yaml
strategy:
  type: custom:ambidash
  entity: sun.sun        # beliebige Entität
  fit: overlay           # overlay = ganzes Fenster · inline = nur die Ansicht (Kopfzeile bleibt)
```

## Lokal ausprobieren (nur `localhost`, nie die Live-HA)

```bash
uv venv --python 3.14 venv && uv pip install --python venv/bin/python homeassistant==2026.11.0
mkdir -p config && ln -s "$PWD/dev/configuration.yaml" config/configuration.yaml && ln -s "$PWD/custom_components" config/custom_components
venv/bin/hass -c config                    # http://localhost:8123
venv/bin/python -I dev/setup.py            # legt Test-Konto und die Dashboards ambidash-overlay / ambidash-inline an
```

`dev/setup.py` geht von einem frischen Onboarding aus und legt Konto und Dashboards selbst an.

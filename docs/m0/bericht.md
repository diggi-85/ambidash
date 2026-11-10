# Ambidash · M0-Bericht

Stand 7. November 2026 · Grundlage: Ambiframe 0.9.0 (Commit `261351f`), Home Assistant 2026.11.0

## 1. Kurzfassung

- **Der Design-Kern lässt sich gut herauslösen.** Tokens, 35 Stile, Paletten, Schriften, Bedingungen, Icons und die i18n-Mechanik sind rund 4.000 Zeilen mit wenigen Abhängigkeiten (Lit und ein `Hass`-Typ).
- **Nicht 1:1 übertragbar:** das Layout (feste Bühne 1280×800, skaliert), die Aktionen (stecken in `display/page.ts` und `display/display.ts`), die i18n-Schlüssel (deutscher Text), die Stil-IDs (deutsch) und der CSS-Präfix `--af-` (an `:host([theme])` gebunden).
- **Spike:** Die Strategy `custom:ambidash` läuft in einem lokalen HA 2026.11.0 vollflächig (Desktop 1024×768, Handy 375×812) mit Live-Zustand. Dashboards lassen sich per WebSocket anlegen. **Auf Benjamins Live-HA bestätigt (7. November):** In der HA-App und in Fully läuft die Kachel vollflächig. Der Spike liegt dort als Inline-Ressource und Dashboard `ambidash-spike` (Rückbau: Abschnitt 5).
- **Fünf Funde ändern den Plan** (Abschnitt 4).

## 2. Ambiframe in Zahlen

| | |
|---|---|
| Python | 5,1k Zeilen, 30 Module |
| TypeScript | 31,3k Zeilen, davon 5k Übersetzungen, `display.ts` 3,0k, `styles.ts` 2,3k, `studio.ts` 2,3k, `schemas.ts` 2,0k |
| Tests | 12 vitest-Dateien (≈ 2,1k Zeilen), 9 pytest-Dateien (≈ 1,5k Zeilen) |
| CI | hassfest, HACS, pytest (Python 3.13), Frontend (Typen, Tests, Build) |
| Bundle | 1,02 MB minifiziert (311 KB gzip) in einer Datei, 13 Schriften 620 KB, das gebaute Bundle ist eingecheckt |

## 3. Aufteilung

### 3.1 Wandert fast 1:1 in `@ambi/core` (kopieren, Namen parametrisieren)

| Baustein | Quelle | Anmerkung |
|---|---|---|
| Token-Grundwerte hell/dunkel | `styles.ts:35–93` | Pflichtfarben `bg, ink, ink-2/3, line, surface, accent, accent-soft, cold, alert, good` (geprüft in `themes.test.ts`) |
| 35 Stile + 9 Jahreszeiten-Fassungen | `styles.ts:114–2026` | je Stil `shared/dark/light`, `ambient`, `tiles`, `flap`, `still` |
| Paletten, Tagesverlauf, Ostern/Jahreszeit | `styles.ts:181–213, 2029–2077` | reine Logik, gut testbar |
| 13 Schriften lokal | `fonts.json`, `fonts.ts`, Kopierschritt in `build.mjs` | Familienpräfix „Ambiframe …“ und Ziffern-Trick (`unicode-range`) parametrisieren |
| Bedingungen `show_if` | `util.ts:71–134`, `types.ts:27–48` | braucht nur `Hass` und den Vorlagen-Hook |
| Jinja-Vorlagen im Client | `template.ts` | WebSocket-Befehl (`ambiframe/template/subscribe`) injizierbar machen |
| i18n-Mechanik | `i18n.ts` | Schlüsselkonvention siehe 3.2 |
| Icons, Markdown, Ton | `icons.ts`, `markdown.ts`, `sound.ts` | |
| Format- und Entitätshelfer | `util.ts:1–70, 137–226` | `nameOf` anpassen (Namensänderung 2026.11) |
| Prüfmuster | `test/themes.test.ts`, `test/i18n-keys.ts` | Vorbild für CI-Regeln |

### 3.2 Muss angepasst werden

| Thema | Befund | Vorschlag |
|---|---|---|
| CSS-Präfix und Geltungsbereich | 116 Stellen mit `--af-*`; die Tokens hängen an `:host([theme=…][mode=light])` (`styles.ts:2109–2117`) | Token-CSS auf einen Wrapper (`.ambi-root[data-design][data-mode]`) legen, damit Einzelkarten und Sheets ohne Display-Host funktionieren. Präfix `--ambi-`; Ambiframe bekommt Aliase `--af-x: var(--ambi-x)`, damit eigenes Nutzer-CSS weiterläuft |
| Stil-IDs auf Deutsch | `ruhig, klar, gold …` in Config, `const.py:56` und Tests | Core nutzt neutrale englische IDs (`calm, clear, …`) plus Tabelle `legacy_id`; alte Ambiframe-Konfigurationen bleiben lesbar |
| i18n-Schlüssel = deutscher Text | `t("vor {n} min")`; der Test sammelt per Regex | `t()` im Core schlüsselneutral (`createI18n({ source, dicts })`); Ambidash nutzt englischen Quelltext als Schlüssel und Wörterbücher de/nl/fr, Ambiframe bleibt bei Deutsch |
| Aktionen | Typ in `types.ts:50–64`, aber Ausführung (Nachfrage, Rückmeldung, Vorschau-Schutz) im Display über das Event `af-action` (`page.ts:198`) | als `actions.ts` extrahieren (`runAction(hass, action, ctx)`), „kritische Aktion fragt nach“ gehört in den Kern |
| Neue Tokens | Kachel-Zustände, Domänenfarben, Touch-Größen, Sheet, Fokus-Ring, Bewegung gibt es nicht | Core erweitern; Pflichtfelder in den Test; neuer Kontrast-Test (WCAG AA) |
| `Hass`-Typ und Namen | Typ von Hand geschrieben (`types.ts:11–25`); `nameOf` liest `friendly_name` (`util.ts:59`) | HA 2026.11 zeigt namenlose Karten als „Gerät + Entität“ und will `friendly_name` abkündigen → Adapter `entityName()` |
| Schema doppelt gepflegt | `types.ts` ↔ `validation.py` (687 Zeilen) ↔ `const.py`, per Regex gegengeprüft (`themes.test.ts:9–14`) | je Format ein JSON-Schema (`ambidash-design/1`, Dashboard), das Python und TypeScript prüfen |

### 3.3 Bleibt Ambiframe-spezifisch (Vorbild, nicht Kern)

- **`display/display.ts` (3.001 Zeilen):** Playlist, Momente, Erinnerungen, Mitteilungszentrale, Videostream, Notfallmodus. Der Ruhemodus von Ambidash (M4) übernimmt nur Teile (Uhr, Foto, Momente).
- **`display/ambient.ts`, `effects.ts`:** Hintergrundanimationen, später als optionales Paket für den Ruhemodus.
- **51 Widgets (≈ 9k Zeilen):** Anzeige-Widgets. Für M1 nur Vorbild (Auto-Anpassung, `watched()`), keine Kopie, denn Ambidash-Widgets haben Größen S bis XL und steuern.
- **Studio und Editor:** `studio.ts`, `page-editor.ts`, `wizard.ts`, `form.ts`, `schemas.ts` sind das Vorbild für M2 (Formular-Schema `Field`, Undo in `studio.ts:338`, Herkunftsanzeige, Gesundheitscheck `health.ts`).
- **Python `hub`, `fully`, `airplay`, `stream`, `photosources`, `news`, `daily`, `summary`, `icloud`, `routes`:** Ambiframe-Funktionen. Wiederverwendbare Muster: `store.py` (Store, `.previous`, Validierung beim Laden), `websocket.py` (`_store`, `require_admin`, Abo über Dispatcher), `panel.py` (statischer Pfad, Bundle-Version aus mtime, `add_extra_js_url`), `entity.py` (Gerät je Anzeige, dynamisches Anlegen), `manifest.json`, `hacs.json`.

## 4. Funde, die den Plan ändern

1. **Das Layout-Modell passt nicht zu Handys.** Ambiframe rendert eine feste, skalierte Bühne (`grid.ts:25–59`). Das ist ideal für Wandtablets, aber nicht für scrollende Handy-Dashboards. Ambidash braucht in M1 ein fließendes 12er-Raster mit Layout je Gerätegröße. `autoPortrait` (`grid.ts:69ff`) taugt nur als Ableitungsidee.
2. **„Nur benötigte Entitäten abonnieren“ erreicht Ambiframe nicht.** `AfWidget.watched()` (`base.ts:29–61`) verhindert nur das Neuzeichnen. `hass.states` enthält im HA-Frontend immer alle Entitäten (bei dir ≈ 1.900). Echtes Filtern geht nur mit einem eigenen Abo: `subscribe_entities` mit `entity_ids` gibt es in HA 2026.11 (`websocket_api/commands.py:491`). Das Leistungsbudget in M0 misst beide Wege.
3. **Ambiframes Visual-Regression ist nicht lauffähig.** `tools/visual.mjs` braucht `frontend/dev/index.html` und `frontend/test/visual/*.png`; beides fehlt im Repo und in `~/ambiframe-github`, obwohl die Doku „Referenzbilder werden eingecheckt“ sagt. Ambidash baut eine eigene Demo-Umgebung mit Fake-`hass`. Das Ambiframe-Repo bleibt unverändert.
4. **Die CI-Basis ist veraltet.** Ambiframe nutzt Python 3.13 und `pytest-homeassistant-custom-component==0.13.316`. HA 2026.11 verlangt Python ≥ 3.14.2, die aktuelle Test-Bibliothek 0.13.375 ebenso. Ambidash-CI läuft auf 3.14.
5. **Kleinigkeiten:** `const.py` hat `VERSION = "0.2.0"`, `manifest.json` 0.9.0 (die Konstante wird als Panel-Version und Cache-Rückfall benutzt). Das Bundle ist eine 1-MB-Datei, also braucht Ambidash Code-Splitting je Widget für das Budget.

## 5. Spike

**Aufbau:** lokales HA 2026.11.0 (eigene venv, Python 3.14.8, nur `localhost`), Code in `spike/`. Anleitung: `spike/README.md`.

| Frage | Ergebnis | Status |
|---|---|---|
| Vollfläche ohne HA-Kopfzeile, ohne Zusatz-Plugin? | Die Dashboard-Strategy `custom:ambidash` erzeugt eine Ansicht `type: panel` mit einer Karte. Allein bleiben Kopfzeile (56 px) und Seitenleiste (255 px) sichtbar (`fit: inline`). Mit `position: fixed; inset: 0; z-index: 100` (die Technik aus Ambiframe) deckt die Kachel das ganze Fenster ab (`fit: overlay`): Desktop 1024×768 und Handy 375×812, Kachel = Fenster. Live-Zustand: Einen `input_boolean` per Dienst geschaltet, die Kachel wechselte von „off“ auf „on“ ohne Neuladen | ✔ Browser · ✔ HA-App und Fully (Benjamin am 7. November: „läuft vollflächig“). Details wie Statusleisten-Verhalten und Diagnosezeile wurden nicht berichtet |
| Dashboards per WebSocket anlegen? | ✔ `lovelace/dashboards/create` und `lovelace/config/save` (Admin); beide Test-Dashboards entstanden | ✔ |
| Standard-Dashboard je Benutzer? | Das Frontend (20261028.4) wertet `userData.default_panel`, dann `systemData.default_panel`, dann `localStorage.defaultPanel` aus. `frontend/set_user_data` (Schlüssel `core`) schreibt nur für den **aufrufenden** Benutzer und ersetzt das ganze Objekt (also zusammenführen); `frontend/set_system_data` ist Admin-only. **Folge:** Das Studio kann das Standard-Dashboard für alle (System) und für sich selbst setzen, aber nicht für andere Benutzer. Vorschlag: System-Standard setzen, je Benutzer Anleitung mit QR-Code; Wandtablets öffnen ohnehin per Start-URL | ✔ aus Quelltext und Schnittstelle, Schreiben ungetestet |
| JavaScript von Community-Widgets | Empfehlung: Ambidash lädt selbst aus `/config/ambidash/widgets/*.js` (Backend listet und liefert aus, das Studio zeigt die Herkunft). HACS-Pakete vom Typ Dashboard (Plugin) laufen ebenfalls, weil sie nur `window.ambidash.registerWidget(…)` aufrufen; ein Stub nimmt Aufrufe in einer Warteschlange an, falls ein Widget vor dem Kern lädt. Grund: Lovelace-Ressourcen brauchen Admin-Registrierung, der eigene Ordner nicht | Entwurf, nicht gebaut |
| CSS-Präfix | `--ambi-`, in Ambiframe Aliase `--af-*` | Empfehlung |

**Zusatzfund:** Strategies melden sich für den Editor über `window.customStrategies` (`strategyType: dashboard` oder `section`). HA 2026.11 bringt Section-Strategies mit „Community-Abschnitten“. Ambidash-Widgets könnten später als Abschnitte in normalen Dashboards erscheinen.

**Live-Test auf Benjamins HA (7. November, durchgeführt; rückbaubar, kein Neustart, keine Integration):**
1. eine **inline** Lovelace-Ressource mit dem Spike-JS (über den HA-MCP, ohne Datei auf dem Server),
2. ein Dashboard `ambidash-spike` mit `strategy: custom:ambidash` (Overlay),
3. du öffnest es in der HA-App am Handy und in Fully auf dem Tab A9+.

Rückbau: Dashboard `ambidash-spike` und die Inline-Ressource löschen. Beides steht noch auf der Live-HA, bis Benjamin den Rückbau freigibt. Unterschied zur Endarchitektur: Hier lädt die Ressource das Skript, später `add_extra_js_url`; das Rendering ist dasselbe.

## 6. Beachten bei HA 2026.11

- **Namen:** Karten ohne Namen zeigen „Gerät + Entität“, `friendly_name` soll abgekündigt werden. Alles läuft über einen Adapter.
- **HACS** ist eingebaut (Einstellungen → Marketplace), der alte HACS-Installer endet mit 2026.11. Anforderungen für Custom-Repos und die Standardliste vor dem Release neu prüfen. Offen: unterstützt der Marketplace `zip_release` aus `hacs.json`?
- **Browser-Minimum** Chrome 67, Safari 15.4, Firefox 98; Fire-Tablets mit WebView 59 laufen nicht mehr (betrifft Fully dort).
- **Sichtbarkeitsbedingungen** in HA-Karten (Template, Sonne, Zone, Benutzer, Bildschirm) gibt es seit 2026.10. `show_if` von Ambidash bleibt ein eigenes System; die Überschneidung wird dokumentiert.
- **Strategy-Neuerzeugung:** `registryDependencies` und `shouldRegenerate` steuern, wann HA die Strategy neu erzeugt. Das bestimmt, wie oft das Dashboard neu aufgebaut wird.
- **Name „Ambidash“:** Auf GitHub gibt es nur das leere Repo `tanujdargan/ambidash` (ohne Beschreibung, 0 Sterne, zuletzt 14.06.2026 aktualisiert). Nach HACS-Marketplace-Namen vor dem Release erneut suchen.

## 7. Repo-Gerüst und CI für M0 (Vorschlag, noch nichts angelegt)

```text
ambidash/
  custom_components/ambidash/     config_flow, store, websocket, panel (aus Mustern von Ambiframe)
  frontend/
    packages/core/                @ambi/core: Tokens, Stile, Schriften, Bedingungen, Aktionen, i18n, Icons
    packages/sdk/                 @ambidash/sdk (ab M4; in M0 nur Platzhalter)
    src/                          Strategy, Renderer, Einzelkarten (Studio ab M2)
    dev/                          Demo-Umgebung mit Fake-hass (für Visual-Regression)
    test/  tools/
  designs/  docs/  examples/  tests/  scripts/
  hacs.json  README.md  README.de.md  LICENSE  CLAUDE.md
```

| CI-Job | Inhalt |
|---|---|
| `hassfest` | wie Ambiframe |
| `hacs` | HACS-Action (nach Marketplace-Umstellung prüfen) |
| `python` | Python **3.14**, aktuelle `pytest-homeassistant-custom-component`, pytest |
| `frontend` | `npm ci`, Typen, vitest (happy-dom), Build, **Bundle-Größen-Budget** |
| `core-checks` | Pflicht-Tokens je Stil, Kontrast WCAG AA, i18n-Vollständigkeit, Schema-Parität Python ↔ TypeScript |
| `ha-beta` | wöchentlich, Tests gegen die aktuelle HA-Beta |
| `visual` | ab M1, sobald die Demo-Umgebung steht |
| `release` | Tag → GitHub-Release mit gebautem Bundle und Changelog |

Entwicklungsumgebung: `scripts/dev-ha.sh` baut auf dem Spike auf (lokales HA mit Test-Konto), `scripts/deploy.sh` kopiert auf die Testinstanz wie bei Ambiframe.

## 8. Entscheidungen

**Entschieden (7. November 2026):**
1. **Lizenz: MIT.** Die Schriften stehen unter OFL; die Beispielfotos von Chris Gunia dürfen nur in Ambiframe verwendet werden, also nicht ins Ambidash-Repo.
3. **Lovelace-Dashboards: einbetten plus Import HA-eigener Karten.** Das Widget „Lovelace-Karte“ bettet jede Karte ein (Bubble-Card-Pop-ups verlieren dabei den Hash-Routing-Kontext des Dashboards). Ab M2 wandelt ein Import HAs eigene Karten (Tile, Licht, Thermostat u. a.) in Ambidash-Widgets um.
6. **i18n: englischer Quelltext als Schlüssel**, Wörterbücher de/nl/fr, Test auf fehlende Texte wie bei Ambiframe.
7. **Mindest-HA-Version: 2026.11** (nicht die empfohlene 2026.10). Folgen: `hacs.json` mit `"homeassistant": "2026.11.0"`, CI nur gegen 2026.11 und die Beta, keine Fallbacks für ältere Frontend-Schnittstellen, Nutzer haben den eingebauten Marketplace.

**Noch offen (blockiert M0 nicht):**
2. **Zeitrahmen der öffentlichen Beta (v0.3).**
4. **Logo und Auftritt:** Schwester-Logo zu Ambiframe?
5. **Name final** nach der HACS-Prüfung (spätestens vor dem Release).

**Spike auf der Live-HA (Punkt 8):** Der Live-Test ist erledigt (läuft vollflächig in HA-App und Fully). Offen: zurückbauen oder bis M1 als Testfläche stehen lassen.

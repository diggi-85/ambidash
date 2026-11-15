# Ambidash – CLAUDE.md

Ambidash ist eine Home-Assistant-Custom-Integration, die das HA-Dashboard durch ein eigenes System aus Karten, Widgets und Pop-ups ersetzt: nativ in HA, schöner, leichter einzurichten, stärker anpassbar. Vorbild für Optik, Codequalität und Bedienung ist Benjamins Integration [Ambiframe](https://github.com/diggi-85/ambiframe) (MIT).

## Zusammenarbeit

- Benjamin (GitHub `diggi-85`) entscheidet, Claude entwirft, baut und testet. Auf Deutsch, informell und direkt.
- **Erst besprechen, dann bauen.** Zu jedem Meilenstein kommt zuerst ein Plan; nichts wird gebaut oder gepusht, was Benjamin nicht freigegeben hat.
- Kleine, getestete Schritte; jeder Schritt baut und ist grün. Zeigen statt beschreiben (Screenshots), kurze Zusammenfassung auf Deutsch.
- Bei Unklarheit eine klare Frage mit Empfehlung stellen, nicht raten.
- **Benjamins Live-HA nur lesen.** Schreiben (Dashboards, Ressourcen, Neustart, Integration installieren) nur nach Rückfrage; danach den Zustand prüfen und sagen, wie man es zurückbaut.
- Ambiframe ist Referenz, keine Baustelle: lesen, kopieren, anpassen. Änderungen am Ambiframe-Repo nur nach Rückfrage.
- Testgeräte: sein Mac, sein Handy mit der HA-App, das Küchen-Tablet (Samsung Tab A9+, Fully Kiosk). Testfeld: seine Live-Instanz (HA 2026.11.0, rund 1.900 Entitäten, Bubble Card, kiosk-mode).

## Leitsätze (entscheiden im Zweifel)

1. Schön ohne Basteln (kein card-mod, kein YAML). 2. In zehn Minuten fertig (Assistent). 3. Immer ein Erweitert-Modus (Raster, Bedingungen, Jinja, CSS, YAML; pro Gerät gemerkt). 4. Ein System, viele Designs (Tokens, Designs sind teilbare Dateien). 5. Dynamisch statt starr (Zustandsstile ohne Code). 6. Läuft überall in HA (Browser, App, Kiosk, Standard-Dashboard je Benutzer). 7. Schnell und stabil (Tab A9+, HA-Updates ohne Nacharbeit). 8. Familientauglich. 9. Frei (MIT, keine Bezahlschranke).

## Entscheidungen (Stand 7. November 2026)

| Thema | Entscheidung |
|---|---|
| Verhältnis zu Ambiframe | Neues Repo; Design-Kern `@ambi/core` aus Ambiframe kopiert (nicht verschoben), später stellt Ambiframe in eigenem PR um |
| Architektur | Hybrid: eigener Renderer und Studio, eingehängt als Lovelace-Strategy `custom:ambidash`; Widgets auch als Einzelkarten `custom:ambidash-<widget>` |
| Geräte | Handy, Tablet, Browser, HA-App gleichwertig ab der ersten Version |
| Name | Ambidash, Domain `ambidash`; vor dem Release HACS und GitHub erneut prüfen (leeres Repo `tanujdargan/ambidash`) |
| Umfang v1.0 | Licht, Klima, Rollläden, Medien, Szenen; Design-Galerie mit Import/Export; Widget-SDK; Ruhemodus; Dashboards je Person und Gerät |
| Sprache | Code, Kommentare, Commits, Issues Englisch; README und Doku DE und EN; Oberfläche DE, EN, NL, FR |
| Lizenz | MIT (bestätigt 7. November 2026) |
| i18n | Englischer Quelltext als Schlüssel; Wörterbücher de/nl/fr; Test auf fehlende Texte |
| Mindest-HA-Version | 2026.11 (CI gegen 2026.11 und Beta, keine Fallbacks für ältere Frontend-Schnittstellen) |
| Bestehende Lovelace-Dashboards | Karten einbetten (Widget „Lovelace-Karte“); ab M2 Import HA-eigener Karten (Tile, Licht, Thermostat u. a.) in Ambidash-Widgets |
| Noch offen | Zeitrahmen der öffentlichen Beta, Logo, endgültiger Name (HACS-Prüfung vor dem Release) |

## Architektur

Integration `ambidash` (Python: Config-Flow, `.storage/ambidash`, WebSocket `ambidash/*`, Vorlagen serverseitig, Dienste) + ein Frontend-Bundle (Lit 3, TypeScript, esbuild), global per `add_extra_js_url` geladen. Drei Oberflächen: Strategy-Dashboard (Renderer), Studio (Admin-Panel per `panel_custom`), Einzelkarten. Pakete: `@ambi/core` (Tokens, Stile, Schriften, Bedingungen, Aktionen, i18n, Icons) und `@ambidash/sdk` (Widget-SDK, ab M4).

## Stand (Beta 0.2, 15. November 2026)

Alles unten ist gebaut und getestet (3.305 Frontend-Tests, 148 Python-Tests). Was nur per Test und nicht von Hand geprüft ist, steht in `docs/testmatrix.md`. Auf der Instanz des Maintainers läuft die Beta in der HA-App und in Fully Kiosk; Instanzdetails (Installation, Sicherungen, Rückbau) stehen nicht im Repo.

**Dashboard.** Strategy `custom:ambidash` → Panel-Ansicht mit `custom:ambidash-root` (`frontend/src/root.ts`). Ohne `pages` zeigt der Root Chips, Etagen → Bereiche → Kacheln aus den Registries (`model.ts`); mit `pages` ein Raster je Geräteklasse (Handy 4, Tablet 8, Wand 12 Spalten nach Kartenbreite, `layout.ts`), Reiter für mehrere Seiten. HA-Interna nur in `adapter.ts`.

**Elemente.** Typ-Tabelle `KINDS` in `layout.ts` (Kennung, Mindest- und Standardgröße: ein neuer Typ beginnt dort). `tile` (`tile.ts`, `describe.ts`; `tap`/`hold` = `popup` | `more-info` | `none`), `heading`, `summary`, `card` (`card.ts`: Home Assistants `hui-card` über `window.loadCardHelpers`, HA-Variablen auf Design-Tokens; im Studio-Panel gibt es `loadCardHelpers` nicht, dort Platzhalter), `clock` (`clock.ts`, Ambiframes Uhr-Tokens), `weather` (`weather.ts`, Abo `weather/subscribe_forecast`). Pop-up `popup.ts` mit Reglern je Geräteart; ohne Root fällt die Kachel auf den HA-Dialog zurück.

**Bedingungen.** `show_if` an jedem Element (`conditions.ts`, Typ `Condition` in `types.ts`, Ambiframe-Form: `state`, `not_state`, `numeric`, `template`, `time`, `device`, `and`/`or`/`not`). Nicht erfüllt = nicht gezeichnet, der Platz bleibt leer; Minutentakt nur bei Zeitbedingungen. `states` an Kacheln (`statestyle.ts`): erste zutreffende Regel, Farbe nur `accent`/`good`/`alert` aus dem Design, Symbol, Statustext; der Root löst die Tokens auf und gibt der Kachel einen internierten Look. Jinja (`template.ts`, `TemplateWatcher` mit gemeinsamen Abos): Bedingung `template`, Vorlagen in Kachelname und Statustext, über WebSocket `ambidash/template/subscribe` (Admin jede Vorlage, andere nur gespeicherte; HA meldet kaputte Vorlagen als Fehler-Ergebnis, nicht beim Abonnieren).

**Ruhemodus.** Option `rest` (`RestConfig`, `rest.ts` `RestController`): nach `after` Minuten ohne Berührung eine Ebene mit Uhr und optional Wetter über dem abgedunkelten Hintergrund, Seite `inert`; Berührung, Taste oder Mausrad weckt, die erste Berührung trifft nichts darunter; kein Start bei offenem Pop-up; Standard nur Tablet und Wand; `when` (Bedingungsliste) erlaubt den Start und beendet ihn; Einbrennschutz 14 px je Minute. Die Studio-Vorschau (`preview`) ruht nie von selbst.

**Einzelkarten.** `single.ts`: `custom:ambidash-clock-card`, `-weather-card`, `-tile-card` (Suffix `-card`, weil der Elementname dem Typ entsprechen muss und `ambidash-clock` schon das Widget ist), in `window.customCards`; Größe über flexible Spalte mit Mindesthöhe (`cqh` taugte in Masonry nicht). Editor `single-editor.ts` mit HAs `ha-form`, schreibt nur Abweichungen vom Standard.

**Designs.** `frontend/packages/core`: 37 Designs (36 aus Ambiframes Export in `data/`, `npm run designs:import` erzeugt `ambiframe.generated.ts`; dazu `seasons`), englische Ids mit Ambiframe-Alias, Paletten, eigener Akzent, Kartenstile, 13 Schriften als woff2 (laden bei Gebrauch). Kontrast WCAG AA wird je Design getestet; jede Abweichung von Ambiframe steht in `DEVIATIONS` und `docs/design-abgleich.md`. Hintergründe: Farbe, Verlauf, Bild, Foto-Wechselshow (`photos.ts`, `custom_components/ambidash/photos.py`: Medienordner oder freie Fotos, die HA selbst abruft, abschaltbar).

**Studio.** Admin-Seitenleiste (`panel.py`, eigenes Bundle `studio.js`), `frontend/src/studio/`: Assistent mit vier Schritten (Name & Gerät mit Ruhemodus · Inhalte · Aussehen mit Design-Galerie · Titel & Sprache), Live-Vorschau mit dem echten Root, Undo/Redo (`history.ts`), Erweitert-Modus (`localStorage` `ambidash.advanced`: Optionen als JSON/YAML, YAML-Felder für Bedingungen). Layout-Editor (`layout-editor.ts`, reine Änderungen in `edit.ts`): Ziehen, Größe, Mehrfachauswahl, Tastatur, je Element „Anzeigen“ (`when.ts`), je Kachel Regeln. `yaml.ts` liest die YAML-Teilmenge, die HA-Editoren schreiben. Import eines Lovelace-Dashboards (`dashboard-import.ts`): nur verlustfrei Konvertierbares wird Kachel, Überschrift oder Widget, alles andere eingebettete Karte; `visibility` und Conditional-Karten werden `show_if`, wo Ambidash dasselbe sagen kann.

**Server.** `.storage/ambidash` versioniert mit `.previous` (`store.py`), strenge Prüfung mit Ortsangabe (`validation.py`), WebSocket `ambidash/config/{get,save,restore_previous,subscribe}` und `ambidash/template/subscribe` (`websocket.py`). Grenzen: 30 Seiten, 800 Elemente je Seite, Karte 20.000 Zeichen, Bedingungen Tiefe 4, 10 je Liste, 4000 Zeichen, 8 Regeln je Kachel, 20 Vorlagen je Dashboard.

**Bundles.** `ambidash.js` 154,6 KB von 163,8 KB (CI-Grenze 160 KiB, rund 9 KB Luft), `studio.js` 272 KB ohne Grenze. Beide sind eingecheckt, die CI prüft, dass sie aktuell sind.

**Lehren.** happy-dom wählt eine spät erzeugte, als gewählt markierte `<option>` falsch: Tests prüfen dann das Formular statt `select.value`; im Code `.selected` als Eigenschaft setzen. Lit schreibt eine vom Benutzer geänderte Checkbox nicht zurück, wenn der Sollwert gleich blieb: `live()` nehmen. Dev-HA braucht für Python-Änderungen einen Neustart.

**Offen.** Zustandsstile und Vorlagen auf den Einzelkarten und in der Rasteransicht des Studios; Aufwecken des Ruhemodus per Bedingung, freie Ruhe-Seite; CSS im Erweitert-Modus; Medienbrowser für Bild und Ordner; Design-Export/Import (`ambidash-design/1`); Widget-SDK; Visual-Regression (braucht eine Demo-Umgebung mit Fake-`hass`); Leistung, Akku und Wärme auf dem Tab A9+ (nie gemessen, auch nicht mit vielen eingebetteten Karten); Bubble-Card-Pop-ups in eingebetteten Karten ungeprüft.

## Was der Spike (M0) geklärt hat

- Strategy → Ansicht `type: panel` mit einer Karte; vollflächig nur mit `position: fixed; inset: 0; z-index: 100` (sonst bleiben HA-Kopfzeile und Seitenleiste). Kein Kiosk-Plugin nötig. Von Benjamin am 7. November in der HA-App und in Fully bestätigt (Spike als Inline-Ressource + Dashboard `ambidash-spike` auf der Live-HA).
- Dashboards anlegen per WebSocket `lovelace/dashboards/create` + `lovelace/config/save` (Admin).
- Standard-Dashboard: `userData.default_panel` → `systemData.default_panel` → `localStorage.defaultPanel`. `frontend/set_user_data` wirkt nur für den aufrufenden Benutzer, `frontend/set_system_data` ist Admin-only.
- Seit 2026.11: Karten ohne Namen zeigen „Gerät + Entität“, `friendly_name` soll abgekündigt werden → immer über den Adapter `entityName()`.
- HA 2026.11 braucht Python ≥ 3.14.2; CI entsprechend.

## Konventionen

- HA-Interna nur hinter einer Adapter-Schicht mit Tests. Konfiguration versioniert mit Migrationen, Teil jedes Backups, vorheriger Stand wiederherstellbar.
- Widgets nutzen nur Design-Tokens (`--ambi-*`), nie feste Farben. Stabile CSS-Schnittstelle: dokumentierte Variablen und `::part()`-Namen.
- Alle Texte über i18n; ein Test meldet fehlende Übersetzungen. Zwei Wörterbuchdateien: `frontend/src/i18n-dicts.ts` (was das Dashboard zeigt, im Skript jedes Dashboards) und `frontend/src/studio/dicts.ts` (was nur das Studio zeigt, vom Studio-Bundle über `studio/i18n-studio.ts` registriert); der Test prüft, dass jeder Text in der richtigen Datei steht und dass außerhalb des Studios nichts das Studio importiert. Ein neuer Studio-Text gehört nach `studio/dicts.ts` (und ein Text, den auch das Dashboard braucht, nach `i18n-dicts.ts`). Kontrast WCAG AA je Design (CI). Touch-Ziele mindestens 44 px.
- Externe Abrufe nur bewusst, abschaltbar, über das Backend. Ausblenden ist keine Rechteverwaltung; die Grenze ist der HA-Benutzer ohne Admin.
- Commits nach Conventional Commits, Englisch.

## Befehle

```bash
cd frontend && npm ci && npm run typecheck && npm test && npm run build   # Bundle nach custom_components/ambidash/frontend/
.venv/bin/python -m pytest        # Integration; Umgebung: uv venv .venv --python 3.14 && uv pip install --python .venv/bin/python -r requirements_test.txt
scripts/dev-ha.sh                 # lokales HA 2026.11 mit Demo-Geräten unter http://localhost:8123 (Zustand in .dev/, scripts/dev-ha.sh reset räumt auf)
```

Nach jedem Frontend-Build das Bundle mitcommitten (HACS installiert aus dem Repo). Im Browser nach einem Build die Datei hart neu laden, der Cache-Schlüssel `?v=` ändert sich erst mit einem HA-Neustart.

## Fahrplan

M0 Fundament (Repo, CI, `@ambi/core`, Spike) → M1 Erstes Dashboard (Renderer, Raster, Pop-ups, drei Stile, Kern-Widgets; v0.1 intern) → M2 Studio und Assistent (v0.3 öffentliche Beta) → M3 Designs (Format `ambidash-design/1`, Galerie) → M4 Community und Profile (SDK, Ruhemodus) → M5 Release (Budget, Barrierefreiheit, vier Sprachen; v1.0).
Jeder Meilenstein endet mit Demo, grüner CI und Benjamins OK. Zeitplan legt Benjamin fest.

Hintergrund: `docs/m0/bericht.md` (Ambiframe-Analyse, Spike-Ergebnisse), `docs/m0/spike/` (Wegwerf-Spike), `docs/testmatrix.md`.

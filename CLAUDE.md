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

## Stand (Beta 0.1)

Strategy `custom:ambidash` → Panel-Ansicht mit `custom:ambidash-root` (Chips, Etagen → Bereiche → Kacheln aus den Registries) → `ambidash-tile`. Fünfzehn Designs (`calm`, `clear`, `home` + zwölf aus Ambiframe in `designs-more.ts`) und das Datum-Design `seasons` (neun Jahreszeiten) in `frontend/packages/core`; dazu Hintergründe (Bild, Farbe, Verlauf), Foto-Wechselshow (Medienordner, Platzhalter-Fotos von Wikimedia/NASA/Picsum/Bing, die HA selbst abruft und ausliefert; Schalter in den Optionen, `custom_components/ambidash/photos.py`), Kartenstile, Paletten und eigener Akzent. Kontrast WCAG AA wird dort getestet, auch auf Seitenkunst und Kachelfüllungen. HA-Interna nur in `frontend/src/adapter.ts`. Das Bundle `custom_components/ambidash/frontend/ambidash.js` ist eingecheckt, die CI prüft, dass es aktuell ist.
Auf der Live-Instanz des Maintainers läuft die Beta in der HA-App und in Fully Kiosk. Wie sie dort installiert wurde, wie man sie zurückbaut und was geprüft wurde, steht nicht im Repo (Instanzdetails, bleiben beim Maintainer).
**Studio (Schritt 1, 8. November 2026, nur lokal getestet):** Admin-Seitenleiste „Ambidash“ (`panel.py`, eigenes Bundle `studio.js`, lädt nur dort), Speicher `.storage/ambidash` versioniert mit `.previous` (`store.py`, `validation.py`), WS `ambidash/config/{get,save,restore_previous,subscribe}` (`websocket.py`), Karte folgt per `dashboard: <id>`. Aussehen-Seite mit Live-Vorschau vorhanden. **Schritt 2 (Layout-Modell, 8. November 2026, lokal):** Option `pages` (Seiten mit Elementen `tile`/`heading`/`summary` und Plätzen je Geräteklasse, `frontend/src/layout.ts`, Server-Prüfung in `validation.py`), Anzeige im Root (Raster, Reiter, Klasse nach Kartenbreite), „Aus Bereichen erzeugen“ (`generate.ts`) im Studio. **Schritt 3 (Layout-Editor, 8. November 2026, lokal):** `frontend/src/studio/{edit,layout-editor}.ts` — Seiten links, Raster je Gerät (Handy/Tablet/Wand) mit echten Kacheln und dem Design, Ziehen, Größe, Mehrfachauswahl, Pfeiltasten, ⌘D, Entf, Geräte per Suche, Seiten anlegen/umbenennen/löschen; Handy und Wand folgen dem Tablet, bis dort etwas geändert wird. **Schritt 4 (Bedienung, 8. November 2026, lokal):** `frontend/src/popup.ts` (`ambidash-popup`: Regler je Geräteart für Licht, Klima, Rollladen, Player, Schalter, Szene; „Mehr Optionen“ führt zum HA-Dialog), Kachel kennt `tap`/`hold` (`popup` | `more-info` | `none`, Server prüft in `validation.py`), die Root-Karte fängt das Ereignis `ambidash-popup` ab und zeigt das Pop-up im eigenen Design (ohne Root fällt die Kachel auf den HA-Dialog zurück), Layout-Editor: „Ändern“ (Gerät tauschen) und Auswahl für Tippen/Halten. Im Dev-HA per echtem Klick geprüft: Lichtregler (81 % gesetzt), Klima-Stepper (21 → 21,5°) und die umbrechende Tastenzeile; Rollladen, Player und die Auswahlfelder im Studio nur per Unit-Tests. **Schritt 5 (Aussehen, 10. November 2026, lokal):** Aussehen-Seite um Akzentfarbe und Hintergrund erweitert (`frontend/src/studio/background.ts` rein, Formular in `studio.ts`: ohne, Farbe, Verlauf, Bild, Fotos mit Ordner, freien Fotos, Mischen, Wechselzeit, Bildnachweis, Abdunkeln, Unschärfe); im Dev-HA angesehen (Verlauf und Fotos-Felder, Vorschau folgt); Bild-Adresse und Ordner werden getippt, kein Medienbrowser-Dialog, keine Design-Galerie (Auswahlfeld bleibt). **Schritt 6 (Assistent, 10. November 2026, lokal):** vier Schritte in der Schrittliste des Studios (Name & Gerät mit Fullscreen-Wahl · Inhalte mit Bereichen/Gerätearten/Layout · Aussehen · Titel & Sprache), Zurück/Weiter, neues Dashboard startet bei Schritt 1; Erweitert-Modus (Schalter, `localStorage` `ambidash.advanced`) mit Optionen als JSON (Übernehmen) und YAML-Ansicht (`frontend/src/studio/options.ts`: `toYaml`, `toggleIn`); Bedienung (Tippen/Halten) liegt je Kachel im Layout-Editor, daher kein eigener Schritt. Kein YAML-Parser: Bearbeiten nur als JSON, YAML nur zum Ansehen/Kopieren. **Angleichung an Ambiframe (10. November 2026, lokal):** Benjamin hat Ambiframes Design-Export (`ambiframe-designs.json/.md`, 36 Stile, 9 Jahreszeiten, 13 Schriften, 5 Paletten) geliefert; beide Projekte sollen gleich aussehen. Umsetzung: Export liegt in `frontend/packages/core/data/`, `npm run designs:import` erzeugt `src/ambiframe.generated.ts` (21 neue Stile + Schriften der Handgemachten), `src/ambiframe.ts` bildet Ambiframes Tokens auf Kachel-Tokens ab (Kachel-Radius 0,8 ×, Kontrast AA wird erzwungen und jede Verschiebung steht in `DEVIATIONS` und `docs/design-abgleich.md`), englische Ids mit Ambiframe-Id als Alias, `src/fonts.ts` + 13 woff2 in `custom_components/ambidash/frontend/fonts/` (Familie „Ambidash <Name>“, laden nur bei Gebrauch), Test `packages/core/test/ambiframe.test.ts` prüft gegen den Export. Bundles wachsen (ambidash.js 137,7 KB). **Design-Galerie (10. November 2026, lokal):** der Look-Schritt zeigt alle 37 Designs als Karten mit Vorschau (`designCard` in `studio.ts`, Auswahlgruppe mit `role=radio`), im Dev-HA angesehen. Noch offen: händischer Blick auf Millennium/Gloss/Playful/Picture book (hell), Uhr-Widget mit Ambiframes Uhr-Tokens; auf der Live-HA ist noch die Fassung vom Install (ohne diese Designs), Aktualisieren nur mit OK. Inhalte (Uhr, Wetter, Lovelace-Karte), Bedingungen/Jinja/CSS im Erweitert-Modus und Design-Galerie folgen (Plan in der Memory und in den Entwürfen vom 8. November). Noch nicht da: Layout-Editor, Assistent, Galerie, SDK, Ruhemodus, eigene Schriften, Einzelkarten, Visual-Regression (braucht eine Demo-Umgebung mit Fake-`hass`), Leistungsmessung auf dem Tab A9+.

## Was der Spike (M0) geklärt hat

- Strategy → Ansicht `type: panel` mit einer Karte; vollflächig nur mit `position: fixed; inset: 0; z-index: 100` (sonst bleiben HA-Kopfzeile und Seitenleiste). Kein Kiosk-Plugin nötig. Von Benjamin am 7. November in der HA-App und in Fully bestätigt (Spike als Inline-Ressource + Dashboard `ambidash-spike` auf der Live-HA).
- Dashboards anlegen per WebSocket `lovelace/dashboards/create` + `lovelace/config/save` (Admin).
- Standard-Dashboard: `userData.default_panel` → `systemData.default_panel` → `localStorage.defaultPanel`. `frontend/set_user_data` wirkt nur für den aufrufenden Benutzer, `frontend/set_system_data` ist Admin-only.
- Seit 2026.11: Karten ohne Namen zeigen „Gerät + Entität“, `friendly_name` soll abgekündigt werden → immer über den Adapter `entityName()`.
- HA 2026.11 braucht Python ≥ 3.14.2; CI entsprechend.

## Konventionen

- HA-Interna nur hinter einer Adapter-Schicht mit Tests. Konfiguration versioniert mit Migrationen, Teil jedes Backups, vorheriger Stand wiederherstellbar.
- Widgets nutzen nur Design-Tokens (`--ambi-*`), nie feste Farben. Stabile CSS-Schnittstelle: dokumentierte Variablen und `::part()`-Namen.
- Alle Texte über i18n; ein Test meldet fehlende Übersetzungen. Kontrast WCAG AA je Design (CI). Touch-Ziele mindestens 44 px.
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

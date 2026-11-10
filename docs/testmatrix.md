# Testmatrix – Anforderungen und ihre Tests

Jede Anforderung verweist auf den Test, der sie belegt. Was ohne automatischen Test steht, gilt als **nicht abgesichert**
und wird vor einem Release von Hand geprüft.

Ausführen: `cd frontend && npm test` (Frontend) · `python -m pytest` (Integration, Umgebung siehe `requirements_test.txt`).

## Integration

| Anforderung | Test |
|---|---|
| Einrichtung mit einem Klick, nur ein Eintrag | `tests/test_integration.py::test_config_flow_creates_one_entry_and_rejects_a_second` |
| Bundle wird geladen und beim Entladen wieder entfernt | `test_setup_loads_the_bundle_and_unload_removes_it` |
| Neu laden registriert den statischen Pfad nicht doppelt | `test_reload_does_not_register_the_static_path_twice` |

## Design-Kern (`@ambi/core`)

| Anforderung | Test |
|---|---|
| Jedes Design hat alle Pflicht-Tokens in hell und dunkel | `packages/core/test/designs.test.ts` › defines every required token |
| Textkontrast WCAG AA (Text 4,5:1, Icons und Statusfarben 3:1) in jedem Design und Modus | `designs.test.ts` › meets WCAG AA / keeps icons and status colours at 3:1 |
| Glyphen bleiben auf jeder Bereichsfarbe lesbar | `designs.test.ts` › keep the glyph readable on every domain colour |
| Unbekanntes Design fällt auf das erste zurück | `designs.test.ts` › fall back to the first design |
| Sprache: Einstellung vor HA-Benutzer, Platzhalter, fehlende Übersetzung zeigt Englisch | `packages/core/test/i18n.test.ts` |

## Dashboard

| Anforderung | Test |
|---|---|
| Etagen nach Ebene, Bereiche nach Name, Kacheln nach Domäne, „Ohne Bereich“ zuletzt | `frontend/test/model.test.ts` › buildModel |
| Versteckte, Diagnose-, zustandslose und nicht unterstützte Entitäten fehlen | `model.test.ts` › leaves out … |
| Bereich vom Gerät, Name ohne Bereichspräfix, HA-Namensänderung 2026.11 abgefangen | `model.test.ts` › takes the area from the device, adapter |
| Kachel: Zustand, Farbe, Aktion je Domäne; Tore und Garagentore nur über den Dialog | `model.test.ts` › tileView |
| Tippen schaltet mit sofortiger Rückmeldung, korrigiert sich bei Widerspruch und bei Fehler | `frontend/test/ui.test.ts` › tile |
| Langes Drücken, Tastatur (Eingabe, Umschalt+Eingabe) und Kontextmenü öffnen den Dialog | `ui.test.ts` › opens the detail dialog / works from the keyboard |
| Kachel ist ein beschrifteter Button mit Schaltzustand | `ui.test.ts` › is a labelled button |
| Root-Karte: Chips, Etagen, Bereiche, eine Kachel je Entität, Sprache, Hell/Dunkel, Vollbild | `ui.test.ts` › root card |
| Nur die geänderte Kachel zeichnet neu | `ui.test.ts` › repaints only the tile whose state changed |
| Szenen stehen in einer eigenen Zeile oben, egal welcher Bereich | `model.test.ts` › puts scenes in a section of their own, `ui.test.ts` › renders chips, floors … |
| Ausblenden: Domänen, Bereiche (ID oder Name), Entitäten, ohne Bereich; Nicht-Listen werden ignoriert | `model.test.ts` › hides domains … / ignores options that are not lists, `ui.test.ts` › hides what the options hide |
| Vollbild: Knopf führt zurück (Standard `/`, eigener Pfad, mit `false` entfernbar), im HA-Bereich kein Knopf | `ui.test.ts` › leads back to Home Assistant …, goes to the HA start page … |
| Strategy erzeugt eine Panel-Ansicht und gibt Optionen weiter | `ui.test.ts` › strategy |
| Hintergrund: Bild (abgedunkelt, weichgezeichnet), Farbe, Verlauf; helle Schrift und Glas passend zum Ton | `ui.test.ts` › lays a picture behind the tiles …, uses a colour or a gradient … |
| `media-source://`-Bilder werden über HA signiert; schlägt das fehl, bleibt die Farbe | `ui.test.ts` › lets Home Assistant sign media-source pictures … |
| Konfigurierte Farbwerte können nicht aus dem `style`-Attribut ausbrechen | `ui.test.ts` › keeps configured values from breaking out … |
| Kartenstil Fläche, Glas, Linie, ohne; unbekannter Stil fällt auf das Design zurück | `ui.test.ts` › applies the card style, `designs.test.ts` › gives glass on a backdrop by default … |
| Textkontrast WCAG AA für jedes Design, jeden Modus und jeden Kartenstil | `designs.test.ts` › keeps text readable: design … |
| Textkontrast auf Bildern (auch weiß, ab leichtem Abdunkeln) und auf hellen, mittleren und dunklen Farben | `designs.test.ts` › … on a picture …, … on light, mid and dark colours … |
| Paletten (Nordisch, Vampir, Mocha, Retro, Nachtstadt): alle Tokens, WCAG AA in hell und dunkel und in jedem Kartenstil | `designs.test.ts` › palettes › … has every token and meets WCAG AA, … stays readable |
| Palette ändert nur Farben, Ambiframes deutsche Palette-IDs gelten weiter, unbekannte werden ignoriert | `designs.test.ts` › changes colours only …, understands Ambiframe's German ids … |
| Eigene Akzentfarbe gewinnt gegen Palette und Hintergrund, mit lesbarer Schrift darauf; nicht lesbare Farben werden ignoriert | `designs.test.ts` › lets your own accent win …, `ui.test.ts` › applies a palette and your own accent colour … |
| Fünfzehn Designs plus neun Jahreszeiten: alle Pflicht-Tokens, WCAG AA und 3:1 in hell und dunkel (auch mit Palette und in jedem Kartenstil) | `designs.test.ts` › design … (`ALL`), › palettes › design … with palette … |
| Text bleibt lesbar auf jeder Farbe der Seitenkunst (Farbwolken, Raster, Punkte, Kreise) und auf jeder Kachelfüllung (auch Verläufe); Status- und Akzentfarben 3:1 auf den Kacheln | `designs.test.ts` › tile fills and page art |
| Eigener Kachel-Look (Rand, Linie oben, Schatten, Füllung) gilt nur im Stil „solid“; Palette und Bild ersetzen Füllung und Seitenkunst, Formen bleiben | `designs.test.ts` › keeps a design's tile look …, › drops the page art … , › palettes › replaces the design's own fills … |
| E-Ink bewegt nichts | `designs.test.ts` › makes E-Ink still |
| Jahreszeiten: Ostern, Datum → Design für jeden Tag des Jahres, „seasons“ folgt dem Datum, einzelne Jahreszeit per ID | `designs.test.ts` › seasons, `ui.test.ts` › follows the date with the seasons design |
| Seitenkunst und Kachel-Look erscheinen im Dashboard, hinter einem Bild nicht | `ui.test.ts` › draws a design's page art and tile look … |
| Foto-Wechselshow: Ordner (nur Bilder, gemischt, von vorn), Platzhalter nur ohne eigene Fotos oder mit `mix`, Sprache an die Quelle, unbekannte Quelle nie, Bildnachweis abschaltbar, Neuladen nach 6 h | `frontend/test/photos.test.ts` |
| Zwei Ebenen blenden ineinander über; Konfigurationsbild bis zum ersten Foto und als Ersatz; Platzhalter und Nachweis; Schalter aus → Farbe; kaputtes Bild wird übersprungen; Pause bei verstecktem Tab; Stopp beim Entfernen, Neustart bei geänderten Optionen | `frontend/test/ui.test.ts` › slideshow |
| Platzhalterquellen (Wikimedia, Gemälde, NASA, Picsum, Bing): Querformat, gemeinfrei, keine Grafiken, Bildnachweis; Liste 6 h gemerkt, bei Fehlern die letzte gute | `tests/test_photos.py` › test_picsum… bis test_a_source_that_fails… |
| Nur Adressen auf den eigenen Servern der Quellen (https, genaue Domain oder Unterdomain) | `test_photos.py` › test_addresses_outside…, test_allowed_hosts… |
| Schalter „Abruf erlauben“ (Standard an) in den Optionen; aus: nichts abgerufen, Befehl meldet `external_disabled`, Reparaturhinweis bis er wieder an ist | `test_photos.py` › test_nothing_is_fetched…, test_the_options_flow… |
| Ausgeliefert wird nur, was gelistet wurde, nur Bilder, höchstens 12 MB; einmal geholt, dann vom Cache; aus → 404; Cache behält die neuesten 80 | `test_photos.py` › test_the_view…, test_the_cache_keeps… |
| Studio, Server: nur Gültiges wird gespeichert (IDs, Namen, Optionen, Farben ohne Anführungszeichen und Klammern, unbekannte Schlüssel und neuere Versionen abgelehnt), Fehler nennen den Ort | `tests/test_studio.py` › test_what_is_wrong…, test_the_wrong_shape…, test_data_without_a_version… |
| Studio, Speicher: leer starten, speichern mit Vorgängerfassung, Änderungen melden, ungültiger Stand bleibt als Rückweg, Wiederherstellen ist selbst umkehrbar | `test_studio.py` › test_the_store…, test_an_invalid_save…, test_restoring…, test_saved_data… |
| Studio-Befehle: lesen und folgen für alle, ändern nur für Admins, Folgen liefert Stand und jede Änderung | `test_studio.py` › test_the_commands…, test_everybody_can_read…, test_a_subscriber… |
| Studio-Seitenleiste nur für Admins, verschwindet mit dem Eintrag | `test_studio.py` › test_the_studio_is_an_admin_only_sidebar_panel… |
| Rückgängig und Wiederholen: Schritte, schnelle Eingaben im selben Feld als ein Schritt, Grenze 100 | `frontend/test/history.test.ts` |
| Studio-Oberfläche: Übersicht, Anlegen, Bearbeiten mit Live-Vorschau, Rückgängig/Wiederholen/Verwerfen, Speichern (auch Strg+S) mit Fehlertext, Löschen mit Rückfrage, Seitenleiste, „Letzte Fassung“, Warnung beim Verlassen, Sprache | `frontend/test/studio.test.ts` |
| Karte mit `dashboard: <id>`: nutzt Gespeichertes, eigene Optionen gewinnen, folgt jedem Speichern, wartet auf den Stand, meldet fehlendes Dashboard, hört beim Entfernen auf | `ui.test.ts` › dashboards saved in the Studio |
| Eigenes Layout, Modell: Geräteklassen nach Kartenbreite (Handy 4, Tablet 8, Wand 12 Spalten); Kacheln zu zweit nebeneinander, Überschriften über die volle Breite; Handy und Wand werden aus dem Tablet abgeleitet, Eigenes gilt vor Abgeleitetem, Neues kommt darunter; Kästen passen ins Raster und haben Mindestgröße | `frontend/test/layout.test.ts` |
| „Aus Bereichen erzeugen“: eine Seite je Etage, Zusammenfassung und Szenen oben, jeder Bereich als Überschrift mit seinen Kacheln, eindeutige gültige IDs, nichts überlappt | `frontend/test/generate.test.ts` |
| Karte mit Seiten: Raster nach Gerät, Plätze der Elemente, Zusammenfassung, Überschrift, Kacheln mit eigenem Namen, fehlendes Gerät lässt eine Lücke, Reiter bei mehreren Seiten, ohne Seiten die automatische Ansicht | `ui.test.ts` › own layout |
| Studio: Layout aus Bereichen erzeugen, in der Vorschau sehen, speichern, ersetzen mit Rückfrage, zurück zu automatisch, Hinweis wenn nichts da ist | `studio.test.ts` › creates a layout from the areas…, says so when there is nothing… |
| Server prüft Seiten: Kachel braucht Entität, Überschrift Text, gültige Entitäts-IDs und Typen, eindeutige IDs, Plätze nur für vorhandene Elemente, vier ganze Zahlen im Bereich, bekannte Geräteklassen, höchstens 30 Seiten | `tests/test_studio.py` › test_pages_with_items…, test_a_broken_page…, test_page_ids… |
| Bearbeiten, rein: Verschieben und Größe ändern bleiben im Raster und überlappen nichts, am Rand wird angehalten, Ausweichen in eine freie Richtung, nichts zu tun gibt dasselbe Objekt zurück; freie Plätze; eigenes Layout je Gerät mit allen Elementen; Hinzufügen, Entfernen aus allen Layouts, Duplizieren, Umbenennen | `frontend/test/edit.test.ts` |
| Gleiche Designs wie Ambiframe: alle 36 Stile und 9 Jahreszeiten da (unter englischer Id und unter Ambiframes Id), Seitenfarbe, Texte, Linien, Flächen, Akzent und Status gleich dem Export bis auf benannte Kontrast-Verschiebungen, Kachel-Radius ≈ 0,8 × Karten-Radius, Paletten gleich; alle erzeugten Designs erfüllen WCAG AA auf Seite, Seitenkunst, Kachel und aktiver Kachel | `frontend/packages/core/test/ambiframe.test.ts`, `designs.test.ts` |
| Schriften: jede Datei liegt im Integrationsordner, jede von einem Design genannte Familie ist deklariert und jede deklarierte wird benutzt, einmalige Deklaration im Dokument, Calm setzt Fraunces/Inter | `frontend/test/fonts.test.ts` |
| Studio, Design-Galerie: jedes Design als Karte (alle Designs plus Jahreszeiten), Auswahlgruppe mit markierter Wahl, Karten in den eigenen Farben und folgen hell/dunkel, Klick wählt, Vorschau folgt | `studio.test.ts` › shows every design as a card… |
| Studio, Assistent: neues Dashboard öffnet auf Schritt 1, vier Schritte mit Zurück/Weiter, Wohin (Fullscreen), Inhalte (Bereiche und Gerätearten ein-/ausblenden über `hide_areas`/`hide_domains`/`hide_unassigned`, Layout), Titel und Sprache; Erweitert-Modus: Optionen als JSON anwenden (ungültig und kein Objekt abgelehnt), YAML-Ansicht, Schalter wird gemerkt | `studio.test.ts` › opens a new dashboard on its first step…, says where it runs…, chooses areas…, sets the title…, offers advanced mode…; `frontend/test/options.test.ts` |
| Studio, Aussehen: Akzentfarbe setzen und zurücksetzen; Hintergrund ohne, Farbe, Verlauf (Farben, Winkel), Bild (Adresse, Abdunkeln, Unschärfe), Fotos (Ordner, freie Fotos, Mischen, Wechselzeit, Bildnachweis); Vorschau folgt sofort; Art des Hintergrunds, Startwerte und Ändern von Feldern rein | `studio.test.ts` › accent…, chooses a background…, sets up photos…; `frontend/test/background.test.ts` |
| Pop-up: Name und Zustand, Dialog-Rolle; Licht (An/Aus, Helligkeit und Farbtemperatur wirken erst beim Loslassen, keine Regler wenn aus oder nicht dimmbar), Schalter, Szene, Klima (Stepper in den Grenzen, Modi), Rollladen (Stopp und Position nur wenn unterstützt), Player (Tasten, Lautstärke); Schließen per ×, Esc, Klick daneben; „Mehr Optionen“ öffnet den HA-Dialog; Sprache | `frontend/test/popup.test.ts` |
| Kachel: Tippen und Gedrückthalten je Kachel (Pop-up, HA-Dialog, nichts); Pop-up-Ereignis, HA-Dialog nur als Rückfall; eine Detailansicht je Druck (auch mit Kontextmenü) | `ui.test.ts` › tile › tap and hold actions |
| Root-Karte: öffnet und schließt das Pop-up einer Kachel, gibt `tap`/`hold` an die Kachel weiter | `ui.test.ts` › opens the pop-up of a tile…, hands the tap and hold actions… |
| Server: `tap` und `hold` nur `popup`, `more-info`, `none` | `test_studio.py` › test_pages_with_items…, test_a_broken_page… |
| Layout-Editor, Eigenschaften: Gerät ändern (Name, Platz, Aktionen bleiben, Abbrechen), Tippen/Halten wählen, nichts davon bei Überschriften; `setItem` mit Gerät und Aktionen | `layout-editor.test.ts`, `edit.test.ts` |
| Layout-Editor: Seiten und Raster je Gerät, Hinweise zum Folgen des Tablets, Auswählen und Eigenschaften, Ziehen mit Zwischenstand und einer Meldung beim Loslassen, Ecke, Mehrfachauswahl, Pfeiltasten, Entf, ⌘D, Esc, Tasten bleiben beim Tippen im Feld, Überschrift und Zusammenfassung, Gerätesuche, Seiten anlegen, umbenennen, löschen | `frontend/test/layout-editor.test.ts` |
| Studio: Layout-Editor öffnen, Änderungen in die Arbeitskopie, Rückgängig und Wiederholen, Vorschau und Speichern | `studio.test.ts` › opens the layout editor… |
| Jeder Text hat eine deutsche, niederländische und französische Fassung, Platzhalter bleiben (auch die des Studios) | `frontend/test/i18n.test.ts` |

## Noch ohne automatischen Test (vor Releases von Hand)

- **Von Hand bestätigt (Benjamin, 7. November 2026):** Beta 0.1 auf seiner Live-HA (HA 2026.11.0) in der HA-App und in Fully, Antwort „läuft gut“. Dabei nicht gemessen: Zeit bis zum ersten Bild auf dem Tab A9+, Verhalten bei rund 1.900 Entitäten im Detail.
- Aussehen aller Designs auf echten Geräten und Bildvergleiche (Demo-Umgebung mit Fake-`hass` fehlt noch).
- Geräte: HA-App (iOS und Android), Fully auf dem Küchen-Tablet, Vollbild-Modus.
- Leistung auf dem Samsung Tab A9+ (Zeit bis zum ersten Bild, Reaktion beim Schalten).
- Verhalten mit rund 1.900 Entitäten.
- Installation über HACS als benutzerdefiniertes Repository.

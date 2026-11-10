# Ambiframe – Designs

Erzeugt aus `frontend/src/styles.ts` am 2026-11-10 (`node frontend/tools/designs.mjs`). Alle Werte vollständig in `ambiframe-designs.json`.

## So ist ein Stil aufgebaut

Jeder Stil hat **gemeinsame Werte** (Schriften, Formen) und je einen Satz **Farben für hell und dunkel**. In Ambiframe sind das CSS-Variablen `--af-<name>`.

| Wert | Bedeutung |
|---|---|
| `bg` | Hintergrundfarbe der Anzeige |
| `bg-art` | Hintergrundbild aus CSS (Verläufe, Muster, Motive); none = keins |
| `bg-size` | background-size für bg-art (z. B. Punktraster) |
| `ink` | Haupttext |
| `ink-2` | Zweittext (Untertitel, Beschriftungen) |
| `ink-3` | Leiser Text (Meta, Einheiten) |
| `line` | Trennlinien |
| `surface` | Flächen ohne Karte (z. B. Balken-Hintergrund) |
| `accent` | Akzentfarbe (Doppelpunkt der Uhr, Symbole, Hervorhebung) |
| `accent-soft` | Akzent als zarte Fläche |
| `cold` | Kalt / Info (Regen, Kälte) |
| `alert` | Warnung / Fehler |
| `good` | Gut / Erfolg |
| `panel` | Hinweis-Karten (Momente, Menüs) |
| `chip` | Kleine Schilder über Fotos |
| `shadow` | Schatten großer Flächen |
| `veil` | Abdunklung über Fotos |
| `mist` | Leichter Schleier |
| `colon` | Farbe des Doppelpunkts der Uhr |
| `colon-opacity` | Deckkraft des Doppelpunkts |
| `card` | Kartenfläche |
| `card-tint` | Tönung über der Kartenfläche |
| `card-border` | Kartenrahmen (CSS border) |
| `card-shadow` | Kartenschatten (CSS box-shadow) |
| `card-filter` | backdrop-filter der Karte (Glas) |
| `card-radius` | Eckenradius der Karten |
| `card-pad` | Innenabstand der Karten |
| `card-rule` | Linie über Blöcken statt Karte (Editorial-Stile) |
| `display` | Schrift für Uhr, Titel und Zahlen |
| `sans` | Schrift für Text |
| `num-font` | Eigene Schrift nur für Zahlen (LED-Stile) |
| `clock-weight` | Strichstärke der Uhr |
| `clock-track` | Laufweite der Uhr |
| `label-case` | Überschriften: uppercase oder none |
| `label-track` | Laufweite der Überschriften |
| `label-weight` | Strichstärke der Überschriften |
| `label-color` | Farbe der Überschriften |
| `label-font` | Eigene Schrift für Überschriften |
| `photo-motion` | Bewegung der Fotos (none = ruhig) |
| `photo-filter` | CSS-Filter auf Fotos (z. B. Graustufen) |
| `photo-frame` | Passepartout um Fotos (Galerie) |
| `photo-inset` | Abstand des Fotos zum Rand |
| `still` | 1 = keine Animationen und Übergänge (E-Ink) |
| `wide` | Faktor für breite Schriften (LED-Punkte) |

## Schriften

Alle über Fontsource, Lizenz SIL Open Font License 1.1.

| ID | Name | Art | Strichstärken | Paket |
|---|---|---|---|---|
| fraunces | Fraunces | serif | 100 900 | `@fontsource-variable/fraunces` |
| newsreader | Newsreader | serif | 200 800 | `@fontsource-variable/newsreader` |
| instrument | Instrument Serif | serif | 400 | `@fontsource/instrument-serif` |
| playfair | Playfair Display | serif | 400 900 | `@fontsource-variable/playfair-display` |
| cormorant | Cormorant Garamond | serif | 300 700 | `@fontsource-variable/cormorant-garamond` |
| inter | Inter | sans | 100 900 | `@fontsource-variable/inter` |
| geist | Geist | sans | 100 900 | `@fontsource-variable/geist` |
| manrope | Manrope | sans | 200 800 | `@fontsource-variable/manrope` |
| outfit | Outfit | sans | 100 900 | `@fontsource-variable/outfit` |
| jakarta | Plus Jakarta Sans | sans | 200 800 | `@fontsource-variable/plus-jakarta-sans` |
| space-grotesk | Space Grotesk | sans | 300 700 | `@fontsource-variable/space-grotesk` |
| nunito | Nunito (rund) | sans | 200 1000 | `@fontsource-variable/nunito` |
| doto | Doto (LED-Punkte) | sans | 100 900 | `@fontsource-variable/doto` |

## Stile (36)

| Stil | Titel/Zahlen | Text | Dunkel: Grund · Text · Akzent | Hell: Grund · Text · Akzent | Animation | Kacheln |
|---|---|---|---|---|---|---|
| **Ruhig** (`ruhig`) | Fraunces 300 | Inter | `#0a0d0b` · `#ede7db` · `#d6a865` | `#f2ede3` · `#1e1b16` · `#9a7334` | none | – |
| **Klar** (`klar`) | Inter 200 | Inter | `#0a0d0b` · `#ede7db` · `#a8cab5` | `#f3f4f1` · `#141714` · `#4f7d63` | none | – |
| **Gold** (`gold`) | Fraunces 300 | Inter | `#09090a` · `#ffffff` · `#d9b45f` | `#f6f3ec` · `#16130f` · `#a8803a` | none | – |
| **Glas** (`glass`) | Inter 300 | Inter | `#0b1020` · `#ffffff` · `#9fd4ff` | `#e9edf7` · `#0f1320` · `#2f6fe0` | flow | – |
| **Aurora** (`aurora`) | Outfit 200 | Inter | `#060a14` · `#eef3f7` · `#7fe0c4` | `#f7f3ef` · `#1b1820` · `#7457d6` | flow | – |
| **Editorial** (`editorial`) | Instrument Serif 400 | Inter | `#141311` · `#ece5d8` · `#e08d63` | `#f3eee4` · `#1c1915` · `#a8432a` | none | – |
| **Minimal** (`minimal`) | Geist 400 | Geist | `#000000` · `#ffffff` · `#ff5a36` | `#f6f6f4` · `#0b0b0b` · `#e8401c` | none | – |
| **Pixel** (`pixel`) | Doto (LED-Punkte) 800 | Geist | `#000000` · `#f4f4f4` · `#ffc21a` | `#e9e9e6` · `#111111` · `#d9480f` | none | – |
| **Arcade** (`arcade`) | Doto (LED-Punkte) 900 | Space Grotesk | `#0a0518` · `#f6f0ff` · `#ff3df2` | `#f7f2ff` · `#1a0b2e` · `#c3009f` | stars | – |
| **Cockpit** (`cockpit`) | Geist 250 | Geist | `#0b0c0d` · `#f2f3f5` · `#4d7cfe` | `#f4f5f7` · `#171a20` · `#3e6ae1` | none | ja |
| **Tonal** (`tonal`) | Outfit 500 | Plus Jakarta Sans | `#141218` · `#e6e0e9` · `#d0bcff` | `#fef7ff` · `#1d1b20` · `#6750a4` | none | ja |
| **Kacheln** (`kacheln`) | Inter 600 | Inter | `#0d1022` · `#ffffff` · `#0a84ff` | `#dfe6f5` · `#000000` · `#007aff` | none | ja |
| **Klartext** (`klartext`) | Inter 650 | Inter | `#000000` · `#ffffff` · `#ffd60a` | `#ffffff` · `#000000` · `#0040dd` | none | – |
| **Fallblatt** (`fallblatt`) | Inter 700 | Inter | `#101112` · `#f4f1e8` · `#f5c400` | `#e8e6e0` · `#18191b` · `#b88a00` | none | ja |
| **Millennium** (`millennium`) | Tahoma 700 | Tahoma | `#0d1b33` · `#f2f2f2` · `#4fc04a` | `#5f9de8` · `#111111` · `#2f9e31` | none | ja |
| **Glanz** (`glanz`) | Nunito (rund) 300 | Nunito (rund) | `#021827` · `#f2fbff` · `#5fd0ff` | `#a9e2fb` · `#0b2a44` · `#0088cc` | bubbles | ja |
| **Handheld** (`handheld`) | Doto (LED-Punkte) 900 | Space Grotesk | `#0f380f` · `#9bbc0f` · `#9bbc0f` | `#9bbc0f` · `#0f380f` · `#0f380f` | none | ja |
| **Bauhaus** (`bauhaus`) | Outfit 800 | Space Grotesk | `#161616` · `#f2ead8` · `#e04a35` | `#efe7d6` · `#111111` · `#d33f2b` | none | ja |
| **Soft-UI** (`softui`) | Nunito (rund) 300 | Nunito (rund) | `#2b2e35` · `#e3e6ec` · `#8f9bff` | `#e6e9ef` · `#3b4252` · `#5b6cff` | none | ja |
| **Boho** (`boho`) | Playfair Display 500 | Plus Jakarta Sans | `#2a201b` · `#f3e6d6` · `#e09a74` | `#f3e7d7` · `#3d2b22` · `#b8603c` | none | ja |
| **Landhaus** (`landhaus`) | Newsreader 400 | Manrope | `#1d211b` · `#ece6d6` · `#a8bd8c` | `#f4efe4` · `#3a3426` · `#6f8a5b` | none | ja |
| **Natur** (`natur`) | Fraunces 350 | Plus Jakarta Sans | `#0d1a12` · `#e6efe0` · `#9cc77a` | `#eef2e6` · `#23301f` · `#4f7d36` | none | ja |
| **Galerie** (`galerie`) | Instrument Serif 400 | Geist | `#1b1b1a` · `#f1eee8` · `#c8b89a` | `#f3f2ef` · `#1c1c1b` · `#7d6a4f` | none | – |
| **Papier** (`papier`) | Newsreader 400 | Inter | `#000000` · `#ffffff` · `#ffffff` | `#ffffff` · `#000000` · `#000000` | none | ja |
| **E-Ink** (`eink`) | Inter 600 | Inter | `#000000` · `#ffffff` · `#ffffff` | `#ffffff` · `#000000` · `#000000` | none | ja |
| **Zeitung** (`zeitung`) | Playfair Display 800 | Newsreader | `#171614` · `#ece6d8` · `#d4553f` | `#f3efe6` · `#141414` · `#8b1e1e` | none | – |
| **Art déco** (`artdeco`) | Cormorant Garamond 300 | Outfit | `#0d0c0a` · `#efe6d2` · `#c9a45c` | `#f1eadb` · `#1a1712` · `#9c7a34` | none | ja |
| **Terminal** (`terminal`) | ui-monospace 500 | ui-monospace | `#030805` · `#7dff9b` · `#c6ff7d` | `#eeeee4` · `#173a22` · `#2f7d3c` | none | ja |
| **Verspielt** (`verspielt`) | Nunito (rund) 800 | Nunito (rund) | `#1d1a33` · `#f6f1ff` · `#ffb347` | `#fff7ef` · `#3a2f4a` · `#ff6f61` | none | ja |
| **Leitsystem** (`leitsystem`) | Inter 700 | Inter | `#1b1e21` · `#ffffff` · `#ffc400` | `#ececea` · `#141414` · `#b88600` | none | ja |
| **Swiss Grid** (`swiss`) | Inter 800 | Inter | `#0f0f0f` · `#f4f3ef` · `#ff3321` | `#f4f3ef` · `#111111` · `#e30613` | none | – |
| **Rams** (`rams`) | Manrope 300 | Manrope | `#1e1e1c` · `#eae8e2` · `#ff6a13` | `#d9d7d0` · `#2b2a27` · `#e85a0c` | none | ja |
| **Lobby** (`lobby`) | Instrument Serif 400 | Plus Jakarta Sans | `#12100e` · `#efe6d6` · `#c3a46b` | `#f5f0e8` · `#2a2420` · `#8c6d3a` | none | – |
| **Bilderbuch** (`bilderbuch`) | Fraunces 800 | Nunito (rund) | `#1c2552` · `#fff6e0` · `#ffc94a` | `#bfe4f2` · `#2b2340` · `#e8553a` | none | ja |
| **Weihnachten** (`weihnachten`) | Fraunces 400 | Plus Jakarta Sans | `#0d1f17` · `rgb(245, 239, 228)` · `#e0b45a` | `#f7f2e8` · `rgb(30, 58, 44)` · `#b0302a` | snow | ja |
| **Jahreszeiten** (`saisonal`) | Fraunces 300 | Inter | `#0a0d0b` · `#ede7db` · `#d6a865` | `#f2ede3` · `#1e1b16` · `#9a7334` | none | – |

### Ruhig (`ruhig`)

Serifen-Uhr, warmes Weiß, Bambus

Schriften: Fraunces (Titel/Zahlen) · Inter (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0a0d0b` | `#f2ede3` |
| `bg-art` | `none` | `none` |
| `ink` | `#ede7db` | `#1e1b16` |
| `ink-2` | `rgba(237, 231, 219, 0.66)` | `rgba(30, 27, 22, 0.64)` |
| `ink-3` | `rgba(237, 231, 219, 0.4)` | `rgba(30, 27, 22, 0.42)` |
| `line` | `rgba(237, 231, 219, 0.1)` | `rgba(30, 27, 22, 0.11)` |
| `surface` | `rgba(237, 231, 219, 0.045)` | `rgba(255, 255, 255, 0.55)` |
| `accent` | `#d6a865` | `#9a7334` |
| `accent-soft` | `rgba(214, 168, 101, 0.14)` | `rgba(154, 115, 52, 0.13)` |
| `cold` | `#9dbad6` | `#3d6a8f` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |

Gemeinsam: `clock-weight`: 300 · `clock-track`: -0.02em

### Klar (`klar`)

StandBy-Stil, schlicht, Salbei

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0a0d0b` | `#f3f4f1` |
| `bg-art` | `none` | `none` |
| `ink` | `#ede7db` | `#141714` |
| `ink-2` | `rgba(237, 231, 219, 0.66)` | `rgba(20, 23, 20, 0.64)` |
| `ink-3` | `rgba(237, 231, 219, 0.4)` | `rgba(20, 23, 20, 0.42)` |
| `line` | `rgba(237, 231, 219, 0.1)` | `rgba(20, 23, 20, 0.1)` |
| `surface` | `rgba(237, 231, 219, 0.045)` | `rgba(255, 255, 255, 0.7)` |
| `accent` | `#a8cab5` | `#4f7d63` |
| `accent-soft` | `rgba(168, 202, 181, 0.14)` | `rgba(79, 125, 99, 0.13)` |
| `cold` | `#9dbad6` | `#3d6a8f` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 251, 249, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 251, 249, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(20, 30, 20, 0.14)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(243, 244, 241, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |

Gemeinsam: `clock-weight`: 200 · `clock-track`: -0.05em

### Gold (`gold`)

Weiß und Gold – dunkel auf Schwarz, hell auf Elfenbein

Schriften: Fraunces (Titel/Zahlen) · Inter (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#09090a` | `#f6f3ec` |
| `bg-art` | `none` | `none` |
| `ink` | `#ffffff` | `#16130f` |
| `ink-2` | `rgba(255, 255, 255, 0.68)` | `rgba(22, 19, 15, 0.64)` |
| `ink-3` | `rgba(255, 255, 255, 0.42)` | `rgba(22, 19, 15, 0.42)` |
| `line` | `rgba(255, 255, 255, 0.1)` | `rgba(22, 19, 15, 0.11)` |
| `surface` | `rgba(255, 255, 255, 0.045)` | `rgba(255, 255, 255, 0.7)` |
| `accent` | `#d9b45f` | `#a8803a` |
| `accent-soft` | `rgba(217, 180, 95, 0.15)` | `rgba(168, 128, 58, 0.13)` |
| `cold` | `#a9c4dc` | `#3f6f9c` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(255, 255, 255, 0.94)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(255, 255, 255, 0.78)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.18)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(246, 243, 236, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |

Gemeinsam: `clock-weight`: 300 · `clock-track`: -0.02em

### Glas (`glass`)

Glasflächen mit Lichtkante über weichen Farben

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: flow

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0b1020` | `#e9edf7` |
| `bg-art` | `radial-gradient(60% 70% at 12% 18%, rgba(90, 120, 255, 0.5), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(255, 120, 175, 0.38), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(60, 210, 195, 0.36), transparent 64%)` | `radial-gradient(60% 70% at 12% 18%, rgba(150, 140, 255, 0.5), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(255, 175, 150, 0.5), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(120, 215, 205, 0.45), transparent 64%)` |
| `ink` | `#ffffff` | `#0f1320` |
| `ink-2` | `rgba(255, 255, 255, 0.74)` | `rgba(15, 19, 32, 0.66)` |
| `ink-3` | `rgba(255, 255, 255, 0.5)` | `rgba(15, 19, 32, 0.44)` |
| `line` | `rgba(255, 255, 255, 0.16)` | `rgba(15, 19, 32, 0.09)` |
| `surface` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 0.5)` |
| `accent` | `#9fd4ff` | `#2f6fe0` |
| `accent-soft` | `rgba(159, 212, 255, 0.16)` | `rgba(47, 111, 224, 0.12)` |
| `cold` | `#a8c8ff` | `#2f6fe0` |
| `alert` | `#ff9f7a` | `#d0552f` |
| `good` | `#8fe3b0` | `#2f8a5b` |
| `panel` | `rgba(28, 32, 58, 0.7)` | `rgba(255, 255, 255, 0.75)` |
| `chip` | `rgba(255, 255, 255, 0.14)` | `rgba(255, 255, 255, 0.62)` |
| `shadow` | `0 30px 80px rgba(0, 0, 30, 0.5)` | `0 30px 80px rgba(40, 50, 100, 0.18)` |
| `veil` | `rgba(10, 14, 30, 0.4)` | `rgba(233, 237, 247, 0.45)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.09)` | `rgba(255, 255, 255, 0.55)` |
| `flow-1` | `rgba(90, 120, 255, 0.55)` | `rgba(150, 140, 255, 0.55)` |
| `flow-2` | `rgba(255, 120, 175, 0.42)` | `rgba(255, 175, 150, 0.55)` |
| `flow-3` | `rgba(60, 210, 195, 0.4)` | `rgba(120, 215, 205, 0.5)` |
| `card` | `linear-gradient(140deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05) 55%, rgba(255, 255, 255, 0.1))` | `linear-gradient(140deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.4) 55%, rgba(255, 255, 255, 0.58))` |
| `card-border` | `1px solid rgba(255, 255, 255, 0.24)` | `1px solid rgba(255, 255, 255, 0.85)` |
| `card-filter` | `blur(24px) saturate(1.8)` | `blur(24px) saturate(1.6)` |
| `card-shadow` | `inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.08), 0 20px 50px rgba(0, 0, 30, 0.3)` | `inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 18px 44px rgba(40, 50, 100, 0.14)` |

Gemeinsam: `clock-weight`: 300 · `clock-track`: -0.04em · `card-radius`: 34px

### Aurora (`aurora`)

Ruhig fließende Farben wie Nordlicht

Schriften: Outfit (Titel/Zahlen) · Inter (Text) · Animation: flow

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#060a14` | `#f7f3ef` |
| `bg-art` | `radial-gradient(60% 70% at 12% 18%, rgba(60, 220, 170, 0.36), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(130, 90, 255, 0.36), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(40, 120, 255, 0.3), transparent 64%)` | `radial-gradient(60% 70% at 12% 18%, rgba(255, 185, 140, 0.5), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(200, 165, 255, 0.45), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(140, 225, 205, 0.42), transparent 64%)` |
| `ink` | `#eef3f7` | `#1b1820` |
| `ink-2` | `rgba(238, 243, 247, 0.7)` | `rgba(27, 24, 32, 0.64)` |
| `ink-3` | `rgba(238, 243, 247, 0.45)` | `rgba(27, 24, 32, 0.42)` |
| `line` | `rgba(238, 243, 247, 0.12)` | `rgba(27, 24, 32, 0.09)` |
| `surface` | `rgba(238, 243, 247, 0.06)` | `rgba(255, 255, 255, 0.45)` |
| `accent` | `#7fe0c4` | `#7457d6` |
| `accent-soft` | `rgba(127, 224, 196, 0.14)` | `rgba(116, 87, 214, 0.12)` |
| `cold` | `#8fb8ff` | `#4a7fd6` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(12, 18, 32, 0.85)` | `rgba(255, 252, 249, 0.85)` |
| `chip` | `rgba(12, 18, 32, 0.6)` | `rgba(255, 252, 249, 0.65)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 10, 20, 0.5)` | `rgba(247, 243, 239, 0.5)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(255, 255, 255, 0.5)` |
| `flow-1` | `rgba(60, 220, 170, 0.42)` | `rgba(255, 185, 140, 0.55)` |
| `flow-2` | `rgba(130, 90, 255, 0.4)` | `rgba(200, 165, 255, 0.5)` |
| `flow-3` | `rgba(40, 120, 255, 0.34)` | `rgba(140, 225, 205, 0.45)` |
| `card` | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.45)` |
| `card-border` | `1px solid rgba(255, 255, 255, 0.1)` | `1px solid rgba(255, 255, 255, 0.75)` |
| `card-filter` | `blur(18px) saturate(1.4)` | `blur(18px) saturate(1.3)` |

Gemeinsam: `clock-weight`: 200 · `clock-track`: -0.03em

### Editorial (`editorial`)

Wie ein Magazin: große Serifen, Papier, feine Linien

Schriften: Instrument Serif (Titel/Zahlen) · Inter (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#141311` | `#f3eee4` |
| `bg-art` | `none` | `none` |
| `ink` | `#ece5d8` | `#1c1915` |
| `ink-2` | `rgba(236, 229, 216, 0.68)` | `rgba(28, 25, 21, 0.7)` |
| `ink-3` | `rgba(236, 229, 216, 0.44)` | `rgba(28, 25, 21, 0.48)` |
| `line` | `rgba(236, 229, 216, 0.16)` | `rgba(28, 25, 21, 0.16)` |
| `surface` | `rgba(236, 229, 216, 0.05)` | `rgba(28, 25, 21, 0.05)` |
| `accent` | `#e08d63` | `#a8432a` |
| `accent-soft` | `rgba(224, 141, 99, 0.14)` | `rgba(168, 67, 42, 0.1)` |
| `cold` | `#9dbad6` | `#2f5d8a` |
| `alert` | `#ef8b63` | `#b8401f` |
| `good` | `#9cc5a1` | `#3f7a4b` |
| `panel` | `rgba(24, 23, 20, 0.95)` | `rgba(246, 242, 234, 0.97)` |
| `chip` | `rgba(20, 19, 17, 0.7)` | `rgba(246, 242, 234, 0.85)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(40, 30, 20, 0.14)` |
| `veil` | `rgba(10, 9, 8, 0.55)` | `rgba(243, 238, 228, 0.6)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |

Gemeinsam: `clock-weight`: 400 · `clock-track`: -0.01em · `card`: transparent · `card-tint`: transparent · `card-border`: 0 solid transparent · `card-radius`: 0 · `card-pad`: 26px 0 0 · `card-rule`: 1.5px solid currentColor

### Minimal (`minimal`)

Schweizer Stil: klare Schrift, hoher Kontrast, nur Typografie

Schriften: Geist (Titel/Zahlen) · Geist (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#000000` | `#f6f6f4` |
| `bg-art` | `none` | `none` |
| `ink` | `#ffffff` | `#0b0b0b` |
| `ink-2` | `rgba(255, 255, 255, 0.6)` | `rgba(11, 11, 11, 0.6)` |
| `ink-3` | `rgba(255, 255, 255, 0.38)` | `rgba(11, 11, 11, 0.4)` |
| `line` | `rgba(255, 255, 255, 0.14)` | `rgba(11, 11, 11, 0.12)` |
| `surface` | `rgba(255, 255, 255, 0.06)` | `rgba(11, 11, 11, 0.05)` |
| `accent` | `#ff5a36` | `#e8401c` |
| `accent-soft` | `rgba(255, 90, 54, 0.14)` | `rgba(232, 64, 28, 0.1)` |
| `cold` | `#7fb2ff` | `#2f6fe0` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(16, 16, 16, 0.96)` | `rgba(250, 250, 248, 0.97)` |
| `chip` | `rgba(0, 0, 0, 0.7)` | `rgba(250, 250, 248, 0.85)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(0, 0, 0, 0.12)` |
| `veil` | `rgba(0, 0, 0, 0.55)` | `rgba(246, 246, 244, 0.6)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |

Gemeinsam: `clock-weight`: 400 · `clock-track`: -0.055em · `card`: transparent · `card-tint`: transparent · `card-border`: 0 solid transparent · `card-radius`: 0 · `card-pad`: 26px 0 0 · `card-rule`: 1px solid color-mix(in srgb, currentColor 22%, transparent)

### Pixel (`pixel`)

LED-Punktmatrix wie eine Pixel-Uhr – kräftige Farben auf Schwarz

Schriften: Doto (LED-Punkte) (Titel/Zahlen) · Geist (Text) · var(--af-sans) (Zahlen) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#000000` | `#e9e9e6` |
| `bg-art` | `radial-gradient(rgba(255, 255, 255, 0.055) 1.2px, transparent 1.6px)` | `radial-gradient(rgba(0, 0, 0, 0.06) 1.2px, transparent 1.6px)` |
| `ink` | `#f4f4f4` | `#111111` |
| `ink-2` | `rgba(244, 244, 244, 0.68)` | `rgba(17, 17, 17, 0.66)` |
| `ink-3` | `rgba(244, 244, 244, 0.42)` | `rgba(17, 17, 17, 0.44)` |
| `line` | `rgba(255, 255, 255, 0.1)` | `rgba(17, 17, 17, 0.1)` |
| `surface` | `rgba(255, 255, 255, 0.05)` | `rgba(255, 255, 255, 0.6)` |
| `accent` | `#ffc21a` | `#d9480f` |
| `accent-soft` | `rgba(255, 194, 26, 0.16)` | `rgba(217, 72, 15, 0.12)` |
| `cold` | `#3fb6ff` | `#1971c2` |
| `alert` | `#ff5146` | `#e03131` |
| `good` | `#3ddc84` | `#2b8a3e` |
| `panel` | `rgba(12, 12, 12, 0.96)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(0, 0, 0, 0.75)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(0, 0, 0, 0.55)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `bg-size` | `9px 9px` | `9px 9px` |
| `card` | `#0b0b0b` | `#ffffff` |
| `card-border` | `1px solid #1f1f1f` | `1px solid rgba(0, 0, 0, 0.08)` |
| `label-color` | `var(--af-accent)` | `var(--af-accent)` |
| `glow` | `0 0 18px rgba(255, 255, 255, 0.22)` | – |

Gemeinsam: `wide`: 0.7 · `clock-weight`: 800 · `clock-track`: 0.02em · `card-radius`: 18px · `label-weight`: 800 · `label-track`: 0.12em

### Arcade (`arcade`)

Neon wie in der Spielhalle: Magenta, Türkis, Leuchtschrift, Raster am Horizont

Schriften: Doto (LED-Punkte) (Titel/Zahlen) · Space Grotesk (Text) · var(--af-sans) (Zahlen) · Animation: stars

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0a0518` | `#f7f2ff` |
| `bg-art` | `radial-gradient(80% 45% at 50% 100%, rgba(255, 61, 242, 0.28), transparent 70%), repeating-linear-gradient(90deg, rgba(0, 229, 255, 0.07) 0 1px, transparent 1px 64px), linear-gradient(180deg, transparent 58%, rgba(255, 61, 242, 0.1))` | `radial-gradient(80% 45% at 50% 100%, rgba(195, 0, 159, 0.14), transparent 70%), repeating-linear-gradient(90deg, rgba(0, 136, 168, 0.07) 0 1px, transparent 1px 64px)` |
| `ink` | `#f6f0ff` | `#1a0b2e` |
| `ink-2` | `rgba(246, 240, 255, 0.72)` | `rgba(26, 11, 46, 0.68)` |
| `ink-3` | `rgba(246, 240, 255, 0.48)` | `rgba(26, 11, 46, 0.46)` |
| `line` | `rgba(255, 61, 242, 0.25)` | `rgba(195, 0, 159, 0.2)` |
| `surface` | `rgba(255, 61, 242, 0.06)` | `rgba(255, 255, 255, 0.6)` |
| `accent` | `#ff3df2` | `#c3009f` |
| `accent-soft` | `rgba(255, 61, 242, 0.18)` | `rgba(195, 0, 159, 0.12)` |
| `cold` | `#00e5ff` | `#0088a8` |
| `alert` | `#ff5c5c` | `#d6336c` |
| `good` | `#39ff88` | `#1f9d55` |
| `panel` | `rgba(16, 6, 34, 0.94)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(16, 6, 34, 0.72)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(10, 5, 24, 0.55)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-cold)` | `var(--af-cold)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 61, 242, 0.08)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `rgba(20, 8, 42, 0.72)` | `rgba(255, 255, 255, 0.8)` |
| `card-border` | `1px solid rgba(255, 61, 242, 0.5)` | `1px solid rgba(195, 0, 159, 0.35)` |
| `card-shadow` | `0 0 26px rgba(255, 61, 242, 0.22), inset 0 0 22px rgba(0, 229, 255, 0.07)` | `0 0 22px rgba(195, 0, 159, 0.12)` |
| `label-color` | `var(--af-cold)` | `var(--af-cold)` |
| `glow` | `0 0 6px var(--af-accent), 0 0 24px rgba(255, 61, 242, 0.55)` | `0 0 14px rgba(195, 0, 159, 0.3)` |

Gemeinsam: `wide`: 0.7 · `clock-weight`: 900 · `clock-track`: 0.04em · `card-radius`: 6px · `label-weight`: 900 · `label-track`: 0.18em

### Cockpit (`cockpit`)

Wie ein modernes Auto-Display: tiefes Grau, klare Karten, ein Blau

Schriften: Geist (Titel/Zahlen) · Geist (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0b0c0d` | `#f4f5f7` |
| `bg-art` | `none` | `none` |
| `ink` | `#f2f3f5` | `#171a20` |
| `ink-2` | `rgba(242, 243, 245, 0.62)` | `rgba(23, 26, 32, 0.62)` |
| `ink-3` | `rgba(242, 243, 245, 0.4)` | `rgba(23, 26, 32, 0.42)` |
| `line` | `rgba(242, 243, 245, 0.08)` | `rgba(23, 26, 32, 0.08)` |
| `surface` | `rgba(242, 243, 245, 0.05)` | `rgba(23, 26, 32, 0.04)` |
| `accent` | `#4d7cfe` | `#3e6ae1` |
| `accent-soft` | `rgba(77, 124, 254, 0.16)` | `rgba(62, 106, 225, 0.12)` |
| `cold` | `#4d7cfe` | `#3e6ae1` |
| `alert` | `#e5484d` | `#d93036` |
| `good` | `#3ecf8e` | `#1f9d6b` |
| `panel` | `rgba(23, 25, 28, 0.97)` | `rgba(255, 255, 255, 0.97)` |
| `chip` | `rgba(23, 25, 28, 0.85)` | `rgba(255, 255, 255, 0.85)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(11, 12, 13, 0.55)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#17191c` | `#ffffff` |
| `card-border` | `0 solid transparent` | `0 solid transparent` |
| `card-shadow` | `0 1px 0 rgba(255, 255, 255, 0.04) inset` | `0 1px 2px rgba(23, 26, 32, 0.06), 0 8px 24px rgba(23, 26, 32, 0.05)` |

Gemeinsam: `clock-weight`: 250 · `clock-track`: -0.04em · `card-radius`: 22px · `card-pad`: 34px · `label-case`: none · `label-track`: 0 · `label-weight`: 500

### Tonal (`tonal`)

Runde, farbige Flächen in Pastelltönen, große freundliche Schrift

Schriften: Outfit (Titel/Zahlen) · Plus Jakarta Sans (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#141218` | `#fef7ff` |
| `bg-art` | `none` | `none` |
| `ink` | `#e6e0e9` | `#1d1b20` |
| `ink-2` | `rgba(230, 224, 233, 0.72)` | `rgba(29, 27, 32, 0.7)` |
| `ink-3` | `rgba(230, 224, 233, 0.5)` | `rgba(29, 27, 32, 0.48)` |
| `line` | `rgba(230, 224, 233, 0.1)` | `rgba(29, 27, 32, 0.08)` |
| `surface` | `rgba(208, 188, 255, 0.08)` | `rgba(103, 80, 164, 0.06)` |
| `accent` | `#d0bcff` | `#6750a4` |
| `accent-soft` | `rgba(208, 188, 255, 0.18)` | `rgba(103, 80, 164, 0.12)` |
| `cold` | `#a8c7fa` | `#2b62c4` |
| `alert` | `#ffb4ab` | `#ba1a1a` |
| `good` | `#80d99a` | `#2e7d4f` |
| `panel` | `rgba(43, 41, 48, 0.97)` | `rgba(243, 237, 247, 0.97)` |
| `chip` | `rgba(43, 41, 48, 0.85)` | `rgba(243, 237, 247, 0.85)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(20, 18, 24, 0.55)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#2b2930` | `#f3edf7` |
| `card-border` | `0 solid transparent` | `0 solid transparent` |

Gemeinsam: `clock-weight`: 500 · `clock-track`: -0.02em · `card-radius`: 36px · `label-case`: none · `label-track`: 0 · `label-weight`: 700 · `label-color`: var(--af-accent)

### Kacheln (`kacheln`)

Abgerundete Widget-Kacheln über einem weichen Hintergrundbild, farbige Überschriften

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0d1022` | `#dfe6f5` |
| `bg-art` | `radial-gradient(60% 70% at 12% 18%, rgba(80, 90, 255, 0.55), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(255, 80, 150, 0.4), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(255, 170, 60, 0.35), transparent 64%)` | `radial-gradient(60% 70% at 12% 18%, rgba(120, 140, 255, 0.55), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(255, 150, 190, 0.5), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(255, 200, 120, 0.5), transparent 64%)` |
| `ink` | `#ffffff` | `#000000` |
| `ink-2` | `rgba(235, 235, 245, 0.68)` | `rgba(60, 60, 67, 0.75)` |
| `ink-3` | `rgba(235, 235, 245, 0.45)` | `rgba(60, 60, 67, 0.5)` |
| `line` | `rgba(255, 255, 255, 0.12)` | `rgba(60, 60, 67, 0.12)` |
| `surface` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 0.5)` |
| `accent` | `#0a84ff` | `#007aff` |
| `accent-soft` | `rgba(10, 132, 255, 0.18)` | `rgba(0, 122, 255, 0.12)` |
| `cold` | `#64d2ff` | `#32ade6` |
| `alert` | `#ff453a` | `#ff3b30` |
| `good` | `#30d158` | `#34c759` |
| `panel` | `rgba(28, 28, 32, 0.9)` | `rgba(255, 255, 255, 0.92)` |
| `chip` | `rgba(28, 28, 32, 0.66)` | `rgba(255, 255, 255, 0.72)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(10, 12, 26, 0.45)` | `rgba(223, 230, 245, 0.45)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `rgba(28, 28, 32, 0.66)` | `rgba(255, 255, 255, 0.72)` |
| `card-border` | `0 solid transparent` | `0 solid transparent` |
| `card-filter` | `blur(30px) saturate(1.8)` | `blur(30px) saturate(1.8)` |
| `card-shadow` | `0 10px 30px rgba(0, 0, 0, 0.25)` | `0 10px 30px rgba(40, 50, 100, 0.12)` |

Gemeinsam: `clock-weight`: 600 · `clock-track`: -0.04em · `card-radius`: 30px · `card-pad`: 30px · `label-case`: none · `label-track`: 0 · `label-weight`: 650 · `label-color`: var(--af-accent)

### Klartext (`klartext`)

Große, kräftige Schrift mit starkem Kontrast – gut lesbar aus der Ferne

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#000000` | `#ffffff` |
| `bg-art` | `none` | `none` |
| `ink` | `#ffffff` | `#000000` |
| `ink-2` | `rgba(255, 255, 255, 0.9)` | `rgba(0, 0, 0, 0.88)` |
| `ink-3` | `rgba(255, 255, 255, 0.74)` | `rgba(0, 0, 0, 0.72)` |
| `line` | `rgba(255, 255, 255, 0.35)` | `rgba(0, 0, 0, 0.35)` |
| `surface` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.05)` |
| `accent` | `#ffd60a` | `#0040dd` |
| `accent-soft` | `rgba(255, 214, 10, 0.2)` | `rgba(0, 64, 221, 0.12)` |
| `cold` | `#64d2ff` | `#0071a4` |
| `alert` | `#ff453a` | `#c1001a` |
| `good` | `#32d74b` | `#007d2a` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#111111` | `#f2f2f2` |
| `card-border` | `2px solid rgba(255, 255, 255, 0.35)` | `2px solid rgba(0, 0, 0, 0.3)` |

Gemeinsam: `clock-weight`: 650 · `clock-track`: -0.03em · `card-radius`: 20px · `label-case`: none · `label-track`: 0 · `label-weight`: 700 · `label-color`: var(--af-ink-2) · `fs`: 1.2 · `c2`: 0.92 · `c3`: 0.78

### Fallblatt (`fallblatt`)

Wie eine alte Bahnhofstafel: Uhr und Abfahrten auf klappernden Blättern

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: none · Kachel-Stil · Fallblatt

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#101112` | `#e8e6e0` |
| `bg-art` | `none` | `none` |
| `ink` | `#f4f1e8` | `#18191b` |
| `ink-2` | `rgba(244, 241, 232, 0.7)` | `rgba(24, 25, 27, 0.7)` |
| `ink-3` | `rgba(244, 241, 232, 0.46)` | `rgba(24, 25, 27, 0.46)` |
| `line` | `rgba(244, 241, 232, 0.1)` | `rgba(24, 25, 27, 0.1)` |
| `surface` | `rgba(244, 241, 232, 0.05)` | `rgba(255, 255, 255, 0.6)` |
| `accent` | `#f5c400` | `#b88a00` |
| `accent-soft` | `rgba(245, 196, 0, 0.16)` | `rgba(184, 138, 0, 0.14)` |
| `cold` | `#7fb3e6` | `#2f6fa8` |
| `alert` | `#ff6a4d` | `#c8442c` |
| `good` | `#7ccf8a` | `#2f8a4b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#18191b` | `#f7f6f2` |
| `card-border` | `1px solid rgba(255, 255, 255, 0.06)` | `1px solid rgba(0, 0, 0, 0.08)` |

Gemeinsam: `clock-weight`: 700 · `clock-track`: 0 · `card-radius`: 10px · `card-pad`: 28px · `label-weight`: 700 · `label-track`: 0.2em · `label-color`: var(--af-accent) · `flap-bg`: linear-gradient(180deg, #2a2b2e 0%, #232427 50%, #1d1e21 50%, #252629 100%) · `flap-ink`: #f4f1e8

### Millennium (`millennium`)

Wie ein Desktop um 2001: blaue Fensterleisten, grüner Hügel, blauer Himmel

Schriften: Tahoma (Titel/Zahlen) · Tahoma (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0d1b33` | `#5f9de8` |
| `bg-art` | `radial-gradient(140% 55% at 25% 108%, #1f3d1a 0 52%, transparent 52.5%), radial-gradient(120% 45% at 85% 110%, #2a4d22 0 50%, transparent 50.5%), linear-gradient(180deg, #050c1c 0%, #10264a 60%, #1d3b66 100%)` | `radial-gradient(140% 55% at 25% 108%, #4f9a35 0 52%, transparent 52.5%), radial-gradient(120% 45% at 85% 110%, #6db446 0 50%, transparent 50.5%), radial-gradient(30% 14% at 70% 22%, rgba(255, 255, 255, 0.85), transparent 70%), linear-gradient(180deg, #1f63cf 0%, #5f9de8 45%, #b3d4f5 75%)` |
| `ink` | `#f2f2f2` | `#111111` |
| `ink-2` | `rgba(242, 242, 242, 0.72)` | `rgba(17, 17, 17, 0.72)` |
| `ink-3` | `rgba(242, 242, 242, 0.48)` | `rgba(17, 17, 17, 0.5)` |
| `line` | `rgba(255, 255, 255, 0.12)` | `rgba(0, 0, 0, 0.14)` |
| `surface` | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.5)` |
| `accent` | `#4fc04a` | `#2f9e31` |
| `accent-soft` | `rgba(79, 192, 74, 0.16)` | `rgba(47, 158, 49, 0.14)` |
| `cold` | `#5c9cff` | `#0b56d6` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `linear-gradient(180deg, #3a3a3a 0, #1b1b1b 28px, #2b2b2b 28px)` | `linear-gradient(180deg, #3d8af7 0, #0a5fe0 4px, #0058e6 24px, #0b50cc 28px, #ece9d8 28px)` |
| `card-border` | `1px solid #000000` | `1px solid #0831d9` |
| `card-shadow` | `inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 6px 18px rgba(0, 0, 0, 0.45)` | `inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 6px 18px rgba(0, 30, 90, 0.35)` |
| `on-accent` | – | `#ffffff` |

Gemeinsam: `clock-weight`: 700 · `clock-track`: -0.01em · `card-radius`: 9px 9px 4px 4px · `card-pad`: 5px 22px 22px · `label-case`: none · `label-track`: 0 · `label-weight`: 700 · `label-color`: #ffffff

### Glanz (`glanz`)

Glänzendes Glas, Wasser und Himmel – der freundliche Look um 2008

Schriften: Nunito (rund) (Titel/Zahlen) · Nunito (rund) (Text) · Animation: bubbles · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#021827` | `#a9e2fb` |
| `bg-art` | `radial-gradient(120% 55% at 50% 118%, rgba(60, 170, 70, 0.45) 0 45%, transparent 46%), radial-gradient(60% 50% at 75% 15%, rgba(80, 180, 255, 0.35), transparent 70%), linear-gradient(180deg, #03243d 0%, #064a73 60%, #0a6c8e 100%)` | `radial-gradient(120% 60% at 50% 118%, #7fd06b 0 45%, #5fb84f 45.4%, transparent 46%), radial-gradient(50% 40% at 80% 18%, rgba(255, 255, 255, 0.75), transparent 70%), linear-gradient(180deg, #2fa8ec 0%, #a9e2fb 55%, #e8f8ff 100%)` |
| `ink` | `#f2fbff` | `#0b2a44` |
| `ink-2` | `rgba(242, 251, 255, 0.74)` | `rgba(11, 42, 68, 0.72)` |
| `ink-3` | `rgba(242, 251, 255, 0.5)` | `rgba(11, 42, 68, 0.5)` |
| `line` | `rgba(255, 255, 255, 0.16)` | `rgba(11, 42, 68, 0.12)` |
| `surface` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 0.5)` |
| `accent` | `#5fd0ff` | `#0088cc` |
| `accent-soft` | `rgba(95, 208, 255, 0.16)` | `rgba(0, 136, 204, 0.14)` |
| `cold` | `#5fd0ff` | `#0088cc` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#7fe07a` | `#2f9a2f` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.1) 48%, rgba(255, 255, 255, 0.04) 52%, rgba(255, 255, 255, 0.1) 100%)` | `linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 48%, rgba(255, 255, 255, 0.4) 52%, rgba(255, 255, 255, 0.6) 100%)` |
| `card-border` | `1px solid rgba(255, 255, 255, 0.35)` | `1px solid rgba(255, 255, 255, 0.95)` |
| `card-filter` | `blur(14px) saturate(1.5)` | `blur(12px) saturate(1.4)` |
| `card-shadow` | `inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 12px 30px rgba(0, 20, 40, 0.4)` | `inset 0 1px 0 #ffffff, 0 12px 30px rgba(0, 80, 140, 0.18)` |

Gemeinsam: `clock-weight`: 300 · `clock-track`: -0.02em · `card-radius`: 22px · `label-case`: none · `label-track`: 0 · `label-weight`: 700 · `label-color`: var(--af-accent)

### Handheld (`handheld`)

Vier Grüntöne und Pixelschrift wie auf einer alten Spielkonsole

Schriften: Doto (LED-Punkte) (Titel/Zahlen) · Space Grotesk (Text) · var(--af-sans) (Zahlen) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0f380f` | `#9bbc0f` |
| `bg-art` | `linear-gradient(rgba(0, 0, 0, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.12) 1px, transparent 1px)` | `linear-gradient(rgba(15, 56, 15, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 56, 15, 0.07) 1px, transparent 1px)` |
| `ink` | `#9bbc0f` | `#0f380f` |
| `ink-2` | `#8bac0f` | `#306230` |
| `ink-3` | `#5a7f1a` | `#4b6f2b` |
| `line` | `#306230` | `#306230` |
| `surface` | `rgba(155, 188, 15, 0.08)` | `rgba(15, 56, 15, 0.08)` |
| `accent` | `#9bbc0f` | `#0f380f` |
| `accent-soft` | `rgba(155, 188, 15, 0.16)` | `rgba(15, 56, 15, 0.14)` |
| `cold` | `#8bac0f` | `#306230` |
| `alert` | `#c4d84a` | `#0f380f` |
| `good` | `#9bbc0f` | `#0f380f` |
| `panel` | `rgba(15, 56, 15, 0.96)` | `rgba(139, 172, 15, 0.97)` |
| `chip` | `rgba(15, 56, 15, 0.85)` | `rgba(139, 172, 15, 0.9)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(15, 56, 15, 0.6)` | `rgba(155, 188, 15, 0.6)` |
| `colon` | `var(--af-ink)` | `var(--af-ink)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#0f380f` | `#8bac0f` |
| `card-border` | `3px solid #306230` | `3px solid #306230` |

Gemeinsam: `wide`: 0.7 · `clock-weight`: 900 · `clock-track`: 0.02em · `card-radius`: 4px · `label-weight`: 900 · `label-track`: 0.12em · `bg-size`: 4px 4px, 4px 4px

### Bauhaus (`bauhaus`)

Grundfarben, klare Formen, kräftige Kanten

Schriften: Outfit (Titel/Zahlen) · Space Grotesk (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#161616` | `#efe7d6` |
| `bg-art` | `radial-gradient(circle at 90% 12%, #c9a227 0 9%, transparent 9.2%), radial-gradient(circle at 6% 94%, #b53a28 0 13%, transparent 13.2%), linear-gradient(90deg, transparent 74%, rgba(40, 80, 160, 0.55) 74% 77%, transparent 77%)` | `radial-gradient(circle at 90% 12%, #f0b323 0 9%, transparent 9.2%), radial-gradient(circle at 6% 94%, #d33f2b 0 13%, transparent 13.2%), linear-gradient(90deg, transparent 74%, #1d4e9e 74% 77%, transparent 77%)` |
| `ink` | `#f2ead8` | `#111111` |
| `ink-2` | `rgba(242, 234, 216, 0.74)` | `rgba(17, 17, 17, 0.72)` |
| `ink-3` | `rgba(242, 234, 216, 0.5)` | `rgba(17, 17, 17, 0.5)` |
| `line` | `rgba(242, 234, 216, 0.2)` | `rgba(17, 17, 17, 0.25)` |
| `surface` | `rgba(242, 234, 216, 0.06)` | `rgba(255, 255, 255, 0.6)` |
| `accent` | `#e04a35` | `#d33f2b` |
| `accent-soft` | `rgba(224, 74, 53, 0.16)` | `rgba(211, 63, 43, 0.12)` |
| `cold` | `#4f7fd6` | `#1d4e9e` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#e9b931` | `#c48a00` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#202020` | `#ffffff` |
| `card-border` | `3px solid #f2ead8` | `3px solid #111111` |
| `card-shadow` | `7px 7px 0 #e04a35` | `7px 7px 0 #111111` |

Gemeinsam: `clock-weight`: 800 · `clock-track`: -0.03em · `card-radius`: 0 · `label-weight`: 800 · `label-track`: 0.14em

### Soft-UI (`softui`)

Weiche, herausgeprägte Flächen aus einem Guss – ruhig und plastisch

Schriften: Nunito (rund) (Titel/Zahlen) · Nunito (rund) (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#2b2e35` | `#e6e9ef` |
| `bg-art` | `none` | `none` |
| `ink` | `#e3e6ec` | `#3b4252` |
| `ink-2` | `rgba(227, 230, 236, 0.7)` | `rgba(59, 66, 82, 0.72)` |
| `ink-3` | `rgba(227, 230, 236, 0.46)` | `rgba(59, 66, 82, 0.48)` |
| `line` | `rgba(255, 255, 255, 0.07)` | `rgba(59, 66, 82, 0.08)` |
| `surface` | `rgba(255, 255, 255, 0.04)` | `rgba(255, 255, 255, 0.4)` |
| `accent` | `#8f9bff` | `#5b6cff` |
| `accent-soft` | `rgba(143, 155, 255, 0.16)` | `rgba(91, 108, 255, 0.12)` |
| `cold` | `#9dbad6` | `#3d6a8f` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#2b2e35` | `#e6e9ef` |
| `card-border` | `0 solid transparent` | `0 solid transparent` |
| `card-shadow` | `9px 9px 18px #1e2025, -9px -9px 18px #383c45` | `10px 10px 22px #c3c8d1, -10px -10px 22px #ffffff` |

Gemeinsam: `clock-weight`: 300 · `clock-track`: -0.03em · `card-radius`: 30px · `label-case`: none · `label-track`: 0 · `label-weight`: 700

### Boho (`boho`)

Terrakotta, Sand und Salbei, weiche Bögen und eine elegante Serifenschrift

Schriften: Playfair Display (Titel/Zahlen) · Plus Jakarta Sans (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#2a201b` | `#f3e7d7` |
| `bg-art` | `radial-gradient(60% 80% at 100% 100%, rgba(224, 154, 116, 0.18) 0 40%, transparent 40.5%), radial-gradient(40% 55% at 100% 100%, rgba(214, 170, 90, 0.16) 0 60%, transparent 60.5%), radial-gradient(30% 30% at 6% 10%, rgba(140, 160, 100, 0.14) 0 50%, transparent 51%)` | `radial-gradient(60% 80% at 100% 100%, rgba(192, 108, 70, 0.22) 0 40%, transparent 40.5%), radial-gradient(40% 55% at 100% 100%, rgba(224, 169, 86, 0.25) 0 60%, transparent 60.5%), radial-gradient(30% 30% at 6% 10%, rgba(138, 154, 91, 0.2) 0 50%, transparent 51%)` |
| `ink` | `#f3e6d6` | `#3d2b22` |
| `ink-2` | `rgba(243, 230, 214, 0.72)` | `rgba(61, 43, 34, 0.72)` |
| `ink-3` | `rgba(243, 230, 214, 0.48)` | `rgba(61, 43, 34, 0.48)` |
| `line` | `rgba(243, 230, 214, 0.12)` | `rgba(61, 43, 34, 0.1)` |
| `surface` | `rgba(243, 230, 214, 0.05)` | `rgba(255, 255, 255, 0.45)` |
| `accent` | `#e09a74` | `#b8603c` |
| `accent-soft` | `rgba(224, 154, 116, 0.16)` | `rgba(184, 96, 60, 0.12)` |
| `cold` | `#9fbcbc` | `#5f8586` |
| `alert` | `#e07a5f` | `#b5523b` |
| `good` | `#a9b77a` | `#6f7f45` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#36291f` | `#fbf4ea` |
| `card-border` | `0 solid transparent` | `0 solid transparent` |
| `card-shadow` | `0 10px 26px rgba(0, 0, 0, 0.25)` | `0 10px 26px rgba(120, 70, 40, 0.08)` |

Gemeinsam: `clock-weight`: 500 · `clock-track`: -0.01em · `card-radius`: 28px · `label-case`: none · `label-track`: 0.02em · `label-weight`: 600 · `label-color`: var(--af-accent)

### Landhaus (`landhaus`)

Leinen, Salbeigrün und Creme, klassische Serifen – gemütlich wie ein Bauernhaus

Schriften: Newsreader (Titel/Zahlen) · Manrope (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#1d211b` | `#f4efe4` |
| `bg-art` | `linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)` | `linear-gradient(rgba(120, 100, 70, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 100, 70, 0.045) 1px, transparent 1px)` |
| `ink` | `#ece6d6` | `#3a3426` |
| `ink-2` | `rgba(236, 230, 214, 0.72)` | `rgba(58, 52, 38, 0.72)` |
| `ink-3` | `rgba(236, 230, 214, 0.48)` | `rgba(58, 52, 38, 0.48)` |
| `line` | `rgba(236, 230, 214, 0.12)` | `rgba(58, 52, 38, 0.12)` |
| `surface` | `rgba(236, 230, 214, 0.05)` | `rgba(255, 255, 255, 0.55)` |
| `accent` | `#a8bd8c` | `#6f8a5b` |
| `accent-soft` | `rgba(168, 189, 140, 0.16)` | `rgba(111, 138, 91, 0.13)` |
| `cold` | `#9ab5c4` | `#5f7f95` |
| `alert` | `#d98a6a` | `#b0573a` |
| `good` | `#a8bd8c` | `#6f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#262b23` | `#fbf8f1` |
| `card-border` | `1px solid rgba(236, 230, 214, 0.1)` | `1px solid #e3d9c4` |

Gemeinsam: `clock-weight`: 400 · `clock-track`: -0.01em · `card-radius`: 12px · `label-weight`: 700 · `label-track`: 0.16em · `label-color`: var(--af-accent) · `bg-size`: 3px 3px, 3px 3px

### Natur (`natur`)

Moos, Blätter und Holz – frische Grüntöne und weiche Formen

Schriften: Fraunces (Titel/Zahlen) · Plus Jakarta Sans (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0d1a12` | `#eef2e6` |
| `bg-art` | `radial-gradient(60% 70% at 12% 18%, rgba(60, 120, 60, 0.4), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(120, 110, 50, 0.28), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(40, 100, 80, 0.32), transparent 64%)` | `radial-gradient(60% 70% at 12% 18%, rgba(120, 170, 90, 0.38), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(210, 195, 120, 0.32), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(90, 150, 110, 0.32), transparent 64%)` |
| `ink` | `#e6efe0` | `#23301f` |
| `ink-2` | `rgba(230, 239, 224, 0.72)` | `rgba(35, 48, 31, 0.72)` |
| `ink-3` | `rgba(230, 239, 224, 0.48)` | `rgba(35, 48, 31, 0.48)` |
| `line` | `rgba(230, 239, 224, 0.12)` | `rgba(35, 48, 31, 0.1)` |
| `surface` | `rgba(230, 239, 224, 0.05)` | `rgba(255, 255, 255, 0.5)` |
| `accent` | `#9cc77a` | `#4f7d36` |
| `accent-soft` | `rgba(156, 199, 122, 0.16)` | `rgba(79, 125, 54, 0.13)` |
| `cold` | `#7fb8c4` | `#4a8a9a` |
| `alert` | `#e0875a` | `#c0612f` |
| `good` | `#9cc77a` | `#4f7d36` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `rgba(255, 255, 255, 0.05)` | `rgba(255, 255, 255, 0.6)` |
| `card-border` | `1px solid rgba(156, 199, 122, 0.16)` | `1px solid rgba(80, 110, 60, 0.15)` |
| `card-filter` | `blur(12px)` | `blur(12px)` |

Gemeinsam: `clock-weight`: 350 · `clock-track`: -0.02em · `card-radius`: 24px · `label-case`: none · `label-track`: 0 · `label-weight`: 650 · `label-color`: var(--af-accent)

### Galerie (`galerie`)

Fotos im Passepartout wie im Museum, still und ohne Zoom – kleine Schilder statt Kacheln

Schriften: Instrument Serif (Titel/Zahlen) · Geist (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#1b1b1a` | `#f3f2ef` |
| `bg-art` | `none` | `none` |
| `ink` | `#f1eee8` | `#1c1c1b` |
| `ink-2` | `rgba(241, 238, 232, 0.7)` | `rgba(28, 28, 27, 0.66)` |
| `ink-3` | `rgba(241, 238, 232, 0.46)` | `rgba(28, 28, 27, 0.44)` |
| `line` | `rgba(241, 238, 232, 0.14)` | `rgba(28, 28, 27, 0.12)` |
| `surface` | `rgba(237, 231, 219, 0.045)` | `rgba(255, 255, 255, 0.55)` |
| `accent` | `#c8b89a` | `#7d6a4f` |
| `accent-soft` | `rgba(200, 184, 154, 0.14)` | `rgba(125, 106, 79, 0.12)` |
| `cold` | `#9dbad6` | `#3d6a8f` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card-rule` | `1px solid rgba(241, 238, 232, 0.22)` | `1px solid rgba(28, 28, 27, 0.2)` |
| `photo-frame` | `0 0 0 22px #f4f1ea, 0 0 0 23px rgba(0, 0, 0, 0.6), 0 30px 70px rgba(0, 0, 0, 0.55)` | `0 0 0 22px #ffffff, 0 0 0 23px rgba(40, 35, 25, 0.35), 0 26px 60px rgba(40, 35, 25, 0.22)` |

Gemeinsam: `clock-weight`: 400 · `clock-track`: -0.01em · `label-track`: 0.24em · `label-weight`: 500 · `card`: transparent · `card-tint`: transparent · `card-border`: 0 solid transparent · `card-radius`: 0 · `card-pad`: 26px 0 0 · `photo-inset`: 34px 40px · `photo-motion`: none

### Papier (`papier`)

Reines Schwarz-Weiß ohne Verläufe – klar wie gedruckt, mit feiner Serifenschrift

Schriften: Newsreader (Titel/Zahlen) · Inter (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#000000` | `#ffffff` |
| `bg-art` | `none` | `none` |
| `ink` | `#ffffff` | `#000000` |
| `ink-2` | `rgba(255, 255, 255, 0.82)` | `rgba(0, 0, 0, 0.78)` |
| `ink-3` | `rgba(255, 255, 255, 0.62)` | `rgba(0, 0, 0, 0.58)` |
| `line` | `rgba(255, 255, 255, 0.45)` | `rgba(0, 0, 0, 0.4)` |
| `surface` | `transparent` | `transparent` |
| `accent` | `#ffffff` | `#000000` |
| `accent-soft` | `rgba(255, 255, 255, 0.12)` | `rgba(0, 0, 0, 0.08)` |
| `cold` | `#ffffff` | `#000000` |
| `alert` | `#ffffff` | `#000000` |
| `good` | `#ffffff` | `#000000` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `transparent` | `transparent` |
| `card-tint` | `transparent` | `transparent` |
| `card-border` | `2px solid #ffffff` | `2px solid #000000` |
| `card-shadow` | `none` | `none` |
| `card-filter` | `none` | `none` |

Gemeinsam: `clock-weight`: 400 · `clock-track`: -0.02em · `card-radius`: 0 · `label-weight`: 700 · `label-track`: 0.14em · `photo-motion`: none

### E-Ink (`eink`)

Für E-Ink-Displays: ohne Bewegung und Übergänge, kräftige Schrift, Schwarz-Weiß mit wenigen Graustufen, Fotos in Graustufen

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: none · Kachel-Stil · ohne Bewegung

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#000000` | `#ffffff` |
| `bg-art` | `none` | `none` |
| `ink` | `#ffffff` | `#000000` |
| `ink-2` | `#cccccc` | `#333333` |
| `ink-3` | `#999999` | `#666666` |
| `line` | `#666666` | `#999999` |
| `surface` | `#000000` | `#ffffff` |
| `accent` | `#ffffff` | `#000000` |
| `accent-soft` | `#333333` | `#e6e6e6` |
| `cold` | `#ffffff` | `#000000` |
| `alert` | `#ffffff` | `#000000` |
| `good` | `#ffffff` | `#000000` |
| `panel` | `#000000` | `#ffffff` |
| `chip` | `#000000` | `#ffffff` |
| `shadow` | `none` | `none` |
| `veil` | `rgba(0, 0, 0, 0.85)` | `rgba(255, 255, 255, 0.85)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `1` | `1` |
| `mist` | `transparent` | `transparent` |
| `card` | `#000000` | `#ffffff` |
| `card-tint` | `transparent` | `transparent` |
| `card-border` | `2px solid #ffffff` | `2px solid #000000` |
| `card-shadow` | `none` | `none` |
| `card-filter` | `none` | `none` |

Gemeinsam: `clock-weight`: 600 · `clock-track`: -0.03em · `card-radius`: 6px · `label-weight`: 700 · `label-track`: 0.12em · `photo-motion`: none · `photo-filter`: grayscale(1) contrast(1.3) · `still`: 1

### Zeitung (`zeitung`)

Schlagzeilen-Serifen, Doppellinien und Spalten – wie die Titelseite am Morgen

Schriften: Playfair Display (Titel/Zahlen) · Newsreader (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#171614` | `#f3efe6` |
| `bg-art` | `none` | `none` |
| `ink` | `#ece6d8` | `#141414` |
| `ink-2` | `rgba(236, 230, 216, 0.74)` | `rgba(20, 20, 20, 0.74)` |
| `ink-3` | `rgba(236, 230, 216, 0.5)` | `rgba(20, 20, 20, 0.52)` |
| `line` | `rgba(236, 230, 216, 0.18)` | `rgba(20, 20, 20, 0.2)` |
| `surface` | `rgba(237, 231, 219, 0.045)` | `rgba(255, 255, 255, 0.55)` |
| `accent` | `#d4553f` | `#8b1e1e` |
| `accent-soft` | `rgba(212, 85, 63, 0.14)` | `rgba(139, 30, 30, 0.1)` |
| `cold` | `#9dbad6` | `#3d6a8f` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card-rule` | `3px double rgba(236, 230, 216, 0.55)` | `3px double rgba(20, 20, 20, 0.7)` |

Gemeinsam: `clock-weight`: 800 · `clock-track`: -0.02em · `label-weight`: 700 · `label-track`: 0.2em · `card`: transparent · `card-tint`: transparent · `card-border`: 0 solid transparent · `card-radius`: 0 · `card-pad`: 22px 0 0

### Art déco (`artdeco`)

Gold auf Schwarz, Strahlen und doppelte Rahmen – Glanz der Zwanziger

Schriften: Cormorant Garamond (Titel/Zahlen) · Outfit (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0d0c0a` | `#f1eadb` |
| `bg-art` | `repeating-conic-gradient(from -90deg at 50% 118%, rgba(201, 164, 92, 0.07) 0deg 1.2deg, transparent 1.2deg 7deg), radial-gradient(70% 60% at 50% 115%, rgba(201, 164, 92, 0.12), transparent 70%)` | `repeating-conic-gradient(from -90deg at 50% 118%, rgba(150, 110, 40, 0.08) 0deg 1.2deg, transparent 1.2deg 7deg), radial-gradient(70% 60% at 50% 115%, rgba(150, 110, 40, 0.1), transparent 70%)` |
| `ink` | `#efe6d2` | `#1a1712` |
| `ink-2` | `rgba(239, 230, 210, 0.72)` | `rgba(26, 23, 18, 0.72)` |
| `ink-3` | `rgba(239, 230, 210, 0.48)` | `rgba(26, 23, 18, 0.5)` |
| `line` | `rgba(201, 164, 92, 0.22)` | `rgba(156, 122, 52, 0.3)` |
| `surface` | `rgba(201, 164, 92, 0.04)` | `rgba(255, 255, 255, 0.4)` |
| `accent` | `#c9a45c` | `#9c7a34` |
| `accent-soft` | `rgba(201, 164, 92, 0.14)` | `rgba(156, 122, 52, 0.12)` |
| `cold` | `#9dbad6` | `#3d6a8f` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `rgba(13, 12, 10, 0.72)` | `rgba(250, 246, 236, 0.8)` |
| `card-border` | `1px solid rgba(201, 164, 92, 0.6)` | `1px solid rgba(156, 122, 52, 0.7)` |
| `card-shadow` | `inset 0 0 0 5px #0d0c0a, inset 0 0 0 6px rgba(201, 164, 92, 0.35)` | `inset 0 0 0 5px #f1eadb, inset 0 0 0 6px rgba(156, 122, 52, 0.4)` |
| `glow` | `0 0 22px rgba(201, 164, 92, 0.25)` | – |

Gemeinsam: `clock-weight`: 300 · `clock-track`: 0.03em · `card-radius`: 0 · `label-weight`: 500 · `label-track`: 0.32em · `label-color`: var(--af-accent)

### Terminal (`terminal`)

Grüne Monitorschrift mit feinen Zeilen – wie ein Rechner aus den Achtzigern

Schriften: ui-monospace (Titel/Zahlen) · ui-monospace (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#030805` | `#eeeee4` |
| `bg-art` | `repeating-linear-gradient(0deg, rgba(80, 255, 140, 0.035) 0 1px, transparent 1px 3px), radial-gradient(120% 90% at 50% 50%, transparent 58%, rgba(0, 0, 0, 0.65))` | `repeating-linear-gradient(0deg, rgba(30, 80, 40, 0.04) 0 1px, transparent 1px 3px)` |
| `ink` | `#7dff9b` | `#173a22` |
| `ink-2` | `rgba(125, 255, 155, 0.72)` | `rgba(23, 58, 34, 0.74)` |
| `ink-3` | `rgba(125, 255, 155, 0.48)` | `rgba(23, 58, 34, 0.52)` |
| `line` | `rgba(125, 255, 155, 0.2)` | `rgba(23, 58, 34, 0.22)` |
| `surface` | `rgba(125, 255, 155, 0.04)` | `rgba(23, 58, 34, 0.04)` |
| `accent` | `#c6ff7d` | `#2f7d3c` |
| `accent-soft` | `rgba(198, 255, 125, 0.12)` | `rgba(47, 125, 60, 0.12)` |
| `cold` | `#7de0ff` | `#3d6a8f` |
| `alert` | `#ffb35c` | `#c0552f` |
| `good` | `#7dff9b` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `rgba(3, 8, 5, 0.6)` | `rgba(255, 255, 255, 0.45)` |
| `card-border` | `1px solid rgba(125, 255, 155, 0.35)` | `1px solid rgba(23, 58, 34, 0.35)` |
| `card-shadow` | `0 0 24px rgba(125, 255, 155, 0.06)` | `none` |
| `glow` | `0 0 10px rgba(125, 255, 155, 0.45)` | – |

Gemeinsam: `clock-weight`: 500 · `clock-track`: 0 · `time-col`: calc(104px * var(--af-fs, 1)) · `wide`: 0.72 · `card-radius`: 0 · `label-weight`: 500 · `label-track`: 0.12em

### Verspielt (`verspielt`)

Runde Formen, fröhliche Farben, dicke Schrift – fürs Kinderzimmer und die Familienküche

Schriften: Nunito (rund) (Titel/Zahlen) · Nunito (rund) (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#1d1a33` | `#fff7ef` |
| `bg-art` | `radial-gradient(60% 70% at 12% 18%, rgba(255, 111, 145, 0.32), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(80, 200, 190, 0.26), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(255, 179, 71, 0.24), transparent 64%)` | `radial-gradient(60% 70% at 12% 18%, rgba(255, 170, 150, 0.45), transparent 62%), radial-gradient(55% 65% at 88% 26%, rgba(140, 220, 200, 0.45), transparent 62%), radial-gradient(75% 70% at 58% 100%, rgba(190, 170, 255, 0.4), transparent 64%)` |
| `ink` | `#f6f1ff` | `#3a2f4a` |
| `ink-2` | `rgba(246, 241, 255, 0.74)` | `rgba(58, 47, 74, 0.74)` |
| `ink-3` | `rgba(246, 241, 255, 0.5)` | `rgba(58, 47, 74, 0.5)` |
| `line` | `rgba(246, 241, 255, 0.12)` | `rgba(58, 47, 74, 0.1)` |
| `surface` | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.7)` |
| `accent` | `#ffb347` | `#ff6f61` |
| `accent-soft` | `rgba(255, 179, 71, 0.16)` | `rgba(255, 111, 97, 0.14)` |
| `cold` | `#6fc8ff` | `#4aa3df` |
| `alert` | `#ff7a8a` | `#e5484d` |
| `good` | `#6ee7a8` | `#3fbf7f` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `rgba(255, 255, 255, 0.08)` | `#ffffff` |
| `card-border` | `0 solid transparent` | `0 solid transparent` |
| `card-shadow` | `0 10px 0 rgba(0, 0, 0, 0.22)` | `0 10px 0 rgba(58, 47, 74, 0.08)` |

Gemeinsam: `clock-weight`: 800 · `clock-track`: -0.02em · `card-radius`: 34px · `label-case`: none · `label-track`: 0 · `label-weight`: 800 · `label-color`: var(--af-accent)

### Leitsystem (`leitsystem`)

Wie Wegweiser am Flughafen: Gelb auf Anthrazit, große klare Schrift – auch aus der Ferne lesbar

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#1b1e21` | `#ececea` |
| `bg-art` | `linear-gradient(180deg, #ffc400 0 10px, transparent 10px)` | `linear-gradient(180deg, #ffc400 0 10px, transparent 10px)` |
| `ink` | `#ffffff` | `#141414` |
| `ink-2` | `rgba(255, 255, 255, 0.8)` | `rgba(20, 20, 20, 0.76)` |
| `ink-3` | `rgba(255, 255, 255, 0.56)` | `rgba(20, 20, 20, 0.54)` |
| `line` | `rgba(255, 255, 255, 0.16)` | `rgba(20, 20, 20, 0.14)` |
| `surface` | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.7)` |
| `accent` | `#ffc400` | `#b88600` |
| `accent-soft` | `rgba(255, 196, 0, 0.16)` | `rgba(255, 196, 0, 0.25)` |
| `cold` | `#5fb4ff` | `#1f6fc4` |
| `alert` | `#ff6b4a` | `#d23f1f` |
| `good` | `#4cd28a` | `#1f8a4c` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#25292d` | `#ffffff` |
| `card-border` | `0 solid transparent` | `0 solid transparent` |
| `card-shadow` | `none` | `none` |
| `label-color` | `#ffc400` | `#141414` |

Gemeinsam: `clock-weight`: 700 · `clock-track`: -0.02em · `card-radius`: 6px · `label-weight`: 800 · `label-track`: 0.08em

### Swiss Grid (`swiss`)

Schweizer Typografie: strenges Raster, riesige Zahlen, Schwarz-Weiß mit Signalrot

Schriften: Inter (Titel/Zahlen) · Inter (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0f0f0f` | `#f4f3ef` |
| `bg-art` | `linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)` | `linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px)` |
| `ink` | `#f4f3ef` | `#111111` |
| `ink-2` | `rgba(244, 243, 239, 0.74)` | `rgba(17, 17, 17, 0.74)` |
| `ink-3` | `rgba(244, 243, 239, 0.5)` | `rgba(17, 17, 17, 0.5)` |
| `line` | `rgba(244, 243, 239, 0.18)` | `rgba(17, 17, 17, 0.16)` |
| `surface` | `transparent` | `transparent` |
| `accent` | `#ff3321` | `#e30613` |
| `accent-soft` | `rgba(255, 51, 33, 0.16)` | `rgba(227, 6, 19, 0.1)` |
| `cold` | `#f4f3ef` | `#111111` |
| `alert` | `#ff3321` | `#e30613` |
| `good` | `#f4f3ef` | `#111111` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |

Gemeinsam: `clock-weight`: 800 · `clock-track`: -0.05em · `card`: transparent · `card-tint`: transparent · `card-border`: 0 solid transparent · `card-radius`: 0 · `card-pad`: 26px 0 0 · `label-case`: none · `label-weight`: 700 · `label-track`: 0 · `label-color`: var(--af-accent) · `card-rule`: 4px solid currentColor · `bg-size`: calc(100% / 12) 100%

### Rams (`rams`)

Wie Geräte von Dieter Rams: warmes Grau, ein orangener Akzent, Lautsprecher-Raster – ruhig und funktional

Schriften: Manrope (Titel/Zahlen) · Manrope (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#1e1e1c` | `#d9d7d0` |
| `bg-art` | `radial-gradient(circle, rgba(255, 255, 255, 0.06) 1.3px, transparent 1.7px)` | `radial-gradient(circle, rgba(0, 0, 0, 0.08) 1.3px, transparent 1.7px)` |
| `ink` | `#eae8e2` | `#2b2a27` |
| `ink-2` | `rgba(234, 232, 226, 0.7)` | `rgba(43, 42, 39, 0.7)` |
| `ink-3` | `rgba(234, 232, 226, 0.46)` | `rgba(43, 42, 39, 0.48)` |
| `line` | `rgba(234, 232, 226, 0.12)` | `rgba(43, 42, 39, 0.12)` |
| `surface` | `rgba(234, 232, 226, 0.05)` | `rgba(255, 255, 255, 0.4)` |
| `accent` | `#ff6a13` | `#e85a0c` |
| `accent-soft` | `rgba(255, 106, 19, 0.16)` | `rgba(232, 90, 12, 0.13)` |
| `cold` | `#8fb3c9` | `#4f7c96` |
| `alert` | `#ff6a13` | `#e85a0c` |
| `good` | `#9cbf7a` | `#5c8a3f` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#2a2a27` | `#eceae4` |
| `card-border` | `1px solid rgba(234, 232, 226, 0.08)` | `1px solid rgba(255, 255, 255, 0.7)` |
| `card-shadow` | `0 2px 0 rgba(0, 0, 0, 0.35)` | `0 2px 0 rgba(43, 42, 39, 0.12)` |

Gemeinsam: `clock-weight`: 300 · `clock-track`: -0.03em · `card-radius`: 16px · `label-weight`: 600 · `label-track`: 0.12em · `bg-size`: 14px 14px

### Lobby (`lobby`)

Wie die Rezeption eines guten Hotels: viel Luft, feine Serifen, Messinglinien – nur das Nötigste

Schriften: Instrument Serif (Titel/Zahlen) · Plus Jakarta Sans (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#12100e` | `#f5f0e8` |
| `bg-art` | `radial-gradient(120% 90% at 50% 0%, rgba(195, 164, 107, 0.08), transparent 70%)` | `radial-gradient(120% 90% at 50% 0%, rgba(140, 109, 58, 0.07), transparent 70%)` |
| `ink` | `#efe6d6` | `#2a2420` |
| `ink-2` | `rgba(239, 230, 214, 0.68)` | `rgba(42, 36, 32, 0.68)` |
| `ink-3` | `rgba(239, 230, 214, 0.44)` | `rgba(42, 36, 32, 0.46)` |
| `line` | `rgba(195, 164, 107, 0.22)` | `rgba(140, 109, 58, 0.22)` |
| `surface` | `transparent` | `transparent` |
| `accent` | `#c3a46b` | `#8c6d3a` |
| `accent-soft` | `rgba(195, 164, 107, 0.12)` | `rgba(140, 109, 58, 0.1)` |
| `cold` | `#a9bccb` | `#4d6a80` |
| `alert` | `#d98c6a` | `#a8522e` |
| `good` | `#a8bf9a` | `#5a7a4d` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `0.8` | `0.8` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card-rule` | `1px solid rgba(195, 164, 107, 0.45)` | `1px solid rgba(140, 109, 58, 0.45)` |

Gemeinsam: `clock-weight`: 400 · `clock-track`: 0 · `card`: transparent · `card-tint`: transparent · `card-border`: 0 solid transparent · `card-radius`: 0 · `card-pad`: 26px 0 0 · `label-weight`: 500 · `label-track`: 0.32em · `label-color`: var(--af-accent)

### Bilderbuch (`bilderbuch`)

Wie ein Kinderbuch: Hügel mit Sonne oder Mond und Sternen, Karten wie ausgeschnitten mit dicker Kontur

Schriften: Fraunces (Titel/Zahlen) · Nunito (rund) (Text) · Animation: none · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#1c2552` | `#bfe4f2` |
| `bg-art` | `radial-gradient(circle at 62% 8%, #fff3c4 0 3.2%, transparent 3.5%), radial-gradient(circle at 20% 14%, #fff3c4 0 0.35%, transparent 0.5%), radial-gradient(circle at 48% 8%, #fff3c4 0 0.3%, transparent 0.45%), radial-gradient(circle at 66% 22%, #fff3c4 0 0.3%, transparent 0.45%), radial-gradient(circle at 8% 30%, #fff3c4 0 0.25%, transparent 0.4%), radial-gradient(ellipse 62% 30% at 18% 108%, #24603f 0 99%, transparent 100%), radial-gradient(ellipse 72% 36% at 86% 112%, #1d4f34 0 99%, transparent 100%)` | `radial-gradient(circle at 62% 8%, #ffd24a 0 3.6%, transparent 3.9%), radial-gradient(ellipse 9% 4.5% at 16% 15%, #ffffff 0 99%, transparent 100%), radial-gradient(ellipse 6% 4% at 21% 12%, #ffffff 0 99%, transparent 100%), radial-gradient(ellipse 62% 30% at 18% 108%, #9fd38a 0 99%, transparent 100%), radial-gradient(ellipse 72% 36% at 86% 112%, #7cc46e 0 99%, transparent 100%)` |
| `ink` | `#fff6e0` | `#2b2340` |
| `ink-2` | `rgba(255, 246, 224, 0.8)` | `rgba(43, 35, 64, 0.76)` |
| `ink-3` | `rgba(255, 246, 224, 0.56)` | `rgba(43, 35, 64, 0.54)` |
| `line` | `rgba(255, 246, 224, 0.16)` | `rgba(43, 35, 64, 0.14)` |
| `surface` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 0.7)` |
| `accent` | `#ffc94a` | `#e8553a` |
| `accent-soft` | `rgba(255, 201, 74, 0.18)` | `rgba(232, 85, 58, 0.14)` |
| `cold` | `#8cc8ff` | `#2f7cc7` |
| `alert` | `#ff8a6b` | `#d93a3a` |
| `good` | `#7fdc8f` | `#2f9a4e` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `#2b3670` | `#fffaf0` |
| `card-border` | `3px solid #fff6e0` | `3px solid #2b2340` |
| `card-shadow` | `6px 6px 0 rgba(0, 0, 0, 0.4)` | `6px 6px 0 #2b2340` |

Gemeinsam: `clock-weight`: 800 · `clock-track`: -0.02em · `card-radius`: 22px · `label-case`: none · `label-track`: 0 · `label-weight`: 800 · `label-color`: var(--af-accent)

### Weihnachten (`weihnachten`)

Tannengrün, Kerzengold und ein Hauch Rot – mit Lichterkette am oberen Rand und leisem Schnee

Schriften: Fraunces (Titel/Zahlen) · Plus Jakarta Sans (Text) · Animation: snow · Kachel-Stil

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0d1f17` | `#f7f2e8` |
| `bg-art` | `radial-gradient(circle at 3.0% 2.2%, #ffd27a 0 0.42%, transparent 0.7%), radial-gradient(circle at 10.8% 3.6%, #e0564a 0 0.42%, transparent 0.7%), radial-gradient(circle at 18.6% 3.6%, #7fcf8a 0 0.42%, transparent 0.7%), radial-gradient(circle at 26.4% 2.2%, #fff3d6 0 0.42%, transparent 0.7%), radial-gradient(circle at 34.2% 2.2%, #ffd27a 0 0.42%, transparent 0.7%), radial-gradient(circle at 42.0% 3.6%, #e0564a 0 0.42%, transparent 0.7%), radial-gradient(circle at 49.8% 3.6%, #7fcf8a 0 0.42%, transparent 0.7%), radial-gradient(circle at 57.6% 2.2%, #fff3d6 0 0.42%, transparent 0.7%), radial-gradient(circle at 65.4% 2.2%, #ffd27a 0 0.42%, transparent 0.7%), radial-gradient(circle at 73.2% 3.6%, #e0564a 0 0.42%, transparent 0.7%), radial-gradient(circle at 81.0% 3.6%, #7fcf8a 0 0.42%, transparent 0.7%), radial-gradient(circle at 88.8% 2.2%, #fff3d6 0 0.42%, transparent 0.7%), radial-gradient(circle at 96.6% 2.2%, #ffd27a 0 0.42%, transparent 0.7%), radial-gradient(70% 45% at 50% 105%, rgba(224, 180, 90, 0.16), transparent 70%)` | `radial-gradient(circle at 3.0% 2.2%, #d9a441 0 0.42%, transparent 0.7%), radial-gradient(circle at 10.8% 3.6%, #c0392b 0 0.42%, transparent 0.7%), radial-gradient(circle at 18.6% 3.6%, #3f8f57 0 0.42%, transparent 0.7%), radial-gradient(circle at 26.4% 2.2%, #e9c46a 0 0.42%, transparent 0.7%), radial-gradient(circle at 34.2% 2.2%, #d9a441 0 0.42%, transparent 0.7%), radial-gradient(circle at 42.0% 3.6%, #c0392b 0 0.42%, transparent 0.7%), radial-gradient(circle at 49.8% 3.6%, #3f8f57 0 0.42%, transparent 0.7%), radial-gradient(circle at 57.6% 2.2%, #e9c46a 0 0.42%, transparent 0.7%), radial-gradient(circle at 65.4% 2.2%, #d9a441 0 0.42%, transparent 0.7%), radial-gradient(circle at 73.2% 3.6%, #c0392b 0 0.42%, transparent 0.7%), radial-gradient(circle at 81.0% 3.6%, #3f8f57 0 0.42%, transparent 0.7%), radial-gradient(circle at 88.8% 2.2%, #e9c46a 0 0.42%, transparent 0.7%), radial-gradient(circle at 96.6% 2.2%, #d9a441 0 0.42%, transparent 0.7%), radial-gradient(70% 45% at 50% 105%, rgba(192, 57, 43, 0.08), transparent 70%)` |
| `ink` | `rgb(245, 239, 228)` | `rgb(30, 58, 44)` |
| `ink-2` | `rgba(245, 239, 228, 0.72)` | `rgba(30, 58, 44, 0.72)` |
| `ink-3` | `rgba(245, 239, 228, 0.48)` | `rgba(30, 58, 44, 0.48)` |
| `line` | `rgba(245, 239, 228, 0.12)` | `rgba(30, 58, 44, 0.12)` |
| `surface` | `rgba(255, 255, 255, 0.05)` | `rgba(255, 255, 255, 0.7)` |
| `accent` | `#e0b45a` | `#b0302a` |
| `accent-soft` | `rgba(224, 180, 90, 0.16)` | `rgba(176, 48, 42, 0.12)` |
| `cold` | `#9cc3d6` | `#2f6f8f` |
| `alert` | `#e0564a` | `#b0302a` |
| `good` | `#7fcf8a` | `#2f7d4a` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `var(--af-accent)` | `var(--af-accent)` |
| `colon-opacity` | `1` | `1` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |
| `card` | `rgba(255, 255, 255, 0.05)` | `#fffaf1` |
| `card-border` | `1px solid rgba(224, 180, 90, 0.3)` | `1px solid rgba(176, 48, 42, 0.18)` |
| `card-shadow` | `none` | `0 2px 0 rgba(30, 58, 44, 0.06)` |

Gemeinsam: `clock-weight`: 400 · `clock-track`: -0.01em · `card-radius`: 14px · `label-case`: none · `label-track`: 0.02em · `label-weight`: 600 · `label-color`: var(--af-accent)

### Jahreszeiten (`saisonal`)

Wechselt von selbst: Frühling, Sommer, Herbst, Winter – und zu Weihnachten, Silvester, Valentinstag, Ostern und Halloween

Schriften: Fraunces (Titel/Zahlen) · Inter (Text) · Animation: none

| Wert | Dunkel | Hell |
|---|---|---|
| `bg` | `#0a0d0b` | `#f2ede3` |
| `bg-art` | `none` | `none` |
| `ink` | `#ede7db` | `#1e1b16` |
| `ink-2` | `rgba(237, 231, 219, 0.66)` | `rgba(30, 27, 22, 0.64)` |
| `ink-3` | `rgba(237, 231, 219, 0.4)` | `rgba(30, 27, 22, 0.42)` |
| `line` | `rgba(237, 231, 219, 0.1)` | `rgba(30, 27, 22, 0.11)` |
| `surface` | `rgba(237, 231, 219, 0.045)` | `rgba(255, 255, 255, 0.55)` |
| `accent` | `#d6a865` | `#9a7334` |
| `accent-soft` | `rgba(214, 168, 101, 0.14)` | `rgba(154, 115, 52, 0.13)` |
| `cold` | `#9dbad6` | `#3d6a8f` |
| `alert` | `#ef8b63` | `#c0552f` |
| `good` | `#9cc5a1` | `#4f8a5b` |
| `panel` | `rgba(18, 21, 19, 0.92)` | `rgba(250, 247, 240, 0.95)` |
| `chip` | `rgba(10, 13, 11, 0.62)` | `rgba(250, 247, 240, 0.8)` |
| `shadow` | `0 30px 80px rgba(0, 0, 0, 0.55)` | `0 30px 80px rgba(60, 45, 20, 0.16)` |
| `veil` | `rgba(6, 9, 7, 0.52)` | `rgba(242, 237, 227, 0.55)` |
| `colon` | `inherit` | `inherit` |
| `colon-opacity` | `0.55` | `0.5` |
| `mist` | `rgba(255, 255, 255, 0.07)` | `rgba(120, 100, 70, 0.07)` |

Gemeinsam: `clock-weight`: 300 · `clock-track`: -0.02em

## Jahreszeiten (Stil „Jahreszeiten“ wechselt nach Datum)

- **Weihnachten** (`saison-weihnachten`): dunkel `#0f1d17` / `#d4a94f`, hell `#f6f1e7` / `#a8322a`, Animation snow
- **Silvester** (`saison-silvester`): dunkel `#08090f` / `#e8c66b`, hell `#f5f0e6` / `#a8812f`, Animation fireworks
- **Valentinstag** (`saison-valentin`): dunkel `#1f0f16` / `#ff6b8b`, hell `#fff1f3` / `#d94a6a`, Animation hearts
- **Ostern** (`saison-ostern`): dunkel `#1b1d26` / `#c9b6ff`, hell `#f7f5ec` / `#8a6fd1`, Animation blossoms
- **Halloween** (`saison-halloween`): dunkel `#120d14` / `#ff8a2a`, hell `#f6ece0` / `#d4641c`, Animation fireflies
- **Frühling** (`saison-fruehling`): dunkel `#13181a` / `#f4a6c0`, hell `#f4f6ee` / `#4f9a5c`, Animation blossoms
- **Sommer** (`saison-sommer`): dunkel `#1a1410` / `#ffb54d`, hell `#fdf6e8` / `#e07a2f`, Animation none
- **Herbst** (`saison-herbst`): dunkel `#1a120c` / `#e0913a`, hell `#f5ece0` / `#b45a24`, Animation leaves
- **Winter** (`saison-winter`): dunkel `#0d131c` / `#9cc9f0`, hell `#eef3f7` / `#3f7bb3`, Animation snow

## Farbpaletten (liegen über jedem Stil)

| Palette | Dunkel: Grund · Text · Akzent · Karte | Hell: Grund · Text · Akzent · Karte |
|---|---|---|
| **Nordisch (kühl, Fjordblau)** (`nordisch`) | `#2e3440` · `#eceff4` · `#88c0d0` · `#3b4252` | `#eceff4` · `#2e3440` · `#5e81ac` · `#e5e9f0` |
| **Vampir (Lila, Pink, Grün)** (`vampir`) | `#282a36` · `#f8f8f2` · `#bd93f9` · `#343746` | `#f8f8f2` · `#282a36` · `#7c5cc4` · `#ffffff` |
| **Mocha (Pastell)** (`mocha`) | `#1e1e2e` · `#cdd6f4` · `#cba6f7` · `#313244` | `#eff1f5` · `#4c4f69` · `#8839ef` · `#e6e9ef` |
| **Retro (Senf, Rost, Oliv)** (`retro`) | `#282828` · `#ebdbb2` · `#fabd2f` · `#3c3836` | `#fbf1c7` · `#3c3836` · `#b57614` · `#f2e5bc` |
| **Nachtstadt (Neonblau)** (`nachtstadt`) | `#1a1b26` · `#c0caf5` · `#7aa2f7` · `#24283b` | `#e1e2e7` · `#3760bf` · `#2e7de9` · `#d5d6db` |

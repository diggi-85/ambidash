# Abgleich mit Ambiframe

Ambidash zeigt dieselben Designs wie Ambiframe (Stand des Exports: 2026-11-10, `frontend/packages/core/data/ambiframe-designs.json`). Das Skript `npm run designs:import` (in `frontend/`) erzeugt aus dem Export `src/ambiframe.generated.ts`; `packages/core/test/ambiframe.test.ts` prüft die Werte gegen die Export-Datei.

## Regeln

- **Gleiche Namen:** Jedes Design hat eine englische Id und die Ambiframe-Id als Alias (`design: ruhig` = `design: calm`, `papier` = `paper`, `kacheln` = `tiles` …). Paletten ebenso (`nordisch` = `nordic`).
- **Gleiche Farben und Schriften:** Seitenfarbe, Texte, Linien, Flächen, Akzent, Gut/Warnung/Kalt und die Schriften sind die von Ambiframe (Schriften als `Ambidash <Name>`, dieselben Dateien).
- **Ecken:** Ambiframes Karten sind groß, die Kacheln hier klein: Kachel-Radius = 0,8 × Karten-Radius.
- **Kontrast (WCAG AA) geht vor:** Wo ein Ambiframe-Wert auf den Kacheln nicht lesbar wäre, wird er verschoben oder weggelassen. Jede Abweichung steht unten und im Export `DEVIATIONS`.

## Abweichungen der erzeugten Designs (58)

**pixel**
- light label-color: #d9480f → rgb(157, 56, 16)

**arcade**
- light good: #1f9d55 → rgb(30, 128, 77)

**tiles**
- dark accent: #0a84ff → rgb(59, 157, 255)
- dark alert: #ff453a → rgb(255, 106, 97)
- dark label-color: rgb(59, 157, 255) → rgb(137, 196, 255)
- dark bg-art: page art → none
- light accent: #007aff → rgb(0, 85, 179)
- light good: #34c759 → rgb(26, 100, 45)
- light alert: #ff3b30 → rgb(179, 41, 34)
- light label-color: rgb(0, 85, 179) → rgb(0, 68, 143)
- light bg-art: page art → none

**flap**
- light accent: #b88a00 → rgb(152, 115, 5)
- light label-color: rgb(152, 115, 5) → rgb(126, 97, 9)

**millennium**
- light accent: #2f9e31 → rgb(20, 31, 20)
- light good: #4f8a5b → rgb(23, 29, 24)
- light alert: #c0552f → rgb(35, 24, 20)
- light bg-art: page art → none
- light card-bg: tile fill → surface
- light ink-2: rgba(17, 17, 17, 0.72) → rgba(17, 17, 17, 0.78)

**gloss**
- dark alert: #ef8b63 → rgb(240, 173, 146)
- dark label-color: #5fd0ff → rgb(183, 234, 255)
- dark bg-art: page art → none
- light accent: #0088cc → rgb(7, 80, 122)
- light good: #2f9a2f → rgb(25, 87, 60)
- light alert: #c0552f → rgb(102, 64, 58)
- light label-color: rgb(7, 80, 122) → rgb(9, 57, 90)
- light bg-art: page art → none

**handheld**
- dark surface: rgba(155, 188, 15, 0.08) → transparent
- dark ink: #9bbc0f → rgb(165, 195, 39)
- dark ink-2: #8bac0f → rgb(162, 189, 63)
- light ink-2: #306230 → rgba(15, 56, 15, 0.96)

**boho**
- light accent: #b8603c → rgb(172, 91, 57)
- light good: #6f7f45 → rgb(106, 119, 66)
- light label-color: rgb(172, 91, 57) → rgb(128, 72, 48)
- light bg-art: page art → none

**cottage**
- light label-color: #6f8a5b → rgb(90, 104, 70)

**nature**
- light alert: #c0612f → rgb(176, 92, 45)
- light label-color: #4f7d36 → rgb(61, 94, 45)
- light bg-art: page art → none

**artdeco**
- light accent: #9c7a34 → rgb(143, 112, 49)
- light label-color: rgb(143, 112, 49) → rgb(120, 94, 43)

**playful**
- light accent: #ff6f61 → rgb(196, 92, 90)
- light good: #3fbf7f → rgb(61, 133, 106)
- light alert: #e5484d → rgb(212, 70, 77)
- light label-color: rgb(196, 92, 90) → rgb(141, 74, 84)

**wayfinding**
- dark bg-art: page art → none
- light accent: #b88600 → rgb(135, 100, 6)
- light good: #1f8a4c → rgb(30, 126, 70)
- light alert: #d23f1f → rgb(191, 59, 30)

**lobby**
- light label-color: #8c6d3a → rgb(120, 94, 53)

**picturebook**
- dark bg-art: page art → none
- light accent: #e8553a → rgb(156, 65, 60)
- light good: #2f9a4e → rgb(45, 106, 72)
- light alert: #d93a3a → rgb(165, 51, 60)
- light label-color: rgb(156, 65, 60) → rgb(100, 50, 62)
- light bg-art: page art → none

**xmas**
- dark bg-art: page art → none
- light bg-art: page art → none

## Von Hand angepasste Designs

Bei diesen Designs wurden Werte schon früher von Hand für die Kacheln verschoben (siehe `MOVED` im Test): glass (dunkel: Text 2), aurora (dunkel: Text 2), bauhaus (Text 2, hell: Gut), softui (hell: Text 2), swiss (hell: Akzent, Warnung), rams (hell: Text 2, Akzent, Gut, Warnung). Ihre Ecken folgen etwa der 0,8-Regel (26 statt 27, 24 statt 24 usw.).

## Noch offen

- Millennium (hell), Gloss (hell), Playful (hell) und Picture book (hell): Akzent und Statusfarben mussten stark abgedunkelt werden, weil die Seitenfarbe mittelhell ist; hier lohnt ein händischer Blick.
- Seitenkunst, die den Text unlesbar machen würde, ist weggelassen (Tiles, Millennium hell, Gloss, Boho hell, Nature hell, Wayfinding dunkel, Picture book, Christmas).
- Ziffern-Schriften (`… Ziffern`) und Fotoeffekte aus Ambiframe gibt es hier nicht; die Uhr kommt mit dem Uhr-Widget.

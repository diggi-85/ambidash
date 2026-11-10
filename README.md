# Ambidash

**A dashboard for Home Assistant that builds itself from your floors, areas and devices.** Bright tiles, 36 designs in light and dark, instant feedback, and it works the same in the browser, the HA app on a phone and on a wall tablet.

> **Beta 0.1.** Lights, switches, climate, covers, media players and scenes, with pop-ups, 36 designs (the same as in [Ambiframe](https://github.com/diggi-85/ambiframe)), a Studio with setup assistant, design gallery and layout editor. Widgets (clock, weather, Lovelace cards) and the sleep mode are on the way. This is a beta: expect rough edges, and back up before you try it. Requires Home Assistant **2026.11** or newer.

<p align="center"><b>English</b> · <a href="README.de.md">Deutsch</a></p>

## What you get

- **A dashboard without setup:** floors → areas → tiles, built from what Home Assistant already knows. Hidden and diagnostic entities stay out; devices without an area appear last under "Unassigned".
- **Scenes first:** scenes get a row of their own at the top, whatever area they belong to.
- **Tiles that react at once:** tap switches a light, switch or cover, activates a scene, plays/pauses media. The tile shows the new state immediately and corrects itself if Home Assistant disagrees.
- **Long press (or Shift+Enter) opens Home Assistant's detail dialog.** Gates and garage doors always open the dialog instead of moving on a single tap.
- **Summary at the top:** lights on, covers open, players playing.
- **36 designs, light and dark, the same as in Ambiframe** (every design also answers to its Ambiframe name: `design: ruhig` = `design: calm`; the fonts are Ambiframe's, shipped with the integration and loaded only when a design uses them; where an Ambiframe colour would not be readable on tiles it is moved and the move is written down in `docs/design-abgleich.md`). Among them: *Calm* (serif headings, warm), *Clear* (plain, sage), *Home* (bright tiles, Apple-Home style), twelve from Ambiframe (*Gold*, *Glass*, *Aurora*, *Editorial*, *Minimal*, *Clear text* with large high-contrast type, *Paper*, *E-Ink* without any animation, *Bauhaus*, *Soft UI*, *Swiss Grid*, *Rams*) and *Seasons*, which changes with the date: Christmas, New Year's Eve, Valentine's Day, Easter, Halloween, otherwise spring, summer, autumn or winter. Light/dark follows Home Assistant.
- **Make it yours:** a picture, colour or gradient behind the tiles (dimmed and blurred if you like), glass, outline or flat tiles, five colour palettes over any design (Nordic, Vampire, Mocha, Retro, Night city) and your own accent colour. Text contrast is checked for every combination.
- **Photos that take turns:** the pictures of a media-source folder (your own, Immich, Synology …) fade into each other behind the tiles, or free placeholder photos (Wikimedia picture of the day, NASA, public-domain paintings, Lorem Picsum, Bing) that Home Assistant fetches and serves itself; your devices never contact those sites, and one switch turns all fetching off.
- **A Studio in the sidebar:** a **setup assistant** with four steps (name and where it runs: inside Home Assistant or a wall tablet that fills the screen · contents: which areas and kinds of devices, and the layout · look · title and language) with Back/Next, and an **advanced mode** (switch in the step list, remembered on this device) that shows all options as editable JSON and as a YAML dashboard. Create dashboards, pick design, light/dark, colour palette and tile style, and watch every change in a live preview on your real data (phone, tablet or wide). Undo and redo, **Save** (Ctrl/⌘+S), **Last version** as a way back after a save, and one click puts a dashboard into the sidebar. The look page shows all designs as a **gallery** of small previews drawn in their own colours and fonts (light or dark as the dashboard uses it), and also sets your own **accent colour** and the **background**: none, a colour, a gradient, a picture, or photos (a media folder and/or free placeholder photos, with darkening, blur, interval and credit line). Open dashboards, also on wall tablets, follow a save at once. **Create from areas** turns your floors and areas into an own layout: a page per floor on a grid with 4 columns on a phone, 8 on a tablet and 12 on a wall display (what you did not place on a device follows the tablet layout). **Edit layout** opens the layout editor: drag tiles, headings and the summary around the grid, change their size with the corner, select several with Shift/⌘-click, move with the arrow keys (Shift resizes), duplicate (⌘D), delete, add devices with a search, add pages. Phone, tablet and wall display each get their own layout as soon as you change something on them. **Change** swaps the device of a tile (name, place and actions stay), and for each tile you choose what a **tap** and a **press and hold** do: the Ambidash pop-up, Home Assistant's own dialog, or nothing (a tap can also stay with the device: switch, play, activate). The **pop-up** has the controls of the device: brightness and colour temperature of a light, target temperature and mode of a thermostat, open/stop/close and position of a cover, track buttons and volume of a player, switch and scene; sliders act when you let go, and *More options* leads to Home Assistant's dialog. More steps follow: contents, the setup wizard.
- **Phone, tablet, browser, kiosk:** two columns on a phone, wider tiles on large screens, an optional full-screen mode for wall tablets (works in the HA app and Fully Kiosk, no kiosk plugin needed).
- **Accessible:** text contrast of every design is checked against WCAG AA, tiles are at least 72 px high, keyboard operable with a visible focus ring, "reduce motion" respected.
- **Languages:** English, German, Dutch, French (follows the HA user).

## Installation

1. Marketplace (*Settings → Marketplace*; with HACS: ⋮ → *Custom repositories*): add `https://github.com/diggi-85/ambidash` as a custom repository, type *Integration*.
2. Install **Ambidash** and restart Home Assistant.
3. *Settings → Devices & services → Add integration → Ambidash.*
4. Open **Ambidash** in the sidebar (the Studio, admins only): create a dashboard, shape it and put it into the sidebar with one click. Or by hand: *Settings → Dashboards → Add dashboard → Community dashboards → Ambidash*, and the options below in YAML.

Assign your devices to areas (and areas to floors) in Home Assistant; Ambidash shows exactly that.

## Options

In the dashboard's raw configuration editor (⋮ → Edit → ⋮ → Raw configuration editor):

```yaml
strategy:
  type: custom:ambidash
  design: home        # calm | clear | home | gold | glass | aurora | editorial | minimal | cleartext | paper | eink | bauhaus | softui | swiss | rams | seasons
  mode: auto          # auto (follows Home Assistant) | light | dark
  fullscreen: false   # true covers the whole window, e.g. for a wall tablet
  title: Home         # dashboard title (shown in full-screen mode)
  language: auto      # auto | en | de | nl | fr
  dashboard: kueche   # id of a dashboard saved in the Studio; what is written here wins over it
  pages: []           # own layout (the Studio makes it): pages with tiles, headings and a summary placed on a grid; left out, everything is shown automatically
  exit_path: /        # full-screen only: where the corner button leads (default /); false removes the button
  hide_domains: [switch]              # light | switch | climate | cover | media_player | scene
  hide_areas: [garage, "Guest room"]  # area id or name
  hide_entities: [light.hallway]      # single entities
  hide_unassigned: true               # devices without an area
  palette: nordic                     # nordic | vampire | mocha | retro | nightcity: colours over any design
  accent: "#ff6b35"                   # your own accent colour (hex or rgb()); wins over palette and background
  card_style: solid                   # solid (the design's own) | glass | outline | none; glass on a background by default
  background:
    image: /local/room.jpg            # /local/…, media-source://… or a web address
    shade: light                      # none | light | strong: darkens a picture so text stays readable
    blur: 6                           # px, 0 to 40
    color: "#102030"                  # a solid colour (also shows while the picture loads)
    gradient: ["#1a2a6c", "#fdbb2d"]  # two or more colours
    angle: 160                        # gradient direction in degrees
    folder: media-source://media_source/local/wallpaper  # pictures take turns, shuffled (image is the fallback)
    placeholder: nasa                 # wikimedia | art | nasa | picsum | bing: used without a folder, or mixed in with mix
    mix: false                        # mix placeholder photos in with your own
    interval: 10                      # minutes before the next picture (1 to 1440)
    credit: true                      # credit line of placeholder photos
```

Behind a picture or a colour the text, the active tiles and the accent follow the tone of the background (light text on pictures and dark colours, dark text on light colours); tiles become glass. With `shade: none` a very bright picture can make text hard to read. Use hex or `rgb()` colours so the tone can be judged.

**Photos.** `folder` takes a media-source address (`local` is the media folder of your Home Assistant, `/media` unless `media_dirs` says otherwise, so a folder `wallpaper` in it is `media-source://media_source/local/wallpaper`; the Media panel browses the same folders). It is read flat, without subfolders, and again every six hours. The picture changes every `interval` minutes, only while the page is visible, and fades unless you reduce motion or use E-Ink. `placeholder` photos are fetched by Home Assistant, cached on disk (not part of backups, at most 80 pictures) and served as `/ambidash_photos/…`; only fixed sources and their own hosts are contacted, and nothing is fetched until a dashboard asks for a placeholder. *Settings → Devices & services → Ambidash → Configure* has the switch **Allow fetching placeholder photos**; when it is off the dashboard shows its colour and Settings → Repairs says why. Credit lines show by default, because pictures of the day on Wikimedia can require attribution. Bing's interface is unofficial and its pictures are copyrighted: private use only. A shared iCloud or Google Photos album is not supported yet.

A palette or a picture replaces a design's own colours, tile fills and page art (the colour clouds of Glass, the grid of Swiss Grid); its shapes, fonts and type sizes stay. The `glass`, `outline` and `none` card styles replace a design's own tile look too (the offset shadows of Bauhaus, the top rule of Editorial). A single season also works as a design id (`christmas`, `newyear`, `valentine`, `easter`, `halloween`, `spring`, `summer`, `autumn`, `winter`). Christmas runs from 1 to 26 December.

In full-screen mode Home Assistant's own navigation is covered, so a small button in the corner leads back. On a wall tablet that should stay put, set `exit_path: false`. Hidden areas do not hide their scenes; use `hide_entities` or `hide_domains: [scene]` for those.

## Limits of the beta

- Entities that Home Assistant cannot place in an area (no unique ID) are not shown.
- Fonts are system fonts of a similar character (a book serif for Editorial and Paper, a rounded one for Soft UI …); the original fonts of Ambiframe's styles come with the design gallery. Ambiframe's animated page backgrounds (flowing colour, drifting shapes) are not part of the dashboard; they belong to the sleep mode.
- In the ported designs a few colours are a little different from Ambiframe where the original did not reach WCAG AA (the Bauhaus circles are translucent, Rams' orange and Summer's accent are darker in light mode, Swiss Grid's red is slightly darker).
- Tiles cannot be smaller than two by two cells; the layout editor does not move other items out of the way (a move that would overlap simply stops). Contents, the setup wizard and widgets as single cards come next.

## Development

```bash
cd frontend && npm ci && npm run typecheck && npm test && npm run build   # bundle → custom_components/ambidash/frontend/
python -m pytest                                                            # integration tests (see requirements_test.txt)
scripts/dev-ha.sh                                                           # local Home Assistant with demo devices
```

The built bundle is committed because HACS installs straight from the repository; CI fails when it is out of date.

## License

MIT.

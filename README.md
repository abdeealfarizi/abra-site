# ABRA website

> **This repository only contains the website for ABRA.** It is not the ABRA app.
> The app, its source code, issues and releases live in **[abdeealfarizi/abra](https://github.com/abdeealfarizi/abra)**.
>
> *Repositori ini hanya berisi website ABRA, bukan aplikasinya. Kode sumber, issue, dan rilis ABRA ada di [abdeealfarizi/abra](https://github.com/abdeealfarizi/abra).*

ABRA is a modern crystal desktop for Windows 11 (Deck, Visor, Rail, Quick Panel, Quick Search, Widgets). This site is where people download it and read the release notes.

- Download ABRA: the [Releases](https://github.com/abdeealfarizi/abra/releases) page of the app repository, or the buttons on the site.
- Report a bug or an idea about **ABRA**: [github.com/abdeealfarizi/abra/issues](https://github.com/abdeealfarizi/abra/issues).
- Report a problem with **this website** (typo, broken link, layout): open an issue here.

## What is in here

Plain HTML, CSS and JavaScript with no build step.

| Path | What it does |
|---|---|
| `index.html` | Landing page: scroll story with a live mock-up of ABRA, real screenshots, privacy, install guide, latest release notes, donate. |
| `releases.html` | Every release with notes and downloads. |
| `assets/js/github.js` | Reads the releases of the app repository from the GitHub API and fills in versions, download links, file sizes and notes. Falls back to `releases/latest` if the API is unreachable. |
| `assets/js/i18n.js` | English and Indonesian text. |
| `assets/js/site.js` | Theme (Light, Auto, Dark), accent colors and the Visor download animation. |
| `assets/js/page.js` | The scroll story and the demo. |
| `assets/css/site.css` | All styling. |
| `assets/img/` | Screenshots and icons. |
| `assets/fonts/` | Inter, with its license. |

The release notes are rendered from the GitHub release body as Markdown, using `marked` and `DOMPurify` loaded from jsDelivr. The installer must be named `ABRA-Setup-<version>.exe` and the portable build `ABRA-<version>-win-x64.zip` for the download buttons to find them.

## Run locally

```bash
python -m http.server 5178
```

Then open http://localhost:5178.

## Deploy

Hosted on GitHub Pages: *Settings → Pages → Deploy from a branch → `main` / root*. If the site is served from a different address than `https://abdeealfarizi.github.io/abra-site/`, update `og:image` in both HTML files.

## Credits

- Website and ABRA by [kreativa.dev](https://saweria.co/kreativadev). ABRA is licensed under the PolyForm Noncommercial License 1.0.0; see the [app repository](https://github.com/abdeealfarizi/abra).
- Inter font by Rasmus Andersson, SIL Open Font License 1.1 (`assets/fonts/Inter-LICENSE.txt`).
- ABRA is an independent, fan-made project. It is not affiliated with, endorsed by or sponsored by Apple Inc.

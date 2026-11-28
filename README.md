# Stones Fan Hub

An unofficial fan site for The Rolling Stones, built with plain HTML, CSS and JavaScript. It has no frameworks, no build step and no dependencies.

**Live site:** https://jeremysrice.github.io/aim-w4d3-portfolio/

## Pages

| Page | What's on it | Interactive feature |
|---|---|---|
| [`index.html`](index.html) | Hero, short band history, quick facts and line-up | **Hard trivia challenge:** 10 random questions from a pool of 16, a 20-second timer (or an untimed relaxed mode), a speed bonus and a top-10 leaderboard |
| [`albums.html`](albums.html) | All 24 UK studio albums (1964–2023) with cover art, key tracks, descriptions and links, plus search and an era filter | **Name That Song:** guess the song from a one-line clue, then hear it in an official YouTube embed. Includes streak bonuses and a saved best score. |
| [`toursandconcerts.html`](toursandconcerts.html) | 31 major tours, 11 landmark shows and an upcoming-dates tab | **First-show memories wall:** a timeline grouped by decade with likes and an optional photo upload that is automatically screened for nudity<br>**First Show Photos:** expandable thumbnails of those photos<br>**Fan gallery:** photo, fan-art and tattoo posts (the image is optional; text-only posts need a caption). Images are automatically screened for nudity, and every post is held in a moderation queue. |
| [`404.html`](404.html) | Custom "page not found" page | Suggests the page you probably meant |

## Site-wide features

- **Responsive navigation:** collapses into a hamburger menu at 760px and below, and highlights the current page.
- **Dark/light theme toggle:** dark is the default. Light mode is high-contrast gray, blue and the tongue-logo red. The choice is saved in `localStorage`, stays the same across pages and syncs between open tabs.
- **Page transitions:** uses the browser's built-in cross-page View Transitions where supported, with a JavaScript fade fallback elsewhere.
- **Breadcrumbs, back-to-top button and footer links:** the footer links are generated automatically from the header nav.
- **Accessibility:** audited against WCAG 2.2 AA with axe-core (no failures in either theme). Includes a skip link, contrast-checked colours, keyboard-operable tabs, games and gallery, focus that follows the games, visible focus styles, 24px minimum tap targets, an untimed trivia mode, ARIA labels and support for `prefers-reduced-motion`.

## Project structure

```
.
├── index.html                Home
├── albums.html               Albums + song game
├── toursandconcerts.html     Tours, memories wall, fan gallery
├── 404.html                  Custom 404 (served automatically by GitHub Pages)
├── css/styles.css            All styles, with theme colours as CSS custom properties
├── js/main.js                All JavaScript, split into commented sections per feature
└── images/tongue-logo.svg    Logo used in the header, hero, footer, 404 page and tab icon
```

## Running locally

Serve the folder with any static server rather than opening the files directly, because YouTube embeds need a real `http://` origin:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

`404.html` uses absolute `/aim-w4d3-portfolio/...` paths so it works for any missing URL on GitHub Pages. As a result, it only looks right when deployed. If you rename the repo, update those paths.

## Editing content

Site data lives in arrays near the top of each section in [`js/main.js`](js/main.js):

| To change… | Edit |
|---|---|
| Trivia questions | `TRIVIA` |
| Albums and track lists | `ALBUMS` (cover art: `COVER_IDS`, MusicBrainz release-group IDs) |
| Song-game songs | `SONGS` (each needs an official YouTube video ID) |
| Tours and landmark shows | `TOURS`, `LANDMARKS` |
| Upcoming dates | `UPCOMING`. Add `{ date: "YYYY-MM-DD", venue: "...", tour: "..." }`; past dates drop off automatically |
| Nav pages | The `<ul id="nav-links">` in each HTML file. The footer links update to match. |

## Limitations

- **Visitor content is stored per browser only.** The leaderboard, memories, likes and gallery submissions use `localStorage`. First-show photos, resized to at most 1600px with a 480px thumbnail, are stored in IndexedDB. Either way, visitors don't see each other's posts. A real community site would need a backend and database.
- **Photo screening is a first line of defence, not a guarantee.** First-show photos and fan-gallery uploads are checked in the browser by [NSFWJS](https://github.com/infinitered/nsfwjs), an open-source classifier running on TensorFlow.js, loaded from jsDelivr at pinned versions with integrity hashes. It's roughly 90% accurate, so expect occasional false positives and misses. Because it runs on the visitor's device, it can also be bypassed. A public site that shares uploads would need server-side screening and human moderation. If the screener can't load, photo uploads are blocked rather than allowed through. Thresholds are `SCREEN_EXPLICIT_MAX` and `SCREEN_SEXY_MAX` in `js/main.js`.
- **Moderation is a demo only.** The moderator passcode is in `js/main.js`, which anyone can read. Real moderation must happen on a server.
- **Gallery capacity is limited.** Uploaded images are resized to 900px JPEGs, but browser storage (about 5 MB) still caps the gallery at a few dozen images.

## Credits and disclaimer

This is an unofficial, non-commercial fan project. It is not affiliated with or endorsed by The Rolling Stones, their management or their labels.

- **Music** plays through official YouTube embeds published by the rights holders (ABKCO, The Rolling Stones and their VEVO and "Topic" channels).
- **Album covers** load from the [Cover Art Archive](https://coverartarchive.org/) / [MusicBrainz](https://musicbrainz.org/). Covers are © their respective owners and are shown for identification.
- **The tongue and lips logo** (John Pasche, 1970) is a trademark of Musidor B.V. and is used here for identification only.
- **Album, tour and trivia facts** were compiled from public sources, including Wikipedia. Corrections are welcome via issues or pull requests.

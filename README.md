# WiresHQ

**From the wire to the full story.** WiresHQ is a fast news site for readers who arrive from search and short video. Each story page is the full story behind the video.

It is a zero-dependency static site. One Node.js file (`build.js`) turns the files in `stories/` and `pages/` into plain HTML in `dist/`. One hand-written `style.css` styles everything. There are no frameworks, no npm packages and no build tools.

## Project layout

    build.js            the site generator (run with: node build.js)
    serve.js            local preview server (run with: node serve.js)
    style.css           the one stylesheet (light and dark themes, English and Arabic)
    config.json         site settings
    wrangler.jsonc      Cloudflare Workers settings
    package.json        project name and scripts
    stories/            one .txt file per story
    pages/              About, Contact, Privacy, Editorial policy (pages/ar/ for Arabic)
    fonts/              self-hosted fonts (see "Fonts")
    static/             files copied as-is into the root of dist/ (see "Static files")
    design/             social and video templates (never deployed)
    dist/               generated output (never edit, never commit)

## Preview locally

Needs Node 18 or newer.

    node build.js       # builds into dist/ and prints any warnings
    node serve.js       # open http://localhost:8788

Open the site through `serve.js`, not by double-clicking `dist/index.html`. The site uses absolute paths such as `/style.css`, which only work from a server. `npm run preview` does both steps.

## Add a story

Create a `.txt` file in `stories/`. Header lines first, then a line with `---`, then the body:

    title: League confirms the final will be played on 14 June
    slug: league-final-date
    category: Sports
    labels: football, league
    keywords: league final, 14 June
    image: https://example.com/final.jpg
    focus: 50 25
    credit: Photo: Example Agency
    date: 2026-10-06 19:40
    updated: 2026-10-06 21:05
    video: https://www.youtube.com/shorts/VIDEO_ID
    ---
    First paragraph. It becomes the summary on cards and in search results.

    Blank line = new paragraph.

| Line | Required | What it does |
|---|---|---|
| `title` | yes | Headline. |
| `slug` | no | The link: `yoursite.com/league-final-date/`. Defaults to the title. |
| `category` | yes | One of the five: Sports, Entertainment, Celebrity, Tech & AI, Economy & Finance. Short forms such as `tech` or `finance` and the Arabic names also work. A story with an unknown category is skipped, and the build says so. |
| `labels` | no | Comma-separated tags. They drive "Related stories" and the label pages. |
| `keywords` | no | SEO keywords. Defaults to the labels. |
| `image` | no | Full URL, or a path such as `/og/league-final-date.png` for a file in `static/`. Use 1280 × 720 (16:9). |
| `focus` | no | `x y` in percent: where the important part of the image is. Default `50 40`. |
| `credit` | no | Photo credit, shown under the story image. |
| `date` | no, but always set it | `2026-10-06` or `2026-10-06 19:40`. Without it the file date is used, which changes on every deploy. Times use the `timezone` in `config.json`. |
| `updated` | no | Shows an "Updated" time in the story header. |
| `correction` | no | Written as `6 Oct 2026 | What was wrong and what was fixed.` (a plain pipe, no backslash). Shows a correction note above the text. |
| `video` | no | A YouTube link (watch, youtu.be or Shorts). Embeds it after the first paragraph. |
| `lang` | no | `en` or `ar`. Defaults to `lang` in `config.json`. Arabic stories live under `/ar/`. |

### Control labels

These four labels are never shown to readers and get no label pages:

| Label | Effect |
|---|---|
| `lead` | The newest story with this label is the big story on the home page. |
| `trending` | Puts the story first in the "Trending now" list. |
| `breaking` | Adds the story to the ticker for 48 hours and puts a "Breaking" badge on its image. |
| `live` | Same as `breaking`, with a "Live" badge. |

The ticker only changes when the site is rebuilt. Stories older than 48 hours leave it at the next deploy.

### Body formatting

| Write this | You get |
|---|---|
| `## Heading` or `### Heading` | A subheading. |
| `**bold**` | Bold. |
| `[text](https://example.com)` | A link. |
| `> Quote text -- Name` | A pull quote with the name below it. |
| Lines starting with `- ` | A bullet list. |
| Lines starting with `1. `, `2. ` | A numbered list. |
| `Table: Caption` then rows like `\| A \| B \|` | A table. The first row is the header. A `\|---\|---\|` row is allowed and ignored. Number columns align right. |

An ad appears after the second paragraph when ads are on, so a story needs at least two paragraphs to carry one.

## Arabic edition

The English site is at `/` and the Arabic site is at `/ar/`. The Arabic site has its own home, category, label, search and 404 pages. Add `lang: ar` to a story to publish it in Arabic. Arabic pages are right-to-left automatically. Digits stay 0–9. In `pages/*.html`, wrap Latin names inside Arabic text in `<bdi>`. In stories, write the name plainly.

## Pages

`pages/about.html` becomes `/about/`. `pages/ar/about.html` becomes `/ar/about/`. Each file has four header lines, then `---`, then HTML:

    title: About WiresHQ
    description: One sentence for search results.
    intro: One line under the title.
    updated: 2026-10-06
    ---
    <p>Page text.</p>

`{{publisher}}` and `{{email}}` are replaced from `config.json`. If an Arabic page does not exist, the Arabic footer links to the English one.

## Settings (`config.json`)

| Key | Meaning |
|---|---|
| `siteName` | Always `WiresHQ`. |
| `tagline`, `taglineAr` | Shown in the page title and footer. |
| `taglineShort` | The short tagline for your own use (bios, video end cards). |
| `description`, `descriptionAr` | The search and social description of the home page. Keep under 155 characters. |
| `siteUrl` | Your real domain with `https://` and no trailing slash. Used for canonical links, the sitemap and structured data. |
| `lang` | Default language for stories with no `lang` line: `en` or `ar`. |
| `timezone` | Offset for story times, for example `+00:00` or `+03:00`. |
| `publisher` | The legal name of whoever publishes the site. Used in `{{publisher}}`. |
| `email` | The newsroom address. Used in `{{email}}`. |
| `themeColor` | Browser bar colors for light and dark. |
| `social` | Full URLs of your accounts. Filled ones go into the Organization structured data, and the `x` one sets the X card handle. |
| `adsenseClient`, `adSlot`, `adSlots` | See "Ads". |

## Fonts

Two free fonts, both SIL OFL 1.1: Nunito (Latin) and Noto Sans Arabic. Download once into `fonts/`:

    mkdir -p fonts
    curl -L -o fonts/nunito-latin-wght.woff2 https://cdn.jsdelivr.net/fontsource/fonts/nunito:vf@5.3.0/latin-wght-normal.woff2
    curl -L -o fonts/nunito-latin-ext-wght.woff2 https://cdn.jsdelivr.net/fontsource/fonts/nunito:vf@5.3.0/latin-ext-wght-normal.woff2
    curl -L -o fonts/noto-sans-arabic-arabic-wght.woff2 https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-arabic:vf@5.3.0/arabic-wght-normal.woff2

Keep each family's `OFL.txt` in `fonts/`. Without the files the site still works with system fonts.

## Static files

Everything in `static/` is copied into the root of `dist/`. The build warns if one of these is missing:

| File | Source |
|---|---|
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | The logo files in the brand guide (Part 1, section 2.5). |
| `og-default.png`, `og-sports.png`, `og-entertainment.png`, `og-celebrity.png`, `og-tech-ai.png`, `og-economy-finance.png` | The 1200 × 630 share images from `design/social-templates.html`. A story with no image uses the one for its category, then `og-default.png`. |
| `site.webmanifest` | Included. |
| `_headers` | Included: security headers and long caching for fonts, the stylesheet and icons. |

To give one story its own share image, export it to `static/og/<slug>.png` and add `image: /og/<slug>.png` to the story.

## Deploy on Cloudflare (Workers with static assets)

1. Put this folder in a GitHub repository. `dist/` stays out of it (see `.gitignore`).
2. In Cloudflare, go to Workers & Pages, create a Worker from the repository, and name it `wireshq`. The name must match `name` in `wrangler.jsonc`.
3. Build command: `node build.js`. Deploy command: `npx wrangler deploy`.
4. Every push to GitHub rebuilds and deploys the site.
5. Add your domain under the Worker's Settings, Domains & Routes, then set `siteUrl` in `config.json` to it.

`wrangler.jsonc` sets `not_found_handling` to `404-page`, so unknown links show the WiresHQ 404 page, and unknown `/ar/` links show the Arabic one.

## Ads

1. Publish real About, Contact, Privacy and Editorial pages before you apply to AdSense, and publish a steady set of original stories.
2. After approval, put your publisher ID in `adsenseClient` (like `ca-pub-1234567890123456`). This adds the AdSense script and an `ads.txt` file.
3. Create display ad units in AdSense and put the number of one in `adSlot`. It is used for every position. To use a different unit per position, fill `adSlots` with `article`, `grid` and `side`. Use standard display units, not "fluid" units, because their height cannot be reserved.

Ads appear in these places only, each with an "Advertisement" label and reserved space:

| Page | Ads |
|---|---|
| Home | After the 6th card of Entertainment and of Tech & AI, when the section has 6 cards |
| Category, Label | After the 6th and 18th card, plus one in the sidebar |
| Story | After the 2nd paragraph, plus one in the sidebar |

About, Contact, Privacy, Editorial, Search and 404 never carry ads.

## Linking from videos

Links in YouTube Shorts descriptions are not clickable. Use your channel links and bio, and show the short address (`wireshq.com/slug`) on screen.

## Build warnings

`node build.js` prints a warning, and skips the story, when a category is unknown, a slug is reserved (`c`, `label`, `search`, `ar`, `fonts`, or the name of a page) or repeated. It warns, and carries on, when a date cannot be read, a video link is not YouTube, or a file from the lists above is missing.

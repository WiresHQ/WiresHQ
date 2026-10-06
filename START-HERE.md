# START HERE: put WiresHQ online for $0

Everything is already assembled in this folder. Do the steps in order. Each one says how you know it worked.

## Step 1. Install Node.js (free)
Go to https://nodejs.org, download the **LTS** version, install it with the default options.
Check: open a terminal in this folder (Windows: open the folder, click the address bar, type `cmd`, press Enter) and run `node -v`. It should print v18 or higher.

## Step 2. Download the fonts (free)
    node get-fonts.js
Check: it prints `OK` three times and the `fonts/` folder has three .woff2 files.

## Step 3. Edit `config.json` (open it in Notepad)
- `publisher`: your name or business name (it appears on the Privacy and About pages).
- `email`: an address you really read. `newsroom@wireshq.com` only works if you own the domain, so use a free Gmail/Proton address for now.
- `timezone`: your offset from UTC, for example Egypt is `+03:00` (check, it can change with summer time).
- Leave `siteUrl` for Step 7.
Keep the quotes and commas exactly as they are.

## Step 4. Preview on your computer
    node build.js
    node serve.js
Open http://localhost:8788. Check: the site loads, the header shows the WiresHQ logo, the language link switches to Arabic. With no stories the home page is empty. That is normal.

## Step 5. Write your first story
Copy `stories/_how-to-write-a-story.txt.example` to `stories/my-first-story.txt`, edit it, then run `node build.js` again and refresh the browser. Always include a `date:` line.

## Step 6. Put the folder on GitHub (free)
1. Create a free account at https://github.com and click New repository (name it `wireshq`, Private is fine).
2. Click "uploading an existing file", drag in **everything inside this folder** (not the folder itself), then Commit.
Check: you see `build.js`, `style.css`, `stories/` and so on in the repository.

## Step 7. Deploy on Cloudflare (free plan)
1. Create a free account at https://dash.cloudflare.com.
2. Workers & Pages, Create, choose Import a repository, connect GitHub, pick `wireshq`.
3. Worker name: `wireshq` (must match `wrangler.jsonc`). Build command: `node build.js`. Deploy command: `npx wrangler deploy`.
4. Deploy. Cloudflare gives you a free address like `https://wireshq.YOURNAME.workers.dev`.
5. Put that exact address (no slash at the end) into `siteUrl` in `config.json`, and upload the changed file to GitHub. It redeploys by itself.
Check: the address opens your site, `/sitemap.xml` and `/robots.txt` open, and a nonsense address shows the WiresHQ 404 page.

## Step 8. Every day
Add a new .txt file to `stories/` on GitHub (Add file, Create new file). A minute later it is live.

## What is NOT free, and what to do before AdSense
- **Your own domain (wireshq.com)** costs money (roughly $10 a year). The free `workers.dev` address works fine to start. As far as I know AdSense wants a domain you own, so buy one only when you are ready for ads. Then add it in Cloudflare under Domains & Routes and update `siteUrl`.
- **Before applying to AdSense:** have real About, Contact, Privacy and Editorial pages, a steady run of original stories, and read Part 7, section 9.4. Make sure the Privacy Policy only says things that are true for your site (it is a template, not legal advice).
- Check the current free-plan limits on Cloudflare and GitHub yourself before relying on them.

## Placeholders you can improve later
- The six share images in `static/og-*.png` were exported without the Nunito font, so they use a plain system font. They work. For the exact brand look, re-export them with `design/social-templates.html` after Step 2 (instructions are at the top of that page).

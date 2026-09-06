# Puppy Video Submissions

A tiny static site: a consent form, then a link out to a Dropbox **File
Request** where visitors drop their video. No database, no backend, no API
keys — just this static site.

## How it works

1. **`index.html` / `style.css` / `script.js`** — the page itself. Step 1 is
   a consent form (name, email, puppy name, agreement checkbox). Step 2 is
   an "Attach puppy video" link that opens your Dropbox File Request in a
   new tab, where the visitor actually uploads their video straight to
   Dropbox.
2. **Netlify Forms** captures every consent submission automatically
   (name, email, puppy name, timestamp) — no code needed for that part,
   it's a native Netlify feature triggered by the `data-netlify="true"`
   attribute on the form. View submissions under your site's **Forms** tab
   in Netlify.
3. **Dropbox File Request** is a plain Dropbox feature (Settings →
   uploaded files land in a folder you choose) — no Dropbox app, no API
   keys, no tokens to manage. Anyone with the link can add files to that
   folder, but can't see or download what's already there.

The flow on the page: visitor fills in the consent form → clicks "Attach
puppy video" (this is blocked until the required fields and the consent
checkbox are filled in) → their consent record is logged to Netlify Forms
and the Dropbox File Request opens in a new tab → they upload their video
on Dropbox's own page → they come back and click the "Submit" button that
appears, which shows the thank-you page.

## Setup

### 1. Create your Dropbox File Request (if you haven't already)

1. In Dropbox, go to **File requests** → **New file request**.
2. Name it something like `Lucky puppy videos` and pick (or create) the
   Dropbox folder submissions should land in.
3. Copy the link Dropbox gives you.

The link currently wired into the site is:
```
https://www.dropbox.com/request/nzrf2oggppe2v2twlgoz
```
If you ever create a new File Request (e.g. the old one fills up or
expires), just replace that URL in one place: the `href` on the
`id="attach-label"` link in `index.html`.

### 2. Push to GitHub, deploy on Netlify

1. Push this folder to a new GitHub repo.
2. In Netlify: **Add new site → Import an existing project**, pick the
   repo. Build command: leave blank. Publish directory: `.` (already set
   in `netlify.toml`).
3. Trigger a deploy (or it'll deploy automatically on push). Netlify Forms
   needs to see the form in the built HTML to register it — the first
   deploy after pushing this code takes care of that automatically.

There are no environment variables or serverless functions to set up —
that's the whole point of this simpler version.

### 3. Images and copy

All the visible text is already filled in to match your approved mockups
(the hero, the consent wording, the thank-you copy) — the spots marked
`<!-- EDIT COPY HERE -->` in `index.html` are just there for if that
wording ever changes later.

The images live in the `images/` folder and are referenced by name, so
swapping any of them later is just replacing the file with the same name:

| File | Used for |
|---|---|
| `images/gray-texture.jpg` | full-page background photo |
| `images/dog1.png` | hero, right-hand puppy photo |
| `images/dog2.png` | hero, left-hand puppy photo |
| `images/dog3.png` | form section puppy photo |
| `images/lucky.png` | "LUCKY" title graphic |
| `images/thanks.png` | "THANKS" title graphic |
| `images/button_submitpuppyvideo.png` | hero button |
| `images/button_attachpuppyvideo.png` | form section attach button, links to your Dropbox File Request |
| `images/button_submit.png` | final confirm button, shown after the visitor comes back from Dropbox |

### 4. Test it

- You can open `index.html` directly in a browser to check the layout and
  styling, but the consent-form submission (Netlify Forms) only actually
  works once the site is deployed on Netlify — there's no server behind
  it when opened as a local file.
- Once deployed: fill in the form, click "Attach puppy video" and confirm
  it opens your Dropbox File Request in a new tab, then click "Submit" and
  confirm the thank-you page appears.
- Submit the consent form once and check **Forms** in your Netlify
  dashboard for the entry.

## Things worth knowing

- **Storage.** Videos land in your own Dropbox, so your Dropbox plan's
  storage limit is what caps you — Dropbox Basic (free) is 2GB total,
  which fills up fast with video. Worth checking your quota if you expect
  more than a handful of submissions.
- **Netlify Forms free tier** caps at 100 submissions/month. If this goes
  wider than that, either upgrade Netlify's forms add-on or let me know
  and I can swap the consent capture to something with more headroom.
- **The consent record and the video aren't automatically linked.** Since
  the video goes straight to Dropbox via the File Request and the consent
  form goes to Netlify separately, matching a submitted video back to its
  consent-form entry means comparing filenames/timestamps by hand (or
  asking submitters to name their file after themselves before uploading).
- **Anyone with the File Request link can upload** — they can't see or
  download existing files, only add new ones, so this is low-risk, but if
  the link ever gets shared somewhere unexpected you can disable or
  replace it from Dropbox's **File requests** page at any time.

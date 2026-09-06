# Puppy Video Submissions

A tiny static site: a consent form, then a drag-and-drop video uploader that
sends files straight into a dedicated folder in your Dropbox. No database,
no traditional backend — just this static site plus one small serverless
function that Netlify runs for you.

## How it works

1. **`index.html` / `style.css` / `script.js`** — the page itself. Step 1 is
   a consent form (name, email, agreement checkbox). Step 2 is a file
   upload that sends the video directly from the visitor's browser to the
   Dropbox API.
2. **Netlify Forms** captures every consent submission automatically
   (name, email, timestamp) — no code needed for that part, it's a native
   Netlify feature triggered by the `data-netlify="true"` attribute on the
   form. View submissions under your site's **Forms** tab in Netlify.
3. **`netlify/functions/get-token.js`** — a small serverless function that
   is the *only* place your Dropbox app secret lives. Dropbox access
   tokens expire after about 4 hours, so the page calls this function
   right before each upload to get a fresh one. Your secret never reaches
   the browser.

## ⚠️ Before you go live, understand the tradeoff

Because the upload happens directly from the browser to Dropbox (so it can
handle large video files without going through Netlify's function size
limits), the short-lived access token is visible in the browser while an
upload is happening. That token is scoped to an **App folder** — a
dedicated folder Dropbox creates just for this app — so even in the worst
case, someone couldn't touch the rest of your Dropbox, only spam that one
folder. If that ever happens, revoke/rotate the refresh token in the
Dropbox App Console and the old token stops working immediately.

If you'd rather have zero exposure at all, the safer (but less seamless)
alternative is a page that links out to a Dropbox **File Request** instead
of embedding the uploader — happy to build that version instead if you
change your mind.

## Setup

### 1. Create a Dropbox app

1. Go to [dropbox.com/developers/apps/create](https://www.dropbox.com/developers/apps/create).
2. API: **Scoped access**. Access type: **App folder** (this is what limits
   the blast radius described above). Give it a unique name, e.g.
   `puppy-video-submissions-yourname`.
3. Open the new app, go to the **Permissions** tab, check
   **`files.content.write`**, then click **Submit** at the bottom of that
   tab. You don't need any read permissions.
4. On the **Settings** tab, note your **App key** and **App secret** —
   you'll need both in step 3 below. Keep the secret private; never commit
   it to GitHub.

### 2. Get a refresh token (one-time, done manually on your own machine)

Dropbox's "generate access token" button gives you a token that dies in
about 4 hours, which isn't useful for a site that stays up for weeks. A
**refresh token** doesn't expire, and the site trades it for a fresh
access token whenever it needs one. Get yours once:

1. Visit this URL in your browser (replace `YOUR_APP_KEY`):
   ```
   https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&response_type=code&token_access_type=offline
   ```
2. Click **Allow**. Dropbox shows you an authorization code — copy it.
3. Exchange it for a refresh token (run this in a terminal, filling in your
   own values):
   ```bash
   curl https://api.dropboxapi.com/oauth2/token \
     -d code=YOUR_AUTH_CODE \
     -d grant_type=authorization_code \
     -d client_id=YOUR_APP_KEY \
     -d client_secret=YOUR_APP_SECRET
   ```
4. The response is JSON containing a `refresh_token` field. Save that
   value — that's the one that goes in Netlify. You can ignore the
   `access_token` in that response; it's just the first (already-expiring)
   one and the site will fetch its own going forward.

### 3. Push to GitHub, deploy on Netlify

1. Push this folder to a new GitHub repo.
2. In Netlify: **Add new site → Import an existing project**, pick the
   repo. Build command: leave blank. Publish directory: `.` (already set
   in `netlify.toml`, along with the functions folder, so defaults should
   just work).
3. Once the site exists, go to **Site configuration → Environment
   variables** and add three:
   - `DROPBOX_APP_KEY`
   - `DROPBOX_APP_SECRET`
   - `DROPBOX_REFRESH_TOKEN`
4. Trigger a deploy (or it'll deploy automatically on push). Netlify Forms
   needs to see the form in the built HTML to register it — the first
   deploy after pushing this code takes care of that automatically.

### 4. Images and copy

All the visible text is already filled in to match your approved mockups
(the hero, the consent wording, the thank-you copy) — the spots marked
`<!-- EDIT ME -->` in `index.html` are just there for if that wording
ever changes later.

The images live in the `images/` folder and are referenced by name, so
swapping any of them later is just replacing the file with the same name:

| File | Used for |
|---|---|
| `images/dog1.png` | hero, right-hand puppy photo |
| `images/dog2.png` | hero, left-hand puppy photo |
| `images/dog3.png` | form section puppy photo |
| `images/lucky.png` | "LUCKY" title graphic |
| `images/thanks.png` | "THANKS" title graphic |
| `images/button_submitpuppyvideo.png` | hero button |
| `images/button_attachpuppyvideo.png` | form section attach button |
| `images/button_submit.png` | final confirm button, shown after upload |

**Still pending:** the page background is currently a plain CSS-generated
paper texture standing in for `gray-texture.jpg`, which hasn't been added
yet. Once you send that file over, it drops into `images/` and one line
in `style.css` (the `body { background-image: ... }` rule) points to it
instead.

### 5. Test it

- `netlify dev` (install with `npm install -g netlify-cli`, run from this
  folder after `netlify link`) runs the site *and* the function locally,
  so you can test a full upload before going live. Opening `index.html`
  directly in a browser won't work — the consent form and the token
  function both need Netlify's server behind them.
- Submit the consent form once and check **Forms** in your Netlify
  dashboard for the entry.
- Upload a short test video and confirm it lands in your Dropbox app
  folder (**Dropbox → Apps → [your app name]**).

## Things worth knowing

- **Storage.** Videos land in your own Dropbox, so your Dropbox plan's
  storage limit is what caps you — Dropbox Basic (free) is 2GB total,
  which fills up fast with video. Worth checking your quota if you expect
  more than a handful of submissions.
- **Netlify Forms free tier** caps at 100 submissions/month. If this goes
  wider than that, either upgrade Netlify's forms add-on or let me know
  and I can swap the consent capture to something with more headroom.
- **Filenames** are auto-prefixed with the submitter's name and a
  timestamp (e.g. `Jane-Doe_1735689000000_mypuppy.mp4`), so you can match
  a video back to its consent-form entry by timestamp if you ever need to.

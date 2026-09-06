/* ---------------------------------------------------------------
   Mints a short-lived Dropbox access token on demand.

   Why this exists: Dropbox access tokens generated from the App
   Console expire after ~4 hours. A pure static site can't hold a
   token that keeps working, and it must NEVER hold your app
   secret (that would let anyone impersonate your app). This tiny
   serverless function is the one place the secret lives — as
   Netlify environment variables, never shipped to the browser —
   and it trades a long-lived "refresh token" for a fresh 4-hour
   access token every time the page needs one.

   Required Netlify environment variables (Site settings ->
   Environment variables), see README.md for how to obtain them:
     DROPBOX_APP_KEY
     DROPBOX_APP_SECRET
     DROPBOX_REFRESH_TOKEN
------------------------------------------------------------------ */

export default async () => {
  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN } = process.env;

  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET || !DROPBOX_REFRESH_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Server is missing Dropbox environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const basicAuth = Buffer.from(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`).toString("base64");

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: DROPBOX_REFRESH_TOKEN,
  });

  const dropboxRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!dropboxRes.ok) {
    const text = await dropboxRes.text();
    return new Response(
      JSON.stringify({ error: "Failed to refresh Dropbox token", detail: text }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await dropboxRes.json();

  return new Response(
    JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

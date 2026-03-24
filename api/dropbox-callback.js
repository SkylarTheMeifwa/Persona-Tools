import fetch from "node-fetch";

function parseCookieMap(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split("=");
      if (!key) return acc;
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

export default async function handler(req, res) {
  const { code, state } = req.query;

  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("Missing Dropbox OAuth configuration.");
  }

  if (!code) {
    return res.redirect("/pages/settings.html?dropbox_error=missing_code");
  }

  const cookies = parseCookieMap(req.headers.cookie || "");
  const expectedState = cookies.dropbox_oauth_state;

  if (!state || !expectedState || state !== expectedState) {
    return res.redirect("/pages/settings.html?dropbox_error=state_mismatch");
  }

  const redirectUri = "https://persona-tools.vercel.app/api/dropbox-callback";

  try {
    const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json();

    if (!data.access_token) {
      const isCodeReuse = data.error === "invalid_grant";
      const reason = isCodeReuse ? "code_used" : "token_exchange_failed";
      return res.redirect(`/pages/settings.html?dropbox_error=${reason}`);
    }

    res.setHeader(
      "Set-Cookie",
      "dropbox_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );

    return res.redirect(
      `/pages/settings.html?dropbox_token=${encodeURIComponent(data.access_token)}`
    );
  } catch (_) {
    return res.redirect("/pages/settings.html?dropbox_error=network_failure");
  }
}

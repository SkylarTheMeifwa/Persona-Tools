import crypto from "crypto";

export default function handler(req, res) {
  const clientId = process.env.DROPBOX_APP_KEY;
  if (!clientId) {
    return res.status(500).send("Missing DROPBOX_APP_KEY");
  }

  const redirectUri = "https://persona-tools.vercel.app/api/dropbox-callback";
  const state = crypto.randomBytes(16).toString("hex");

  res.setHeader(
    "Set-Cookie",
    `dropbox_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const authUrl =
    "https://www.dropbox.com/oauth2/authorize" +
    `?client_id=${clientId}` +
    "&response_type=code" +
    "&token_access_type=offline" +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(authUrl);
}

export default function handler(req, res) {
  const clientId = process.env.DROPBOX_APP_KEY;
  const redirectUri = "https://persona-tools.vercel.app/api/dropbox-callback";

  const authUrl =
    "https://www.dropbox.com/oauth2/authorize" +
    `?client_id=${clientId}` +
    "&response_type=code" +
    "&token_access_type=offline" +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(authUrl);
}
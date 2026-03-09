import fetch from "node-fetch";

export default async function handler(req, res) {
  const { code } = req.query;

  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;

  const redirectUri =
    "https://persona-tools.vercel.app/api/dropbox-callback";

  const tokenRes = await fetch(
    "https://api.dropboxapi.com/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    }
  );

  const data = await tokenRes.json();

  if (!data.access_token) {
    return res.status(500).json(data);
  }

  res.setHeader(
    "Set-Cookie",
    `userToken=${data.access_token}; Path=/; Secure; SameSite=Lax`
  );

  res.redirect("/");
}
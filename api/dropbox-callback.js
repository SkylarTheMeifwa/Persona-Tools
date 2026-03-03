import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("No code provided");
  }

  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;
  const redirectUri = "https://persona-tools.vercel.app/api/dropbox-callback";

  const params = new URLSearchParams();
  params.append("code", code);
  params.append("grant_type", "authorization_code");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("redirect_uri", redirectUri);

  try {
    const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      body: params
    });

    const data = await tokenRes.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    // ⚠️ Save these tokens in a database linked to the user
    console.log("Dropbox tokens:", data);

    // For now, just confirm success
    res.send("Dropbox connected successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error exchanging code for token");
  }
}

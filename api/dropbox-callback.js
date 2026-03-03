export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("No code provided");

    const clientId = process.env.DROPBOX_APP_KEY;
    const clientSecret = process.env.DROPBOX_APP_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).send("Missing Dropbox credentials");
    }

    const redirectUri = "https://persona-tools.vercel.app/api/dropbox-callback";

    const params = new URLSearchParams();
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("redirect_uri", redirectUri);

    const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      body: params
    });

    const data = await tokenRes.json();

    if (data.error) return res.status(400).json(data);

    // ⚠️ TODO: Store tokens in a database
    console.log("Dropbox tokens:", data);

    res.send("Dropbox connected successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Serverless function error");
  }
}
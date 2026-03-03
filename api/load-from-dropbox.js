export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const { userToken } = req.body;
    if (!userToken) return res.status(400).send("Missing user token");

    const response = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path: "/cashflow.json" })
      }
    });

    if (!response.ok) {
      return res.status(response.status).send("Error fetching from Dropbox");
    }

    const text = await response.text();
    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}
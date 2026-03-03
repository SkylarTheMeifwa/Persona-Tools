export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const { userToken, entries, goals } = req.body;
    if (!userToken) return res.status(400).send("Missing user token");

    const data = JSON.stringify({ entries, goals }, null, 2);

    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: "/cashflow.json",
          mode: "overwrite",
          autorename: false,
          mute: false
        })
      },
      body: data
    });

    const result = await response.json();
    if (result.error) return res.status(400).json(result);

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}
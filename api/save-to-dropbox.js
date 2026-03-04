import { Dropbox } from "dropbox";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { userToken, entries, goals } = req.body;

  if (!userToken) return res.status(400).json({ error: "No token provided" });

  const dbx = new Dropbox({ accessToken: userToken });

  try {
    await dbx.filesUpload({
      path: "/PersonaTools/cashflow-data.json", // <-- this is the file that will be created
      contents: JSON.stringify({ entries, goals }),
      mode: { ".tag": "overwrite" } // overwrite if file exists
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Dropbox save error:", err);
    res.status(500).json({ error: "Dropbox save failed" });
  }
}
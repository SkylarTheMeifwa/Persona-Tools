import { Dropbox } from "dropbox";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userToken, entries, goals } = req.body;
  if (!userToken) return res.status(400).json({ error: "Missing token" });

  const dbx = new Dropbox({ accessToken: userToken });

  try {
    await dbx.filesUpload({
      path: "/Persona-Tools/cashflow-data.json",
      contents: JSON.stringify({ entries, goals }),
      mode: { ".tag": "overwrite" } // overwrite if exists
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
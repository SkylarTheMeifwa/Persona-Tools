import { Dropbox } from "dropbox";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userToken } = req.body;
  if (!userToken) return res.status(400).json({ error: "Missing token" });

  const dbx = new Dropbox({ accessToken: userToken });

  try {
    const file = await dbx.filesDownload({ path: "/Persona-Tools/cashflow-data.json" });
    const text = new TextDecoder("utf-8").decode(file.result.fileBinary);
    const data = JSON.parse(text);

    res.status(200).json(data);
  } catch (err) {
    console.warn("File not found or error reading:", err);
    res.status(404).json({ entries: {}, goals: [] });
  }
}
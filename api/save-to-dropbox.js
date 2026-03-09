import { Dropbox } from "dropbox";
import fetch from "node-fetch";

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach(cookie => {
    const parts = cookie.split("=");
    const name = parts.shift().trim();
    const value = parts.join("=");

    list[name] = decodeURIComponent(value);
  });

  return list;
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = parseCookies(req.headers.cookie);
  const userToken = cookies.userToken;

  if (!userToken) {
    return res.status(401).json({ error: "Dropbox not connected" });
  }

  const { entries, goals } = req.body;

  const dbx = new Dropbox({
    accessToken: userToken,
    fetch
  });

  try {

    const data = {
      entries,
      goals,
      savedAt: new Date().toISOString()
    };

    await dbx.filesUpload({
      path: "/Persona-Tools/cashflow-data.json",
      contents: JSON.stringify(data, null, 2),
      mode: "overwrite"
    });

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("DROPBOX ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
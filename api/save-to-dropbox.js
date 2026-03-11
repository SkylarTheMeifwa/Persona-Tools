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
  // Accept token from cookie or body
  let userToken = cookies.userToken;
  if (!userToken && req.body && req.body.userToken) {
    userToken = req.body.userToken;
  }

  if (!userToken) {
    console.error("No Dropbox token provided.");
    return res.status(401).json({ error: "Dropbox not connected" });
  }
  console.log("Dropbox token received:", userToken);

  const { entries, goals } = req.body;

  const dbx = new Dropbox({
    accessToken: userToken,
    fetch
  });

  try {
    // Ensure /Persona-Tools folder exists

    // Download existing file if it exists
    let existing = { entries: [], goals: [] };
    let response = null;
    try {
      response = await dbx.filesDownload({
        path: "/cashflow-data.json"
      });
      const fileData = response.result.fileBinary;
      existing = JSON.parse(fileData.toString());
    } catch (err) {
      // If file doesn't exist, continue with empty
      if (!err?.error?.error_summary?.includes("path/not_found")) {
        throw err;
      }
    }

    // Merge: replace entries and goals with new data
    const data = {
      ...existing,
      entries,
      goals,
      savedAt: new Date().toISOString()
    };

    await dbx.filesUpload({
      path: "/cashflow-data.json",
      contents: JSON.stringify(data, null, 2),
      mode: { ".tag": "update", "update": response?.result?.rev || undefined } // update if possible
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("DROPBOX ERROR:", err);
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
}
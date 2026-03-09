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

  const cookies = parseCookies(req.headers.cookie);
  const userToken = cookies.userToken;

  if (!userToken) {
    return res.status(401).json({ error: "Dropbox not connected" });
  }

  const dbx = new Dropbox({
    accessToken: userToken,
    fetch
  });

  try {

    const response = await dbx.filesDownload({
      path: "/Persona-Tools/cashflow-data.json"
    });

    const fileData = response.result.fileBinary;

    const json = JSON.parse(fileData.toString());

    res.status(200).json(json);

  } catch (err) {

    // file might not exist yet
    if (err?.error?.error_summary?.includes("path/not_found")) {
      return res.status(200).json({
        entries: [],
        goals: []
      });
    }

    console.error("DROPBOX LOAD ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
}
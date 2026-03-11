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
  let userToken = cookies.userToken;
  if (!userToken && req.body && req.body.userToken) {
    userToken = req.body.userToken;
  }

  if (!userToken) {
    console.error("No Dropbox token provided.");
    return res.status(401).json({ error: "Dropbox not connected" });
  }
  console.log("Dropbox token received:", userToken);

  const dbx = new Dropbox({
    accessToken: userToken,
    fetch
  });

  try {
    const response = await dbx.filesDownload({
      path: "/cashflow-data.json"
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
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({
      error: err.message
    });
  }
}
import { Dropbox } from "dropbox";
import fetch from "node-fetch";

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
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
  let userToken = cookies.userToken;
  if (!userToken && req.body && req.body.userToken) {
    userToken = req.body.userToken;
  }

  if (!userToken) {
    return res.status(401).json({ error: "Dropbox not connected" });
  }

  const dbx = new Dropbox({
    accessToken: userToken,
    fetch,
  });

  try {
    const response = await dbx.filesDownload({
      path: "/mementos-requests-data.json",
    });

    const fileData = response.result.fileBinary;
    const json = JSON.parse(fileData.toString());
    return res.status(200).json({
      tasks: Array.isArray(json.tasks) ? json.tasks : [],
      savedAt: json.savedAt,
    });
  } catch (error) {
    if (error?.error?.error_summary?.includes("path/not_found")) {
      return res.status(200).json({ tasks: [] });
    }

    console.error("DROPBOX LOAD MEMENTOS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

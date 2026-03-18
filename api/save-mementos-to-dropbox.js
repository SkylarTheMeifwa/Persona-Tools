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

  const incomingTasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];

  const dbx = new Dropbox({
    accessToken: userToken,
    fetch,
  });

  try {
    await dbx.filesUpload({
      path: "/mementos-requests-data.json",
      contents: JSON.stringify(
        {
          savedAt: new Date().toISOString(),
          tasks: incomingTasks,
        },
        null,
        2
      ),
      mode: "overwrite",
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("DROPBOX SAVE MEMENTOS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

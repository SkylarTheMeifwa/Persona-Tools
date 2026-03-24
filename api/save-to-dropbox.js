import { Dropbox } from "dropbox";
import fetch from "node-fetch";

const DEFAULT_GROCERIES = { taxRates: { food: 3, other: 10.5 }, stores: [] };

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

  const dataType = req.body?.dataType || "finances";

  const dbx = new Dropbox({
    accessToken: userToken,
    fetch
  });

  try {
    if (dataType === "groceries") {
      const groceries = req.body?.groceries && typeof req.body.groceries === "object"
        ? req.body.groceries
        : DEFAULT_GROCERIES;

      await dbx.filesUpload({
        path: "/groceries-data.json",
        contents: JSON.stringify(
          {
            savedAt: new Date().toISOString(),
            groceries,
          },
          null,
          2
        ),
        mode: "overwrite",
      });
    } else if (dataType === "mementos") {
      const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];

      await dbx.filesUpload({
        path: "/mementos-requests-data.json",
        contents: JSON.stringify(
          {
            savedAt: new Date().toISOString(),
            tasks,
          },
          null,
          2
        ),
        mode: "overwrite",
      });
    } else {
      const { entries, goals, deletedGoals } = req.body;

      // Preserve unknown fields if they already exist in the finances file.
      let existing = { entries: [], goals: [], deletedGoals: [] };
      try {
        const response = await dbx.filesDownload({
          path: "/cashflow-data.json"
        });
        const fileData = response.result.fileBinary;
        existing = JSON.parse(fileData.toString());
      } catch (err) {
        if (!err?.error?.error_summary?.includes("path/not_found")) {
          throw err;
        }
      }

      const data = {
        ...existing,
        savedAt: new Date().toISOString(),
        entries,
        goals,
        deletedGoals,
      };

      await dbx.filesUpload({
        path: "/cashflow-data.json",
        contents: JSON.stringify(data, null, 2),
        mode: "overwrite"
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("DROPBOX ERROR:", dataType, err);
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
}
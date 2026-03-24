import { Dropbox } from "dropbox";
import fetch from "node-fetch";

const DEFAULT_GROCERIES = { taxRates: { food: 3, other: 10.5 }, stores: [] };

const DATASETS = {
  finances: {
    path: "/cashflow-data.json",
    onSuccess: (json) => json,
    onNotFound: () => ({ entries: [], goals: [], deletedGoals: [] }),
  },
  groceries: {
    path: "/groceries-data.json",
    onSuccess: (json) => ({
      groceries:
        json.groceries && typeof json.groceries === "object"
          ? json.groceries
          : DEFAULT_GROCERIES,
      savedAt: json.savedAt,
    }),
    onNotFound: () => ({ groceries: DEFAULT_GROCERIES }),
  },
  mementos: {
    path: "/mementos-requests-data.json",
    onSuccess: (json) => ({
      tasks: Array.isArray(json.tasks) ? json.tasks : [],
      savedAt: json.savedAt,
    }),
    onNotFound: () => ({ tasks: [] }),
  },
};

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

  const dataType = req.body?.dataType || "finances";
  const dataset = DATASETS[dataType] || DATASETS.finances;

  try {
    const response = await dbx.filesDownload({
      path: dataset.path
    });
    const fileData = response.result.fileBinary;
    const json = JSON.parse(fileData.toString());
    res.status(200).json(dataset.onSuccess(json));
  } catch (err) {
    // file might not exist yet
    if (err?.error?.error_summary?.includes("path/not_found")) {
      return res.status(200).json(dataset.onNotFound());
    }
    console.error("DROPBOX LOAD ERROR:", dataType, err);
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({
      error: err.message
    });
  }
}
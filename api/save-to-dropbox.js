import { Dropbox } from "dropbox";

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach(cookie => {
    const parts = cookie.split("=");
    list[parts[0].trim()] = decodeURIComponent(parts[1]);
  });

  return list;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const cookies = parseCookies(req.headers.cookie);
  const userToken = cookies.userToken;

  const { entries, goals } = req.body;
console.log("BODY:", req.body);
console.log("COOKIES:", req.headers.cookie);
  if (!userToken)
    return res.status(400).json({ error: "Missing Dropbox token" });

  const dbx = new Dropbox({ accessToken: userToken });
console.log("TOKEN:", userToken);
  try {
    await dbx.filesUpload({
      path: "/Persona-Tools/cashflow-data.json",
      contents: JSON.stringify({ entries, goals }, null, 2),
      mode: "overwrite"
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
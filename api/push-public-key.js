import { getPublicVapidKey } from "./_push.js";

export default function handler(_req, res) {
  try {
    const publicKey = getPublicVapidKey();
    res.status(200).json({ publicKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
// api/capi.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, phone, first_name, last_name, event_name } = req.body;

    // --- Replace with your actual values ---
    const accessToken = "YOUR_META_CAPI_TOKEN";
    const pixelId = "YOUR_META_PIXEL_ID";

    // Meta CAPI endpoint
    const url = `https://graph.facebook.com/v20.0/${pixelId}/events`;

    // Event payload
    const payload = {
      data: [
        {
          event_name: event_name || "Lead",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            em: email ? [hash(email)] : undefined,
            ph: phone ? [hash(phone)] : undefined,
            fn: first_name ? [hash(first_name)] : undefined,
            ln: last_name ? [hash(last_name)] : undefined,
          },
        },
      ],
    };

    // Send to Meta
    const fbResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
        ...payload,
      }),
    });

    const fbData = await fbResponse.json();

    if (!fbResponse.ok) {
      return res.status(400).json({
        error: "Failed to send event",
        details: fbData,
      });
    }

    return res.status(200).json({
      message: "Event sent successfully",
      fbData,
    });
  } catch (err) {
    console.error("CAPI Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// --- Simple SHA256 hash function ---
import crypto from "crypto";
function hash(value) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

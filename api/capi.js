// api/capi.js

import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, phone, first_name, last_name, event_name } = req.body;

    // --- Read from environment variables set in Vercel ---
    const accessToken = process.env.META_CAPI_TOKEN;
    const pixelId = process.env.META_PIXEL_ID;

    if (!accessToken || !pixelId) {
      console.error("❌ Missing environment variables:", {
        META_CAPI_TOKEN: !!accessToken,
        META_PIXEL_ID: !!pixelId,
      });
      return res.status(500).json({ error: "Missing META_CAPI_TOKEN or META_PIXEL_ID" });
    }

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

    // Debug log payload
    console.log("📤 Sending payload to Meta:", JSON.stringify(payload, null, 2));

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

    // Debug log Meta response
    console.log("📥 Meta response:", JSON.stringify(fbData, null, 2));

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
    console.error("❌ CAPI Error:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}

// --- Simple SHA256 hash function ---
function hash(value) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

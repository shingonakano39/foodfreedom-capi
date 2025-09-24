// /api/capi.js

import fetch from "node-fetch"; // make sure node-fetch is installed

export default async function handler(req, res) {
  try {
    // Get your system user access token from environment variable
    const ACCESS_TOKEN = process.env.META_CAPI_TOKEN; 
    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: "META_CAPI_TOKEN not set in env" });
    }

    // Replace <PIXEL_ID> with your actual Pixel ID
    const PIXEL_ID = process.env.META_PIXEL_ID;
    if (!PIXEL_ID) {
      return res.status(500).json({ error: "META_PIXEL_ID not set in env" });
    }

    // Example payload from your webhook
    const { email, phone, first_name, last_name, order_value, currency } = req.body;

    // Hashing helper if needed (Meta requires SHA256)
    const crypto = require("crypto");
    const hash = (str) => crypto.createHash("sha256").update(str.trim().toLowerCase()).digest("hex");

    const eventPayload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            em: email ? [hash(email)] : [],
            ph: phone ? [hash(phone)] : [],
            fn: first_name ? [hash(first_name)] : [],
            ln: last_name ? [hash(last_name)] : [],
          },
          custom_data: {
            currency: currency || "NZD",
            value: order_value || 1,
          },
        },
      ],
    };

    // Send event to Meta CAPI
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      }
    );

    const data = await response.json();

    // Log response for debugging
    console.log("Meta CAPI response:", data);

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    return res.status(200).json({ success: true, metaResponse: data });
  } catch (err) {
    console.error("CAPI Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

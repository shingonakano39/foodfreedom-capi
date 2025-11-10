// File: /api/capi.js

import crypto from "crypto";

export default async function handler(req, res) {
  try {
    const body = req.body;

    // Required: your Meta Pixel ID and Access Token
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      console.error("❌ Missing Meta Pixel credentials in environment variables.");
      return res.status(500).json({ error: "Missing Meta Pixel credentials." });
    }

    // Hash helper functions
    const hashData = (data) => {
      if (!data) return null;
      return crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
    };

    // Build user data
    const user_data = {
      em: hashData(body.email),
      ph: hashData(body.phone),
      fn: hashData(body.first_name),
      ln: hashData(body.last_name),
      client_user_agent: req.headers["user-agent"],
      fbp: body.fbp || null,
      fbc: body.fbc || null,
    };

    // Construct event
    const event = {
      event_name: body.event_name || "Schedule",
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: body.event_source_url || "",
      event_id: body.event_id || `${Date.now()}-${Math.random()}`,
      user_data,
    };

    // ✅ Include test_event_code if present
    if (body.test_event_code) {
      event.test_event_code = body.test_event_code;
    }

    // Prepare payload
    const payload = {
      data: [event],
    };

    // Send to Meta Conversion API
    const fbResponse = await fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const fbData = await fbResponse.json();

    console.log("✅ Sent to Meta CAPI:", JSON.stringify(payload, null, 2));
    console.log("📬 Meta API Response:", fbData);

    return res.status(200).json({ success: true, fbResponse: fbData });
  } catch (err) {
    console.error("❌ Error sending event to Meta:", err);
    return res.status(500).json({ error: err.message });
  }
}

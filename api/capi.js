// api/capi.js

import crypto from "crypto";

// Helper to hash user data for Meta CAPI
const sha256 = (str) => crypto.createHash("sha256").update(str).digest("hex");

export default async function handler(req, res) {
  try {
    // --- Only allow POST ---
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    // --- Parse body safely ---
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (parseErr) {
      console.error("❌ JSON parse error:", parseErr);
      return res.status(400).json({ success: false, error: "Invalid JSON body" });
    }

    console.log("🪵 Incoming body:", body);

    // --- Validate environment vars ---
    const pixel_id = process.env.META_PIXEL_ID;
    const access_token = process.env.META_ACCESS_TOKEN;

    if (!pixel_id || !access_token) {
      console.error("❌ Missing environment variables for Pixel ID or Access Token");
      return res.status(500).json({
        success: false,
        error: "Missing environment variables for Pixel ID or Access Token",
      });
    }

    // --- Prepare data ---
    const event_name = body.event_name || "Lead";
    const event_id = body.contact_id ? `${body.contact_id}-${event_name}` : undefined;

    const fbEvent = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: body.event_source_url || "https://foodfreedom.consciouseating.info",
          user_data: {
            em: body.email ? sha256(body.email.trim().toLowerCase()) : undefined,
            fn: body.first_name ? sha256(body.first_name.trim().toLowerCase()) : undefined,
            ln: body.last_name ? sha256(body.last_name.trim().toLowerCase()) : undefined,
            ph: body.phone ? sha256(body.phone.replace(/\D/g, "")) : undefined,
            client_ip_address: req.headers["x-forwarded-for"] || "0.0.0.0",
            client_user_agent: req.headers["user-agent"] || "",
          },
          custom_data: {
            source: body.source || "HighLevel Funnel",
            value: body.value || 0,
          },
          event_id,
        },
      ],
      access_token, // Meta requires this here if you post as JSON body
    };

    console.log("📤 Sending to Facebook CAPI:", fbEvent);

    // --- Send to Meta ---
    const response = await fetch(`https://graph.facebook.com/v17.0/${pixel_id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fbEvent),
    });

    const result = await response.json();
    console.log("✅ Facebook CAPI Response:", result);

    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("❌ CAPI Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

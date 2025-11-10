// api/capi.js

import crypto from "crypto";

// --- Helper to hash user data for Meta CAPI ---
const sha256 = (str) => crypto.createHash("sha256").update(str).digest("hex");

export default async function handler(req, res) {
  try {
    const body = req.body;

    // --- Determine event_name ---
    // Lead for forms, Schedule for confirmed calendar bookings
    const event_name = body.event_name || body.event_type || "Lead";

    // --- Optional deduplication ---
    // Combine contact ID + event name to prevent Meta ignoring multiple events for same contact
    const event_id = body.contact_id ? `${body.contact_id}-${event_name}` : undefined;

    // --- Build Facebook Event payload ---
    const fbEvent = {
      data: [
        {
          event_name, // TOP LEVEL event_name — Meta requires this
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
            // REMOVE event_name from custom_data — must be top-level
          },
          event_id, // optional deduplication
        },
      ],
    };

    console.log("📤 Sending to Facebook CAPI:", fbEvent);

    // --- Send to Meta CAPI ---
    const pixel_id = process.env.META_PIXEL_ID;        // your Pixel ID in Vercel env
    const access_token = process.env.META_ACCESS_TOKEN; // your Access Token in Vercel env

    fetch(`https://graph.facebook.com/v17.0/${pixel_id}/events?access_token=${access_token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: fbEvent.data }),
    });

    const result = await response.json();
    console.log("✅ Facebook CAPI Response:", result);

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("❌ CAPI Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

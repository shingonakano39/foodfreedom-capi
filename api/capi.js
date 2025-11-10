// api/capi.js

export default async function handler(req, res) {
  // --- Check request method ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // --- Environment variables ---
    const pixel_id = process.env.META_PIXEL_ID;
    const access_token = process.env.META_ACCESS_TOKEN;

    if (!pixel_id || !access_token) {
      console.error("❌ Missing environment variables for Pixel ID or Access Token");
      return res.status(500).json({ error: "Server misconfiguration: Missing Pixel ID or Access Token" });
    }

    // --- Parse incoming data ---
    const { event_name, event_time, event_id, user_data, custom_data, event_source_url } = req.body;

    // --- Validate required fields ---
    if (!event_name || !event_time) {
      return res.status(400).json({ error: "Missing required event fields (event_name, event_time)" });
    }

    // --- Build payload for Facebook CAPI ---
    const payload = {
      data: [
        {
          event_name,
          event_time,
          action_source: "website",
          event_source_url: event_source_url || "https://foodfreedom.consciouseating.info",
          event_id: event_id || `${Date.now()}-${event_name}`, // optional deduplication
          user_data: user_data || {},
          custom_data: custom_data || {},
        },
      ],
    };

    console.log("📤 Sending to Facebook CAPI:", JSON.stringify(payload, null, 2));

    // --- Send to Facebook ---
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${pixel_id}/events?access_token=${access_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    // --- Handle Facebook response ---
    if (!response.ok) {
      console.error("❌ Facebook CAPI Error:", result);
      return res.status(response.status).json({ error: result });
    }

    console.log("✅ Facebook CAPI Response:", result);
    return res.status(200).json({ success: true, result });

  } catch (err) {
    console.error("❌ CAPI Exception:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}

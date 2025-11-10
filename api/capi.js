export default async function handler(req, res) {
  // --- Allow only POST ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // --- Environment variables ---
    const pixel_id = process.env.META_PIXEL_ID;
    const access_token = process.env.META_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      console.error("❌ Missing environment variables for Pixel ID or Access Token");
      return res.status(500).json({ error: "Missing environment variables" });
    }

    const body = req.body;
    console.log("🪵 Incoming body:", body);

    // --- Extract event name safely ---
    const rawEvent =
      body?.event_name ||
      body?.customData?.event_name ||
      body?.type ||
      body?.contact_type ||
      "lead";

    const eventName = rawEvent.toLowerCase().includes("schedule")
      ? "Schedule"
      : "Lead";

    console.log(`📤 Sending event to Facebook: ${eventName}`);

    // --- Fallback event time ---
    const eventTime = Math.floor(Date.now() / 1000);

    // --- Build user data ---
    const email = body.email || body?.customData?.email || "";
    const phone = body.phone || body?.customData?.phone || "";
    const firstName = body.first_name || body?.customData?.first_name || "";
    const lastName = body.last_name || body?.customData?.last_name || "";

    // --- Normalize phone (remove spaces, dashes, etc.) ---
    const normalizedPhone = phone.replace(/[^+\d]/g, "");

    const userData = {
      em: email ? hash(email.trim().toLowerCase()) : undefined,
      ph: normalizedPhone ? hash(normalizedPhone) : undefined,
      fn: firstName ? hash(firstName.trim().toLowerCase()) : undefined,
      ln: lastName ? hash(lastName.trim().toLowerCase()) : undefined,
      client_ip_address: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
      client_user_agent: req.headers["user-agent"] || "",
    };

    // --- Build event payload ---
    const eventId = `${body.contact_id || Date.now()}-${eventName}`;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          action_source: "website",
          event_source_url: body.event_source_url || "https://foodfreedom.consciouseating.info",
          user_data: userData,
          custom_data: {
            contact_id: body.contact_id || "",
            source: body.contact_source || "",
          },
          event_id: eventId,
        },
      ],
      access_token: accessToken,
    };

    console.log("📦 Final payload:", JSON.stringify(payload, null, 2));

    // --- Send to Facebook CAPI ---
    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const fbResult = await fbResponse.json();
    console.log("✅ Facebook CAPI Response:", fbResult);

    if (!fbResponse.ok) {
      return res.status(400).json({ error: "Facebook API error", details: fbResult });
    }

    return res.status(200).json({ success: true, fbResult });
  } catch (err) {
    console.error("🔥 CAPI handler error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

// --- Simple SHA256 hash function for user data (Meta requires hashing) ---
import crypto from "crypto";
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

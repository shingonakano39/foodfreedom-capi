// api/capi.js
import crypto from "crypto";

// --- Simple SHA256 hash function for user data (Meta requires hashing) ---
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// remove undefined/null keys helper
function compact(obj) {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    if (v !== undefined && v !== null && v !== "") acc[k] = v;
    return acc;
  }, {});
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const pixel_id = process.env.META_PIXEL_ID;
    const access_token = process.env.META_ACCESS_TOKEN;
    const test_event_code = process.env.META_TEST_EVENT_CODE; // optional for Events Manager testing

    if (!pixel_id || !access_token) {
      console.error("❌ Missing environment variables for Pixel ID or Access Token");
      return res.status(500).json({ error: "Missing environment variables" });
    }

    const body = req.body || {};
    console.log("🪵 Incoming body:", body);

    // --- What the source actually sent (log it) ---
    const rawEvent =
      (typeof body.event_name === "string" && body.event_name) ||
      (typeof body.customData?.event_name === "string" && body.customData.event_name) ||
      body.type ||
      body.contact_type ||
      "";

    console.log("🔎 Raw incoming event name:", rawEvent);

    // --- Normalize/match common variants to exact strings your custom conversions expect ---
    const normalized = (rawEvent || "").toString().trim().toLowerCase();

    let eventName = "Lead"; // default
    // if incoming indicates booking/appointment/schedule, force exact "Schedule"
    const scheduleKeywords = ["schedule", "scheduled", "appointment", "booking", "booked", "schedule_booking", "book_appointment"];
    if (scheduleKeywords.some((k) => normalized.includes(k))) {
      eventName = "Schedule";
    } else if (normalized.includes("lead") || normalized.includes("lead_event")) {
      eventName = "Lead";
    } else if (normalized) {
      // If the source sent a custom name that isn't in keywords, you can forward it raw
      // but keep in mind custom conversions need the exact string.
      eventName = rawEvent; // forward as-is (case preserved)
    }

    console.log(`📤 Sending event to Facebook as: "${eventName}"`);

    // --- Event timestamp ---
    const eventTime = Math.floor(Date.now() / 1000);

    // --- Build user data (hash ONLY when value present) ---
    const email = body.email || body?.customData?.email || "";
    const phone = body.phone || body?.customData?.phone || "";
    const firstName = body.first_name || body?.customData?.first_name || "";
    const lastName = body.last_name || body?.customData?.last_name || "";

    const normalizedPhone = (phone || "").toString().replace(/[^+\d]/g, "");

    const userData = compact({
      em: email ? hash(email.trim().toLowerCase()) : undefined,
      ph: normalizedPhone ? hash(normalizedPhone) : undefined,
      fn: firstName ? hash(firstName.trim().toLowerCase()) : undefined,
      ln: lastName ? hash(lastName.trim().toLowerCase()) : undefined,
      client_ip_address:
        req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
        req.socket?.remoteAddress ||
        undefined,
      client_user_agent: req.headers["user-agent"] || undefined,
    });

    // --- Event ID for deduplication (consistent when possible) ---
    const eventId = `${body.contact_id || body?.customData?.contact_id || Date.now()}-${String(eventName)}`;

    // --- Custom data you want to pass to Facebook (compact it) ---
    const customData = compact({
      contact_id: body.contact_id || body?.customData?.contact_id || undefined,
      source: body.contact_source || body?.customData?.source || undefined,
      value: body.amount || body?.customData?.value || undefined,
      currency: body.currency || body?.customData?.currency || undefined,
    });

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          action_source: "website",
          event_source_url: body.event_source_url || "https://foodfreedom.consciouseating.info",
          user_data: userData,
          custom_data: customData,
          event_id: eventId,
        },
      ],
      access_token: access_token,
    };

    // Attach test_event_code if present (useful when verifying via Events Manager → Test Events)
    if (test_event_code) {
      payload.test_event_code = test_event_code;
    }

    console.log("📦 Final payload:", JSON.stringify(payload, null, 2));

    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${pixel_id}/events`, {
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

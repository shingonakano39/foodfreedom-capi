// api/capi.js
import crypto from "crypto";

// --- Simple SHA256 hash function for user data (Meta requires hashing) ---
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export default async function handler(req, res) {
  // --- Allow only POST ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // --- Environment variables ---
    const pixel_id = process.env.META_PIXEL_ID;
    const access_token = process.env.META_ACCESS_TOKEN;

    if (!pixel_id || !access_token) {
      console.error("❌ Missing environment variables for Pixel ID or Access Token");
      return res.status(500).json({ error: "Missing environment variables" });
    }

    const body = req.body;
    console.log("🪵 Incoming body:", body);

    // --- Extract event name safely ---
    const rawevent =
      body?.event_name ||
      body?.customdata?.event_name ||
      body?.type ||
      body?.contact_type ||
      "lead";

    const eventname = rawevent.toLowerCase().includes("schedule")
      ? "Schedule"
      : "Lead";

    console.log(`📤 Sending event to Facebook: ${eventname}`);

    // --- Fallback event time ---
    const eventtime = Math.floor(Date.now() / 1000);

    // --- Build user data ---
    const email = body.email || body?.customdata?.email || "";
    const phone = body.phone || body?.customdata?.phone || "";
    const firstName = body.first_name || body?.customdata?.first_name || "";
    const lastName = body.last_name || body?.customdata?.last_name || "";

    // --- Normalize phone (remove spaces, dashes, etc.) ---
    const normalizedPhone = phone.replace(/[^+\d]/g, "");

    const userdata = {
      em: email ? hash(email.trim().toLowerCase()) : undefined,
      ph: normalizedPhone ? hash(normalizedPhone) : undefined,
      fn: firstName ? hash(firstName.trim().toLowerCase()) : undefined,
      ln: lastName ? hash(lastName.trim().toLowerCase()) : undefined,
      client_ip_address: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
      client_user_agent: req.headers["user-agent"] || "",
    };

    // --- Build event payload ---
    const eventid = `${body.contact_id || Date.now()}-${eventname}`;

    const payload = {
      data: [
        {
          event_name: eventname,
          event_time: eventtime,
          action_source: "website",
          event_source_url: body.event_source_url || "https://foodfreedom.consciouseating.info",
          user_data: userdata,
          custom_data: {
            contact_id: body.contact_id || "",
            source: body.contact_source || "",
          },
          event_id: eventid,
        },
      ],
      access_token: access_token,
    };

    console.log("📦 Final payload:", JSON.stringify(payload, null, 2));

    // --- Send to Meta CAPI ---
    const fbresponse = await fetch(`https://graph.facebook.com/v18.0/${pixel_id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const fbresult = await fbresponse.json();
    console.log("✅ Facebook CAPI Response:", fbresult);

    if (!fbresponse.ok) {
      return res.status(400).json({ error: "Facebook API error", details: fbresult });
    }

    return res.status(200).json({ success: true, fbresult });
  } catch (err) {
    console.error("🔥 CAPI handler error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

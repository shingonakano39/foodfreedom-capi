// /api/capi.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Meta CAPI endpoint ready" });
  }

  let body = {};

  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error("❌ Error parsing webhook body:", err);
    return res.status(400).json({ status: "error", message: "Invalid JSON" });
  }

  console.log("✅ Webhook payload received:", JSON.stringify(body, null, 2));

  const eventType = (body.event_type || "").toLowerCase();

  // Default event mapping
  let eventName = "Lead";
  if (eventType === "appointment") eventName = "CompleteRegistration";
  if (eventType === "purchase") eventName = "Purchase";

  const eventTime = Math.floor(Date.now() / 1000);

  // Hash helper
  const hash = (value) =>
    value ? crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex") : null;

  // User data (for matching)
  const user_data = {
    em: body.email ? [hash(body.email)] : [],
    ph: body.phone ? [hash(body.phone)] : [],
    fn: body.first_name ? [hash(body.first_name)] : [],
    ln: body.last_name ? [hash(body.last_name)] : [],
    client_ip_address: body.client_ip || body.ip || undefined,
    client_user_agent: body.user_agent || req.headers["user-agent"] || undefined,
    fbp: body.fbp || undefined,
    fbc: body.fbc || undefined,
  };

  // Custom data (depends on event type)
  let custom_data = {};

  if (eventType === "purchase") {
    custom_data = {
      order_id: body.order_id || undefined,
      value: body.order_value ? parseFloat(body.order_value) : undefined,
      currency: body.currency || "NZD",
      content_ids: body.content_ids ? (Array.isArray(body.content_ids) ? body.content_ids : [body.content_ids]) : [],
    };
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: `${eventTime}-${Math.random()}`,
        action_source: "website",
        user_data,
        custom_data,
      },
    ],
  };

  console.log("📤 Payload sent to Meta:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    console.log("📥 Meta response:", result);
    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error sending event to Meta:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

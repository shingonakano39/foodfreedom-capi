import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Meta CAPI endpoint ready" });
  }

  let body = {};

  // 1️⃣ Parse the webhook body safely
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error("Error parsing webhook body:", err);
    return res.status(400).json({ status: "error", message: "Invalid JSON" });
  }

  // 2️⃣ Extract customData from GHL webhook
  const data = body.customData || {};

  // 3️⃣ Map event_type to Meta event_name
  const eventType = (data.event_type || "").toLowerCase();
  let eventName = "Lead"; // default
  if (eventType === "appointment") eventName = "CompleteRegistration";
  if (eventType === "purchase") eventName = "Purchase";

  // 4️⃣ Deduplication ID and timestamp
  const eventId = `${Date.now()}-${Math.random()}`;
  const eventTime = Math.floor(Date.now() / 1000);

  // 5️⃣ Hash user data
  const userData = {
    em: data.email ? [hashSHA256(data.email)] : [],
    ph: data.phone ? [hashSHA256(data.phone)] : [],
    fn: data.first_name ? [hashSHA256(data.first_name)] : [],
    ln: data.last_name ? [hashSHA256(data.last_name)] : [],
  };

  // 6️⃣ Custom data for purchases
  const customData =
    eventName === "Purchase"
      ? {
          value: data.order_value || 0,
          currency: data.currency || "NZD",
          content_ids: data.order_id ? [data.order_id] : [],
        }
      : {};

  // 7️⃣ Build Meta CAPI payload
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        user_data: userData,
        custom_data: customData,
      },
    ],
  };

  // 8️⃣ Send payload to Meta
  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.PIXEL_ID}/events?access_token=${process.env.ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const fbResult = await response.json();

    // 9️⃣ Logs for debugging
    console.log("Webhook payload received:", JSON.stringify(body, null, 2));
    console.log("Payload sent to Meta:", JSON.stringify(payload, null, 2));
    console.log("Meta response:", fbResult);

    return res.status(200).json({
      status: "success",
      event_type: eventType,
      event_name: eventName,
      event_id: eventId,
      meta_response: fbResult,
    });
  } catch (error) {
    console.error("CAPI error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
}

// 10️⃣ Helper: SHA256 hash required by Meta
function hashSHA256(value) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

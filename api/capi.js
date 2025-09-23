// api/capi.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Meta CAPI endpoint ready" });
  }

  try {
    const body = req.body;

    // Capture event_type from webhook custom data
    const eventType = body.event_type || "lead"; // default to lead

    // Decide Meta event name
    let eventName = "Lead";
    if (eventType === "appointment") eventName = "CompleteRegistration";
    if (eventType === "purchase") eventName = "Purchase";

    const eventId = `${Date.now()}-${Math.random()}`;
    const eventTime = Math.floor(Date.now() / 1000);

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          event_id: eventId,
          action_source: "website",
          user_data: {
            em: body.email ? [hashSHA256(body.email)] : [],
            ph: body.phone ? [hashSHA256(body.phone)] : [],
            fn: body.first_name ? [hashSHA256(body.first_name)] : [],
            ln: body.last_name ? [hashSHA256(body.last_name)] : [],
          },
          custom_data:
            eventName === "Purchase"
              ? {
                  currency: "NZD",
                  value: body.amount || 0,
                }
              : {},
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.PIXEL_ID}/events?access_token=${process.env.ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const fbResult = await response.json();
    console.log("Forwarded to Meta:", JSON.stringify(payload, null, 2), fbResult);

    return res.status(200).json({ status: "success", event_id: eventId, meta_response: fbResult });
  } catch (error) {
    console.error("CAPI error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
}

function hashSHA256(value) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

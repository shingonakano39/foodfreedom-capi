// api/capi.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Meta CAPI endpoint ready" });
  }

  try {
    const body = req.body;

    // --- Map GHL fields to event data ---
    const email = body.email || "";
    const phone = body.phone || "";
    const firstName = body.first_name || "";
    const lastName = body.last_name || "";
    const eventType = body.event_type || "Lead"; // optional: send "Booking" or "Purchase"
    const purchaseAmount = body.purchase_amount || 0;
    const currency = body.currency || "NZD";

    const eventId = `${Date.now()}-${Math.random()}`; // deduplication
    const eventTime = Math.floor(Date.now() / 1000);

    // --- Build Meta CAPI payload ---
    const payload = {
      data: [
        {
          event_name: eventType,
          event_time: eventTime,
          event_id: eventId,
          action_source: "website",
          user_data: {
            em: email ? [hashSHA256(email)] : [],
            ph: phone ? [hashSHA256(phone)] : [],
            fn: firstName ? [hashSHA256(firstName)] : [],
            ln: lastName ? [hashSHA256(lastName)] : [],
          },
          custom_data: eventType === "Purchase" ? {
            value: purchaseAmount,
            currency: currency
          } : {},
        },
      ],
    };

    // --- Send to Meta CAPI ---
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.PIXEL_ID}/events?access_token=${process.env.ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const fbResult = await response.json();

    // --- Logs for debugging ---
    console.log("Webhook received from GHL:", JSON.stringify(body, null, 2));
    console.log("Payload sent to Meta CAPI:", JSON.stringify(payload, null, 2));
    console.log("Response from Meta:", fbResult);

    return res.status(200).json({
      status: "success",
      event_id: eventId,
      meta_response: fbResult,
    });

  } catch (error) {
    console.error("CAPI error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
}

// --- Helper function: SHA256 hash required by Meta ---
function hashSHA256(value) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

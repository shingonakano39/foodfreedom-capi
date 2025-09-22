// api/capi.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Meta CAPI endpoint ready" });
  }

  try {
    // 1. Extract webhook payload from GHL
    const body = req.body;

    // Example mapping: adjust these fields to match your GHL webhook payload
    const email = body.email || "";
    const phone = body.phone || "";
    const firstName = body.first_name || "";
    const lastName = body.last_name || "";

    // 2. Required Meta event fields
    const eventName = "Lead"; // You can change this to "CompleteRegistration" etc.
    const eventId = `${Date.now()}-${Math.random()}`; // unique ID for deduplication
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp

    // 3. Build payload for Meta CAPI
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          event_id: eventId,
          action_source: "website",
          user_data: {
            em: email ? [hashSHA256(email)] : [],
            ph: phone ? [hashSHA256(phone)] : [],
            fn: firstName ? [hashSHA256(firstName)] : [],
            ln: lastName ? [hashSHA256(lastName)] : [],
          },
        },
      ],
    };

    // 4. Send to Meta CAPI
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.PIXEL_ID}/events?access_token=${process.env.ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const fbResult = await response.json();

    // 5. Respond to GHL (and log)
    console.log("Forwarded to Meta:", fbResult);
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
import crypto from "crypto";
function hashSHA256(value) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}


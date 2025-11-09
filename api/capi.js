// api/capi.js

// ✅ api/capi.js
export default async function handler(req, res) {
  // --- CORS setup (fixes browser block) ---
  res.setHeader("Access-Control-Allow-Origin", "https://foodfreedom.consciouseating.info");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // --- Handle preflight request ---
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- Handle POST requests ---
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const body = req.body;
    console.log("📩 Incoming CAPI data:", body);

    // --- Replace this with YOUR Facebook Pixel ID and Access Token ---
    const FB_PIXEL_ID = "563428176815222"; // <-- your pixel ID
    const FB_ACCESS_TOKEN = "EAAUTZCA6edfcBPuSaZCOJIzWerlb5pl3R0tUUpEDZCZBXIzc8yxzh1lNQT5iyzNoT0wmUqpUi6eTMZBhdEEbY9MUkKBXMVEUwOxWykC6jHbT5G3WI5l9LgbCKyfZBQPx6A1ucTC6GhizteZBmr7jree5RX0pqnpmdXGKeHFG3MFdVgrqJUzq0pldhwbRrMKwwZDZD"; // <-- your system user access token
    const FB_API_URL = `https://graph.facebook.com/v18.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`;

    // --- Define event_name before building the payload ---
const event_name = body.event_name || body.event_type || "lead";

// --- Build Facebook Event payload ---
const fbEvent = {
  data: [
    {
      event_name, // <— this now gets sent correctly to Meta
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
      },
    },
  ],
};

console.log("📤 Sending to Facebook CAPI:", fbEvent);


    // --- Send to Facebook ---
    const fbResponse = await fetch(FB_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fbEvent),
    });

    const fbData = await fbResponse.json();

    // --- Log and return ---
    console.log("✅ Facebook CAPI Response:", fbData);
    res.status(200).json({ success: true, fbResponse: fbData });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- Simple SHA256 hash helper (for user_data security) ---
import crypto from "crypto";
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

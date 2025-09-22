// api/capi.js
export default async function handler(req, res) {
  if (req.method === "POST") {
    // For now just echo back data to test webhook
    console.log("Webhook received:", req.body);

    res.status(200).json({
      message: "Received",
      body: req.body,
    });
  } else {
    res.status(200).json({ message: "Hello from /api/capi" });
  }
}

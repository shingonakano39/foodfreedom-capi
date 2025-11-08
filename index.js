import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Replace with your Pixel ID and Access Token
const PIXEL_ID = "563428176815222";
const ACCESS_TOKEN = "EAAdZCZCJXWN80BPsOpeb01i72A7fUf42ayZCzCMkAWrja8d1tY8qwzt5oEznhRJ8og0DrNQ24RtT2kfRFujZBLAqRtrZBIdqGFCkSoONZCmthv6h0QLgERABdSdWb3Olm8orJBqWuGU2VmekwdeI9ikUZBE7nIFTbfZAhPzK0GOtDjEfxDG7hfTsWZA5sMOwIRgZDZD"; // you’ll generate this inside Events Manager > Conversions API > Settings

// Helper to send event to Meta
async function sendEvent(event_name, event_id, user_data, custom_data) {
  const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  const payload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        user_data,
        custom_data,
        action_source: "website"
      }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return res.json();
}

// Route: Lead (Opt-in)
app.post("/lead", async (req, res) => {
  const { email, phone, first_name, last_name, contact_id } = req.body;

  const user_data = {
    em: [email],
    ph: [phone],
    fn: [first_name],
    ln: [last_name]
  };

  const response = await sendEvent("Lead", contact_id, user_data, {
    content_name: "Opt-in Form Submission",
    currency: "NZD",
    value: 0
  });

  res.json(response);
});

// Route: Schedule (Call Booking)
app.post("/registration", async (req, res) => {
  const { email, phone, first_name, last_name, contact_id } = req.body;

  const user_data = {
    em: [email],
    ph: [phone],
    fn: [first_name],
    ln: [last_name]
  };

  const response = await sendEvent("Schedule", contact_id, user_data, {
    content_name: "Food Freedom Call Booking",
    currency: "NZD",
    value: 0
  });

  res.json(response);
});

// Route: Purchase
app.post("/purchase", async (req, res) => {
  const { email, phone, first_name, last_name, contact_id, purchase_amount } = req.body;

  const user_data = {
    em: [email],
    ph: [phone],
    fn: [first_name],
    ln: [last_name]
  };

  const response = await sendEvent("Purchase", contact_id, user_data, {
    content_name: "Program Purchase",
    currency: "NZD",
    value: purchase_amount || 0
  });

  res.json(response);
});

export default app;

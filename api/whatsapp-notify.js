// api/whatsapp-notify.js
const twilio = require("twilio");

module.exports = async (req, res) => {
  // ----- CORS HEADERS -----
  const allowedOrigin =
    process.env.ALLOWED_ORIGIN || "https://amty-global.myshopify.com";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  // ----- PARSE BODY -----
  let body = req.body;

  // Sometimes Vercel gives body as string
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.status(400).json({ success: false, error: "Invalid JSON" });
      return;
    }
  }

  const { name, email, phone, location, message } = body || {};

  if (!name || !phone || !location || !message) {
    res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
    return;
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID || "AC4be996a260705c33973db097a7cad745",
      process.env.TWILIO_AUTH_TOKEN || "815d10d783e5f28cbf18cb74cd4481d0"
    );

    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      to: process.env.ADMIN_WHATSAPP_TO || "whatsapp:+919904545168",
      body:
        `New enquiry from Shopify:\n` +
        `Name: ${name}\n` +
        `Email: ${email || "-"}\n` +
        `Phone: ${phone}\n` +
        `Location: ${location}\n` +
        `Message: ${message}`,
    });

    console.log("WhatsApp SID:", result.sid);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Twilio error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to send WhatsApp message" });
  }
};

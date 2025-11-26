// api/whatsapp-notify.js
const twilio = require("twilio");

module.exports = async (req, res) => {
  /* ============ CORS ============ */
  let allowedOrigin = (process.env.ALLOWED_ORIGIN || "https://amty-global.myshopify.com").replace(/\/$/, "");
  let requestOrigin = (req.headers.origin || "").replace(/\/$/, "");

  if (requestOrigin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "null");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  /* ============ BODY PARSE ============ */
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      return res.status(400).json({ success: false, error: "Invalid JSON" });
    }
  }

  const { name, email, phone, location, message } = body || {};

  if (!name || !phone || !location || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
    });
  }

  /* ============ TWILIO CONFIG ============ */
  const accountSid   = process.env.TWILIO_ACCOUNT_SID;
  const authToken    = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber   = process.env.TWILIO_WHATSAPP_FROM;

  // Two admin numbers
  const DEFAULT_ADMIN = process.env.ADMIN_WHATSAPP_TO;                    // for all cities
  const MUMBAI_ADMIN  = process.env.MUMBAI_WHATSAPP_TO || DEFAULT_ADMIN;   // fallback if not set

  // Helpful error if core vars are missing
  if (!accountSid || !authToken || !fromNumber || !DEFAULT_ADMIN) {
    console.error("Missing Twilio env vars", {
      hasSid: !!accountSid,
      hasToken: !!authToken,
      hasFrom: !!fromNumber,
      hasDefaultAdmin: !!DEFAULT_ADMIN,
    });
    return res.status(500).json({
      success: false,
      error: "SERVER_CONFIG_ERROR",
      details: "Missing Twilio environment variables",
    });
  }

  // Decide recipient based on location
  const selectedLocation = (location || "").toString().trim().toUpperCase();
  const toNumber = selectedLocation === "MUMBAI" ? MUMBAI_ADMIN : DEFAULT_ADMIN;

  const client = twilio(accountSid, authToken);

  try {
    const result = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body:
        `New enquiry from Shopify:\n` +
        `Location: ${location}\n` +
        `Name: ${name}\n` +
        `Email: ${email || "-"}\n` +
        `Phone: ${phone}\n` +
        `Message: ${message}`,
    });

    console.log(`WhatsApp sent → ${toNumber} | SID: ${result.sid}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Twilio error:", err?.message || err);
    return res.status(500).json({
      success: false,
      error: "TWILIO_ERROR",
      details: err?.message || "Failed to send WhatsApp message",
    });
  }
};
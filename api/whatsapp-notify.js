// api/whatsapp-notify.js
// Serverless function / Express handler to forward demo requests to admin via Twilio WhatsApp.
// Required ENV vars:
// - TWILIO_ACCOUNT_SID
// - TWILIO_AUTH_TOKEN
// - TWILIO_WHATSAPP_FROM   (eg "whatsapp:+1415XXXXXXX")
// - ADMIN_WHATSAPP_TO      (default admin recipient, eg "whatsapp:+91XXXXXXXXXX")
// - MUMBAI_WHATSAPP_TO     (optional specific Mumbai admin, eg "whatsapp:+91XXXXXXXXXX")
// - ALLOWED_ORIGIN         (optional, e.g. https://amty-global.myshopify.com)

const twilio = require("twilio");

module.exports = async (req, res) => {
  /* ============ CORS ============ */
  const defaultOrigin = (process.env.ALLOWED_ORIGIN || "https://amty-global.myshopify.com").replace(/\/$/, "");
  const requestOrigin = (req.headers.origin || "").replace(/\/$/, "");

  if (requestOrigin && requestOrigin === defaultOrigin) {
    res.setHeader("Access-Control-Allow-Origin", defaultOrigin);
  } else {
    // For safety, allow null for some environments (like file://) — keep strict for production by setting ALLOWED_ORIGIN.
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

  // Destructure only the fields we expect — email intentionally omitted
  const { name, phone, location, message, preferred_date } = body || {};

  // Minimal validation: required fields
  if (!name || !phone || !location || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      required: ["name", "phone", "location", "message"]
    });
  }

  /* ============ TWILIO CONFIG ============ */
  const accountSid   = process.env.TWILIO_ACCOUNT_SID;
  const authToken    = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber   = process.env.TWILIO_WHATSAPP_FROM;

  const DEFAULT_ADMIN = process.env.ADMIN_WHATSAPP_TO;                   // e.g. "whatsapp:+91XXXXXXXXXX"
  const MUMBAI_ADMIN  = process.env.MUMBAI_WHATSAPP_TO || DEFAULT_ADMIN; // optional

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
      details: "Missing Twilio environment variables"
    });
  }

  // Decide recipient based on location (simple match; normalize to uppercase)
  const selectedLocation = (location || "").toString().trim().toUpperCase();
  const toNumber = selectedLocation === "MUMBAI" ? MUMBAI_ADMIN : DEFAULT_ADMIN;

  // Create Twilio client
  const client = twilio(accountSid, authToken);

  // Format message body — email removed, phone included
  const notificationBodyParts = [
    "New enquiry from Shopify:",
    `Location: ${location}`,
    `Name: ${name}`,
    `Phone: ${phone}`,
  ];

  if (preferred_date) {
    notificationBodyParts.push(`Preferred date: ${preferred_date}`);
  }

  notificationBodyParts.push(`Message: ${message}`);

  const notificationBody = notificationBodyParts.join("\n");

  try {
    const result = await client.messages.create({
      from: fromNumber,   // Twilio WhatsApp from (must be WhatsApp-enabled, e.g. "whatsapp:+1415XXX")
      to: toNumber,       // Admin WhatsApp (eg "whatsapp:+91XXX")
      body: notificationBody,
    });

    console.info(`WhatsApp sent → ${toNumber} | SID: ${result.sid}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Twilio error:", err?.message || err);
    return res.status(500).json({
      success: false,
      error: "TWILIO_ERROR",
      details: err?.message || "Failed to send WhatsApp message"
    });
  }
};

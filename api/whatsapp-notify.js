// api/whatsapp-notify.js
// Sends admin WhatsApp notification using APPROVED WhatsApp template

const twilio = require("twilio");

module.exports = async (req, res) => {
  /* ============ CORS ============ */
  const defaultOrigin = (process.env.ALLOWED_ORIGIN || "https://amty-global.myshopify.com").replace(/\/$/, "");
  const requestOrigin = (req.headers.origin || "").replace(/\/$/, "");

  if (requestOrigin === defaultOrigin) {
    res.setHeader("Access-Control-Allow-Origin", defaultOrigin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "null");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  /* ============ BODY PARSE ============ */
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid JSON" });
    }
  }

  const { name, phone, location, message, preferred_date } = body || {};

  if (!name || !phone || !location || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
    });
  }

  /* ============ TWILIO CONFIG ============ */
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    ADMIN_WHATSAPP_TO,
    MUMBAI_WHATSAPP_TO,
    ADMIN_TEMPLATE_SID, // 👈 REQUIRED
  } = process.env;

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_WHATSAPP_FROM ||
    !ADMIN_WHATSAPP_TO ||
    !ADMIN_TEMPLATE_SID
  ) {
    return res.status(500).json({
      success: false,
      error: "SERVER_CONFIG_ERROR",
    });
  }

  /* ============ ROUTING LOGIC ============ */
  const selectedLocation = location.trim().toUpperCase();
  const toNumber =
    selectedLocation === "MUMBAI" && MUMBAI_WHATSAPP_TO
      ? MUMBAI_WHATSAPP_TO
      : ADMIN_WHATSAPP_TO;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  /* ============ SEND WHATSAPP TEMPLATE MESSAGE ============ */
  try {
    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,     // ✅ Your approved sender
      to: toNumber,                  // ✅ Admin number
      contentSid: ADMIN_TEMPLATE_SID,
      contentVariables: JSON.stringify({
        "1": name,
        "2": phone,
        "3": location,
        "4": preferred_date || "Not specified",
        "5": message,
      }),
    });

    console.log("WhatsApp sent:", result.sid);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Twilio error:", err.message);
    return res.status(500).json({
      success: false,
      error: "TWILIO_ERROR",
      details: err.message,
    });
  }
};

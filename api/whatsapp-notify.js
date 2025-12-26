// api/whatsapp-notify.js
// Sends admin WhatsApp notification using APPROVED WhatsApp template (admin_lead_alert_v2)

const twilio = require("twilio");

module.exports = async (req, res) => {
  /* ============ CORS ============ */
  const allowedOrigin = (process.env.ALLOWED_ORIGIN || "https://amty-global.myshopify.com").replace(/\/$/, "");
  const origin = (req.headers.origin || "").replace(/\/$/, "");

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
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

  const { name, phone, location, preferred_date } = body || {};

  /* ============ VALIDATION ============ */
  if (!name || !phone || !location) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      required: ["name", "phone", "location"]
    });
  }

  /* ============ TWILIO CONFIG ============ */
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    ADMIN_WHATSAPP_TO,
    MUMBAI_WHATSAPP_TO,
    ADMIN_TEMPLATE_SID, // SID of admin_lead_alert_v2
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
      error: "SERVER_CONFIG_ERROR"
    });
  }

  /* ============ ROUTING LOGIC ============ */
  const city = location.trim().toUpperCase();
  const toNumber =
    city === "MUMBAI" && MUMBAI_WHATSAPP_TO
      ? MUMBAI_WHATSAPP_TO
      : ADMIN_WHATSAPP_TO;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  /* ============ SEND WHATSAPP TEMPLATE MESSAGE =========== */
  try {
    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM, // e.g. whatsapp:+919106963751
      to: toNumber,              // admin WhatsApp number
      contentSid: ADMIN_TEMPLATE_SID,
      contentVariables: JSON.stringify({
        "1": name,
        "2": phone,
        "3": location,
        "4": preferred_date || "Not specified"
      }),
    });

    console.log("WhatsApp sent successfully:", result.sid);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Twilio error:", err.message);
    return res.status(500).json({
      success: false,
      error: "TWILIO_ERROR",
      details: err.message
    });
  }
};

// api/whatsapp-notify.js
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

  /* ============ SAFE BODY NORMALIZATION ============ */
  let body = req.body;
  if (!body || typeof body !== "object") {
    try {
      body = JSON.parse(req.body || "{}");
    } catch (e) {
      body = {};
    }
  }

  console.log("Incoming payload:", body);

  const { name = "", phone = "", location = "", preferred_date = "" } = body;

  if (!name.trim() || !phone.trim() || !location.trim()) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      details: "name, phone, and location are required",
      received: body,
    });
  }

  /* ============ TWILIO CONFIG ============ */
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    ADMIN_TEMPLATE_SID,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !ADMIN_TEMPLATE_SID) {
    console.error("Missing Twilio environment variables");
    return res.status(500).json({ success: false, error: "SERVER_CONFIG_ERROR" });
  }

  /* ============ CITY → WHATSAPP NUMBER MAPPING ============ */
  const CITY_WHATSAPP_MAP = {
    MUMBAI:      "whatsapp:+919904545168",
    PUNE:        "whatsapp:+919904545168",
    DELHI:       "whatsapp:+919904545168",
    BANGALORE:   "whatsapp:+919904545168",
    CHANDIGARH:  "whatsapp:+919904545168",
    JALGAON:     "whatsapp:+919904545168",
    HYDERABAD:   "whatsapp:+919904545168",
    AURANGABAD:  "whatsapp:+919904545168",
    INDORE:      "whatsapp:+919904545168",
    CHENNAI:     "whatsapp:+919904545168",
  };

  const FALLBACK_NUMBER = "whatsapp:+919904545168";

  const cityKey = location.trim().toUpperCase();
  let toNumber = CITY_WHATSAPP_MAP[cityKey] || FALLBACK_NUMBER;

  console.log(`Sending WhatsApp notification for ${cityKey} → ${toNumber}`);

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  /* ============ SEND WHATSAPP TEMPLATE MESSAGE ============ */
  try {
    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: toNumber,
      contentSid: ADMIN_TEMPLATE_SID,
      // NO contentVariables — your approved template is static!
    });

    console.log("WhatsApp message sent successfully:", result.sid);
    return res.status(200).json({
      success: true,
      messageSid: result.sid,
      sentTo: toNumber,
    });
  } catch (err) {
    console.error("Twilio error:", err);

    return res.status(500).json({
      success: false,
      error: "TWILIO_ERROR",
      details: err.message,
      code: err.code || null,
      moreInfo: err.moreInfo || null,
    });
  }
};

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

  /* ============ SAFE BODY NORMALIZATION ============ */
  let body = req.body;

  // Handle empty or string body (safe for Vercel, Shopify, Postman, etc.)
  if (!body || typeof body !== "object") {
    try {
      body = JSON.parse(req.body || "{}");
    } catch (e) {
      body = {};
    }
  }

  console.log("Incoming payload:", body);

  const {
    name = "",
    phone = "",
    location = "",
    preferred_date = ""
  } = body;

  /* ============ DETAILED DEBUG LOG (remove in production if desired) ============ */
  console.log("Extracted values:", {
    name: `'${name}'`,
    phone: `'${phone}'`,
    location: `'${location}'`,
    nameTrimmedLength: name.trim().length,
    phoneTrimmedLength: phone.trim().length,
    locationTrimmedLength: location.trim().length,
  });

  /* ============ VALIDATION ============ */
  if (!name.trim() || !phone.trim() || !location.trim()) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      details: "name, phone, and location are required and cannot be empty/blank",
      received: body,
      trimmed: {
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
      },
    });
  }

  /* ============ TWILIO CONFIG ============ */
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    ADMIN_WHATSAPP_TO,
    MUMBAI_WHATSAPP_TO,
    ADMIN_TEMPLATE_SID,
  } = process.env;

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_WHATSAPP_FROM ||
    !ADMIN_WHATSAPP_TO ||
    !ADMIN_TEMPLATE_SID
  ) {
    console.error("Missing Twilio environment variables");
    return res.status(500).json({
      success: false,
      error: "SERVER_CONFIG_ERROR",
    });
  }

  /* ============ ROUTING LOGIC ============ */
  const city = location.trim().toUpperCase();
  const toNumber =
    city === "MUMBAI" && MUMBAI_WHATSAPP_TO
      ? MUMBAI_WHATSAPP_TO
      : ADMIN_WHATSAPP_TO;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  /* ============ SEND WHATSAPP TEMPLATE MESSAGE ============ */
  try {
    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: toNumber,
      contentSid: ADMIN_TEMPLATE_SID,
      // CRITICAL FIX: Pass contentVariables as OBJECT, not JSON string
      contentVariables: {
        "1": name.trim(),
        "2": phone.trim(),
        "3": location.trim(),
        "4": preferred_date?.trim() || "Not specified",
      },
    });

    console.log("WhatsApp message sent successfully:", result.sid);
    return res.status(200).json({ 
      success: true,
      messageSid: result.sid 
    });

  } catch (err) {
    console.error("Twilio error:", err);

    // More helpful error response
    return res.status(500).json({
      success: false,
      error: "TWILIO_ERROR",
      details: err.message,
      code: err.code || null,
      moreInfo: err.moreInfo || null,
    });
  }
};
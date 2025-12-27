// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();

// CORS: Allow only your Shopify store
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "https://amty-global.myshopify.com",
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Route: /api/whatsapp-notify
app.post("/api/whatsapp-notify", async (req, res) => {
  console.log("Incoming request body:", req.body);

  const {
    name = "",
    phone = "",
    location = "",
    preferred_date = "",
    email = "",
    message = ""
  } = req.body || {};

  // Validation: required fields
  if (!name.trim() || !phone.trim() || !location.trim()) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: name, phone, and location are required",
      received: req.body,
    });
  }

  // Config check
  const requiredEnv = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    "ADMIN_TEMPLATE_SID",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing env vars:", missing);
    return res.status(500).json({ success: false, error: "Server configuration error" });
  }

  // City-based routing
  const city = location.trim().toUpperCase();

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

  const FALLBACK_NUMBER = "whatsapp:+919904545168"; // Your main admin number

  let toNumber = CITY_WHATSAPP_MAP[city] || FALLBACK_NUMBER;

  console.log(`Sending to ${city} → ${toNumber}`);

  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      contentSid: process.env.ADMIN_TEMPLATE_SID, // HXf52bb56723fb508ac577baa7e637dbd7
      // REMOVED contentVariables entirely — template has no {{variables}}
    });

    console.log("WhatsApp template message sent successfully:", result.sid);
    return res.status(200).json({
      success: true,
      messageSid: result.sid,
      sentTo: toNumber,
    });
  } catch (err) {
    console.error("Twilio error:", err.message, err.code, err.moreInfo);

    return res.status(500).json({
      success: false,
      error: "Failed to send WhatsApp message",
      details: err.message,
      code: err.code || null,
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "WhatsApp notify backend running" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

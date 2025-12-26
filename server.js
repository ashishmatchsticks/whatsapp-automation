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

// Hardcoded city → WhatsApp number mapping (same as your previous working version)
const CITY_WHATSAPP_MAP = {
  MUMBAI:      "whatsapp:+919324088075",
  PUNE:        "whatsapp:+917620577347",
  DELHI:       "whatsapp:+918448654489",
  BANGALORE:   "whatsapp:+918511759373",
  CHANDIGARH:  "whatsapp:+918130324489",
  JALGAON:     "whatsapp:+919168456666",
  HYDERABAD:   "whatsapp:+918799655139",
  AURANGABAD:  "whatsapp:+919112283522",
  INDORE:      "whatsapp:+918319950609",
  CHENNAI:     "whatsapp:+918511759373",
  ITANAGAR:    "whatsapp:+919904545168", // fallback or correct later
};

// Fallback number (your main admin number)
const FALLBACK_WHATSAPP = process.env.ADMIN_WHATSAPP_TO || "whatsapp:+919904545168";

// Route: /api/whatsapp-notify
app.post("/api/whatsapp-notify", async (req, res) => {
  console.log("Incoming request body:", req.body);

  const {
    name = "",
    phone = "",
    location = "",
    preferred_date = ""
  } = req.body || {};

  // Validation
  if (!name.trim() || !phone.trim() || !location.trim()) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      details: "name, phone, and location are required",
      received: req.body,
    });
  }

  // Required env vars
  const requiredEnv = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    "ADMIN_TEMPLATE_SID",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing environment variables:", missing);
    return res.status(500).json({
      success: false,
      error: "Server configuration error",
    });
  }

  // Determine recipient based on city
  const cityKey = location.trim().toUpperCase().replace(/\s+/g, '');
  let toNumber = CITY_WHATSAPP_MAP[cityKey];

  if (!toNumber) {
    console.log(`City "${location}" (${cityKey}) not found → using fallback`);
    toNumber = FALLBACK_WHATSAPP;
  }

  console.log(`Sending WhatsApp notification to: ${toNumber} (City: ${location})`);

  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      contentSid: process.env.ADMIN_TEMPLATE_SID,
      // CRITICAL: Your current template has NO variables → send EMPTY object
      contentVariables: {}
    });

    console.log("WhatsApp message sent successfully:", result.sid);
    return res.status(200).json({
      success: true,
      messageSid: result.sid,
      sentTo: toNumber,
      city: location
    });

  } catch (err) {
    console.error("Twilio send failed:", {
      message: err.message,
      code: err.code,
      status: err.status,
      moreInfo: err.moreInfo
    });

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
  res.json({ status: "ok", message: "AMTY WhatsApp Notify Backend Running" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

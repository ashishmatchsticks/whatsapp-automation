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

app.use(express.json({ limit: "10mb" })); // Good for webhooks

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Route: /api/whatsapp-notify
app.post("/api/whatsapp-notify", async (req, res) => {
  // Log incoming payload for debugging
  console.log("Incoming request body:", req.body);

  const {
    name = "",
    phone = "",
    location = "",
    preferred_date = "", // optional
    email = "",          // optional
    message = ""         // optional, but can be used in fallback or logging
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
    "ADMIN_WHATSAPP_TO",
    "ADMIN_TEMPLATE_SID",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing env vars:", missing);
    return res.status(500).json({ success: false, error: "Server configuration error" });
  }

  // Routing: Mumbai-specific number if available
  const city = location.trim().toUpperCase();
  const toNumber =
    city === "MUMBAI" && process.env.MUMBAI_WHATSAPP_TO
      ? process.env.MUMBAI_WHATSAPP_TO
      : process.env.ADMIN_WHATSAPP_TO;

  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      contentSid: process.env.ADMIN_TEMPLATE_SID, // Your approved template SID
      contentVariables: {
        "1": name.trim(),
        "2": phone.trim(),
        "3": location.trim(),
        "4": preferred_date?.trim() || "Not specified",
        // Add more if your template has more variables (e.g. email, message)
      },
    });

    console.log("WhatsApp template message sent successfully:", result.sid);
    return res.status(200).json({
      success: true,
      messageSid: result.sid,
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

// Health check (optional but useful)
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "WhatsApp notify backend running" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

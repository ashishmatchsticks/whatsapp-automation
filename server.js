// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();

// Allow only your Shopify store to call this API
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
  })
);

app.use(express.json());

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Route that Shopify will call
app.post("/api/whatsapp-notify", async (req, res) => {
  try {
    const { name, email, phone, location, message } = req.body;

    if (!name || !phone || !location || !message) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const text =
      `New enquiry from website:\n` +
      `Name: ${name}\n` +
      `Email: ${email || "-"}\n` +
      `Phone: ${phone}\n` +
      `Location: ${location}\n` +
      `Message: ${message}`;

    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.ADMIN_WHATSAPP_TO,
      body: text,
    });

    console.log("WhatsApp sent, SID:", result.sid);
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending WhatsApp:", err);
    res.status(500).json({ success: false, error: "Failed to send WhatsApp" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Backend running on port", port);
});

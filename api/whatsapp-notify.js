// api/whatsapp-notify.js
const twilio = require("twilio");

module.exports = async (req, res) => {
  // Allow only POST
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  // CORS
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const { name, email, phone, location, message } = req.body;

    if (!name || !phone || !location || !message) {
      res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
      return;
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.ADMIN_WHATSAPP_TO,
      body:
        `New enquiry from Shopify:\n` +
        `Name: ${name}\n` +
        `Email: ${email || "-"}\n` +
        `Phone: ${phone}\n` +
        `Location: ${location}\n` +
        `Message: ${message}`
    });

    console.log("WhatsApp message SID:", result.sid);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

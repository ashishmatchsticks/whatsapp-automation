// api/send-demo.js  (Vercel serverless function)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.amtyglobal.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // WhatsApp
    let whatsappSuccess = false;
    try {
      const waRes = await fetch('https://whatsapp-automation.vercel.app/api/whatsapp-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name?.trim() || '',
          phone: data.fullPhone || '',
          location: data.location?.trim() || '',
          preferred_date: data.preferred_date || 'Not specified'
        })
      });
      const waJson = await waRes.json();
      whatsappSuccess = waRes.ok && waJson.success;
    } catch (err) {
      console.error('WhatsApp failed:', err);
    }

    // Resend
    let emailSuccess = false;
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY || "re_VA5cWCzb_6aMhya4V56c99i9MGin1NiWt"}`
        },
        body: JSON.stringify({
          from: 'AMTY Global <onboarding@resend.dev>',
          to: 'ashish.matchsticks@gmail.com', // change if needed
          subject: `New Demo Request - ${data.location || 'General'}`,
          html: `
            <h2>New Free Demo Booking</h2>
            <p><strong>Name:</strong> ${data.name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${data.fullPhone || 'N/A'}</p>
            <p><strong>Preferred Date:</strong> ${data.preferred_date || 'Not specified'}</p>
            <p><strong>Location:</strong> ${data.location || 'Not selected'}</p>
            <p><strong>Message:</strong> ${data.message || '(None)'}</p>
            <hr>
            <small>Sent from website • ${new Date().toLocaleString('en-IN')}</small>
          `
        })
      });
      emailSuccess = resendRes.ok;
      if (!resendRes.ok) console.error('Resend error:', await resendRes.json());
    } catch (err) {
      console.error('Resend failed:', err);
    }

    if (whatsappSuccess || emailSuccess) {
      return res.status(200).json({ success: true });
    }

    return res.status(500).json({ success: false, error: 'Both failed' });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

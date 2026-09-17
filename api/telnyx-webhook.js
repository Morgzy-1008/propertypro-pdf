export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  // CORS handling
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, telnyx-signature-ed25519, telnyx-timestamp");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Health check / validation ping (Telnyx often tests endpoint with GET)
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      service: "Hudson CRM Telnyx Webhook",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const payload = req.body;
    const event = payload?.data;
    const eventType = event?.event_type;

    console.log(`[Telnyx Webhook] Received event: ${eventType}`);

    // Handle inbound SMS messages from clients
    if (eventType === "message.received") {
      const messageData = event.payload;
      const fromNumber = messageData?.from?.phone_number;
      const text = messageData?.text;
      const messageId = messageData?.id;
      const receivedAt = event.occurred_at || new Date().toISOString();

      console.log(`[Telnyx Webhook] Inbound SMS from ${fromNumber}: "${text}" (ID: ${messageId})`);
    }

    // Always respond with 200 OK to acknowledge receipt to Telnyx
    return res.status(200).json({
      received: true,
      eventType: eventType || "unknown",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Telnyx Webhook Error]:", error);
    // Still return 200 so Telnyx does not repeatedly retry on parsing errors
    return res.status(200).json({
      received: true,
      error: error.message,
    });
  }
}

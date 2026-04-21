import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} received for shop: ${shop}`);
  console.log(`[GDPR] Payload:`, JSON.stringify(payload, null, 2));

  // Our app does NOT collect customer PII (name, email, address)
  // We only store orderId, orderName, productId, carrier, trackingId
  // No action needed - just acknowledge

  // If your app DID collect PII, you would:
  // 1. Query your DB for customer's data
  // 2. Email it to the merchant within 30 days
  // 3. Log the request for compliance

  return new Response(null, { status: 200 });
};
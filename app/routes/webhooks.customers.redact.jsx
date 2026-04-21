import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} received for shop: ${shop}`);
  console.log(`[GDPR] Customer ID to redact:`, payload.customer?.id);

  // Our app doesn't store customer PII - nothing to delete
  // If you stored customer emails/names/addresses, delete them here:
  //
  // await db.customerData.deleteMany({
  //   where: { shop, customerId: payload.customer.id.toString() }
  // });

  return new Response(null, { status: 200 });
};
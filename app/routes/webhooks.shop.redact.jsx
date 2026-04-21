import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} received for shop: ${shop}`);
  console.log(`[GDPR] Deleting all data for shop: ${shop}`);

  // Delete ALL shop data — this fires 48 hours after uninstall
  try {
    const deletedTrackers = await db.shipmentTracker.deleteMany({
      where: { shop },
    });

    const deletedSessions = await db.session.deleteMany({
      where: { shop },
    });

    console.log(`[GDPR] Deleted ${deletedTrackers.count} trackers and ${deletedSessions.count} sessions for ${shop}`);
  } catch (error) {
    console.error(`[GDPR] Error deleting shop data:`, error);
  }

  return new Response(null, { status: 200 });
};
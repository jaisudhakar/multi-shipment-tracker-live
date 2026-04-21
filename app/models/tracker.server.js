import db from "../db.server";
import { getTrackingUrl } from "../utils/carriers";

export async function getTrackersByShop(shop) {
  return db.shipmentTracker.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTracker({
  shop, orderId, orderName, productId, productName, productImage,
  carrier, trackingId, customUrl,
}) {
  // Use custom URL if carrier is "Other", otherwise use predefined URL
  let trackingUrl = getTrackingUrl(carrier, trackingId);
  if (carrier === "Other" && customUrl) {
    trackingUrl = customUrl.replace("{trackingId}", trackingId);
  }

  return db.shipmentTracker.create({
    data: {
      shop, orderId, orderName, productId, productName, productImage,
      carrier, trackingId, trackingUrl,
    },
  });
}

export async function updateTracker(id, { carrier, trackingId, status }) {
  const trackingUrl = getTrackingUrl(carrier, trackingId);
  return db.shipmentTracker.update({
    where: { id: Number(id) },
    data: { carrier, trackingId, trackingUrl, status },
  });
}

export async function deleteTracker(id) {
  return db.shipmentTracker.delete({
    where: { id: Number(id) },
  });
}
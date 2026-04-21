// Full list of supported carriers
export const CARRIERS = [
  "DHL",
  "UPS",
  "FedEx",
  "USPS",
  "Royal Mail",
  "Australia Post",
  "Canada Post",
  "India Post",
  "Blue Dart",
  "DTDC",
  "Delhivery",
  "Aramex",
  "TNT",
  "Japan Post",
  "China Post",
  "Singapore Post",
  "PostNL",
  "Deutsche Post",
  "La Poste",
  "Correos",
  "Other",
];

// Tracking URL builder
export function getTrackingUrl(carrier, trackingId) {
  switch (carrier) {
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingId}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${trackingId}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingId}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingId}`;
    case "Royal Mail":
      return `https://www.royalmail.com/track-your-item#/tracking-results/${trackingId}`;
    case "Australia Post":
      return `https://auspost.com.au/mypost/track/#/details/${trackingId}`;
    case "Canada Post":
      return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingId}`;
    case "India Post":
      return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/TrackConsignment.aspx?ConsignmentNo=${trackingId}`;
    case "Blue Dart":
      return `https://www.bluedart.com/tracking?trackFor=0&trackNo=${trackingId}`;
    case "DTDC":
      return `https://www.dtdc.in/trace.asp?strCnno=${trackingId}`;
    case "Delhivery":
      return `https://www.delhivery.com/track/package/${trackingId}`;
    case "Aramex":
      return `https://www.aramex.com/track/results?mode=0&ShipmentNumber=${trackingId}`;
    case "TNT":
      return `https://www.tnt.com/express/en_us/site/shipping-tools/tracking.html?searchType=con&cons=${trackingId}`;
    case "Japan Post":
      return `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${trackingId}&locale=en`;
    case "China Post":
      return `https://track.chinapost.com.cn/result.do?billno=${trackingId}`;
    case "Singapore Post":
      return `https://www.singpost.com/track-items?trackid=${trackingId}`;
    case "PostNL":
      return `https://www.postnl.nl/en/tracktrace/?barcodes=${trackingId}`;
    case "Deutsche Post":
      return `https://www.deutschepost.de/sendung/simpleQuery.html?form.sendungsnummer=${trackingId}`;
    case "La Poste":
      return `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingId}`;
    case "Correos":
      return `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${trackingId}`;
    default:
      return null;
  }
}

// Maps carrier name to Shopify's expected format (for fulfillment emails)
// Shopify auto-recognizes these names — https://shopify.dev/docs/api/admin-graphql/latest/enums/ShippingLabelVoidReason
export function getShopifyCarrierName(carrier) {
  switch (carrier) {
    case "DHL":
      return "DHL Express";
    case "UPS":
      return "UPS";
    case "FedEx":
      return "FedEx";
    case "USPS":
      return "USPS";
    case "Royal Mail":
      return "Royal Mail";
    case "Australia Post":
      return "Australia Post";
    case "Canada Post":
      return "Canada Post";
    case "India Post":
      return "India Post";
    case "Blue Dart":
      return "Bluedart";
    case "DTDC":
      return "DTDC";
    case "Delhivery":
      return "Delhivery";
    case "Aramex":
      return "Aramex";
    case "TNT":
      return "TNT";
    case "Japan Post":
      return "Japan Post";
    case "China Post":
      return "China Post";
    case "Singapore Post":
      return "Singapore Post";
    case "PostNL":
      return "PostNL";
    case "Deutsche Post":
      return "Deutsche Post";
    case "La Poste":
      return "La Poste";
    case "Correos":
      return "Correos";
    default:
      return "Other";
  }
}

// Get carrier icon/color (for UI)
export function getCarrierBadgeColor(carrier) {
  const colors = {
    "DHL": "warning",
    "UPS": "attention",
    "FedEx": "info",
    "USPS": "info",
    "Royal Mail": "critical",
    "Australia Post": "info",
    "Canada Post": "critical",
    "India Post": "warning",
    "Blue Dart": "info",
    "DTDC": "warning",
    "Delhivery": "info",
    "Aramex": "warning",
    "TNT": "warning",
  };
  return colors[carrier] || "info";
}
import { useState, useEffect, useRef } from "react";
import { useNavigate, useFetcher, redirect } from "react-router";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { createTracker } from "../models/tracker.server";
import { getShopifyCarrierName } from "../utils/carriers";
import {
  Page, Card, FormLayout, TextField, Select, Button, Banner, Layout,
  Thumbnail, InlineStack, Text, Checkbox
} from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  try {
    const { hasActivePayment } = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true,
    });

    if (!hasActivePayment) {
      return redirect("/app/billing");
    }
  } catch (error) {
    console.error("Billing check failed:", error);
    // On billing error, redirect to billing page (safer than breaking)
    return redirect("/app/billing");
  }

  return {};
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // ---------- INTENT 1: Search Order ----------
  if (intent === "searchOrder") {
    const orderName = formData.get("orderName");
    const cleanName = orderName.startsWith("#") ? orderName : `#${orderName}`;

    const response = await admin.graphql(`
      query findOrder($q: String!) {
        orders(first: 1, query: $q) {
          edges {
            node {
              id
              name
              displayFulfillmentStatus
              customer { email firstName }
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    title
                    quantity
                    product {
                      id
                      featuredImage { url }
                    }
                  }
                }
              }
              fulfillmentOrders(first: 10) {
                edges {
                  node {
                    id
                    status
                    lineItems(first: 50) {
                      edges {
                        node {
                          id
                          lineItem { id }
                          remainingQuantity
                        }
                      }
                    }
                  }
                }
              }
              fulfillments(first: 10) {
                id
                status
                trackingInfo {
                  number
                  url
                  company
                }
              }
            }
          }
        }
      }
    `, {
      variables: { q: `name:${cleanName}` }
    });

    const data = await response.json();
    const edge = data.data?.orders?.edges?.[0];

    if (!edge) {
      return { searchError: `Order ${cleanName} not found.` };
    }

    return {
      order: {
        id: edge.node.id,
        name: edge.node.name,
        status: edge.node.displayFulfillmentStatus,
        customerEmail: edge.node.customer?.email || null,
        customerName: edge.node.customer?.firstName || "",
        products: edge.node.lineItems.edges.map((li) => ({
          id: li.node.product?.id || li.node.id,
          lineItemId: li.node.id,
          title: li.node.title,
          quantity: li.node.quantity,
          image: li.node.product?.featuredImage?.url || "",
        })),
        fulfillmentOrders: edge.node.fulfillmentOrders.edges.map((fo) => ({
          id: fo.node.id,
          status: fo.node.status,
          lineItems: fo.node.lineItems.edges.map((li) => ({
            id: li.node.id,
            lineItemId: li.node.lineItem.id,
            remainingQuantity: li.node.remainingQuantity,
          })),
        })),
        fulfillments: edge.node.fulfillments || [],
      },
    };
  }

  // ---------- INTENT 2: Save Tracker (+ optional email) ----------
  if (intent === "saveTracker") {
    const orderId       = formData.get("orderId");
    const orderName     = formData.get("orderName");
    const productId     = formData.get("productId");
    const productName   = formData.get("productName");
    const productImage  = formData.get("productImage");
    const lineItemId    = formData.get("lineItemId");
    const carrier       = formData.get("carrier");
    const trackingId    = formData.get("trackingId");
    const customUrl     = formData.get("customUrl") || "";
    const sendEmail     = formData.get("sendEmail") === "true";

    if (!orderId || !carrier || !trackingId) {
      return { error: "Order, Carrier, and Tracking ID are required." };
    }

    // Step A — Save to DB
    await createTracker({
      shop: session.shop,
      orderId, orderName, productId, productName, productImage,
      carrier, trackingId, customUrl,
    });

    // Step B — Send email via Shopify (if checked)
    let emailStatus = "not_sent";

    if (sendEmail) {
      try {
        const fulfillmentOrders    = JSON.parse(formData.get("fulfillmentOrders")    || "[]");
        const existingFulfillments = JSON.parse(formData.get("existingFulfillments") || "[]");

        // Look for an OPEN fulfillment order first
        const matchingFO = fulfillmentOrders.find((fo) =>
          fo.status === "OPEN" &&
          fo.lineItems.some((li) => li.lineItemId === lineItemId && li.remainingQuantity > 0)
        );

        if (matchingFO) {
          // CASE A: Order is UNFULFILLED → create new fulfillment
          const matchingLineItem = matchingFO.lineItems.find(
            (li) => li.lineItemId === lineItemId
          );

          const fulfillmentResponse = await admin.graphql(`
            mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
              fulfillmentCreate(fulfillment: $fulfillment) {
                fulfillment { id status trackingInfo { number url company } }
                userErrors { field message }
              }
            }
          `, {
            variables: {
              fulfillment: {
                lineItemsByFulfillmentOrder: [{
                  fulfillmentOrderId: matchingFO.id,
                  fulfillmentOrderLineItems: [{
                    id: matchingLineItem.id,
                    quantity: matchingLineItem.remainingQuantity,
                  }],
                }],
                trackingInfo: {
                  number: trackingId,
                  company: getShopifyCarrierName(carrier),
                },
                notifyCustomer: true,
              },
            },
          });

          const fulfillResult = await fulfillmentResponse.json();
          const userErrors = fulfillResult.data?.fulfillmentCreate?.userErrors || [];

          emailStatus = userErrors.length > 0
            ? `error: ${userErrors[0].message}`
            : "sent";

        } else if (existingFulfillments.length > 0) {
          // CASE B: Order is ALREADY FULFILLED → update tracking on existing fulfillment
          const latestFulfillment = existingFulfillments[existingFulfillments.length - 1];

          const updateResponse = await admin.graphql(`
            mutation fulfillmentTrackingInfoUpdate(
              $fulfillmentId: ID!,
              $trackingInfoInput: FulfillmentTrackingInput!,
              $notifyCustomer: Boolean
            ) {
              fulfillmentTrackingInfoUpdateV2(
                fulfillmentId: $fulfillmentId,
                trackingInfoInput: $trackingInfoInput,
                notifyCustomer: $notifyCustomer
              ) {
                fulfillment { id }
                userErrors { field message }
              }
            }
          `, {
            variables: {
              fulfillmentId: latestFulfillment.id,
              trackingInfoInput: {
                number: trackingId,
                company: getShopifyCarrierName(carrier),
              },
              notifyCustomer: true,
            },
          });

          const updateResult = await updateResponse.json();
          const userErrors = updateResult.data?.fulfillmentTrackingInfoUpdateV2?.userErrors || [];

          emailStatus = userErrors.length > 0
            ? `error: ${userErrors[0].message}`
            : "sent";

        } else {
          emailStatus = "no_fulfillment_available";
        }
      } catch (err) {
        emailStatus = `error: ${err.message}`;
      }
    }

    return { success: true, emailStatus };
  }

  return {};
};

export default function NewTracker() {
  const searchFetcher = useFetcher();
  const saveFetcher   = useFetcher();
  const navigate      = useNavigate();

  const [orderName, setOrderName]   = useState("");
  const [productId, setProductId]   = useState("");
  const [carrier, setCarrier]       = useState("DHL");
  const [trackingId, setTrackingId] = useState("");
  const [customUrl, setCustomUrl]   = useState("");
  const [sendEmail, setSendEmail]   = useState(true);

  const order = searchFetcher.data?.order || null;
  const searchError = searchFetcher.data?.searchError;

  const carrierOptions = [
    {
      title: "Global Couriers",
      options: [
        { label: "DHL", value: "DHL" },
        { label: "UPS", value: "UPS" },
        { label: "FedEx", value: "FedEx" },
        { label: "TNT", value: "TNT" },
        { label: "Aramex", value: "Aramex" },
      ],
    },
    {
      title: "United States",
      options: [
        { label: "USPS", value: "USPS" },
      ],
    },
    {
      title: "Europe",
      options: [
        { label: "Royal Mail (UK)", value: "Royal Mail" },
        { label: "PostNL (Netherlands)", value: "PostNL" },
        { label: "Deutsche Post (Germany)", value: "Deutsche Post" },
        { label: "La Poste (France)", value: "La Poste" },
        { label: "Correos (Spain)", value: "Correos" },
      ],
    },
    {
      title: "Asia Pacific",
      options: [
        { label: "India Post", value: "India Post" },
        { label: "Blue Dart (India)", value: "Blue Dart" },
        { label: "DTDC (India)", value: "DTDC" },
        { label: "Delhivery (India)", value: "Delhivery" },
        { label: "Japan Post", value: "Japan Post" },
        { label: "China Post", value: "China Post" },
        { label: "Singapore Post", value: "Singapore Post" },
        { label: "Australia Post", value: "Australia Post" },
      ],
    },
    {
      title: "Americas",
      options: [
        { label: "Canada Post", value: "Canada Post" },
      ],
    },
    {
      title: "Other",
      options: [
        { label: "Other / Custom", value: "Other" },
      ],
    },
  ];

  const productOptions = order?.products?.length > 0
    ? [
        { label: "-- Select Product --", value: "" },
        ...order.products.map((p) => ({
          label: `${p.title} (Qty: ${p.quantity})`,
          value: p.id,
        })),
      ]
    : [];

  const selectedProduct = order?.products?.find((p) => p.id === productId);

  const handleSearch = () => {
    if (!orderName.trim()) return;
    searchFetcher.submit({ intent: "searchOrder", orderName }, { method: "post" });
  };

  const handleSave = () => {
    saveFetcher.submit(
      {
        intent: "saveTracker",
        orderId: order?.id || "",
        orderName: order?.name || "",
        productId: selectedProduct?.id || "",
        productName: selectedProduct?.title || "",
        productImage: selectedProduct?.image || "",
        lineItemId: selectedProduct?.lineItemId || "",
        carrier,
        trackingId,
        customUrl,
        sendEmail: String(sendEmail),
        fulfillmentOrders: JSON.stringify(order?.fulfillmentOrders || []),
        existingFulfillments: JSON.stringify(order?.fulfillments || []),
      },
      { method: "post" }
    );
  };

  const alertShownRef = useRef(false);

  useEffect(() => {
    if (saveFetcher.data?.success && !alertShownRef.current) {
      alertShownRef.current = true;
      const emailStatus = saveFetcher.data.emailStatus;
      if (emailStatus === "sent") {
        shopify.toast.show("Tracker saved and email sent to customer!", { duration: 3000 });
      } else if (emailStatus === "not_sent") {
        shopify.toast.show("Tracker saved (email not sent)", { duration: 3000 });
      } else if (emailStatus === "no_fulfillment_available") {
        shopify.toast.show("Tracker saved, but no fulfillment available to send email", { duration: 4000 });
      } else {
        shopify.toast.show(`Tracker saved but email issue: ${emailStatus}`, { duration: 4000, isError: true });
      }
      navigate("/app");
    }
  }, [saveFetcher.data, navigate]);

  return (
    <Page
      title="Add Shipment Tracker"
      backAction={{ content: "Back", onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            {saveFetcher.data?.error && (
              <Banner tone="critical">{saveFetcher.data.error}</Banner>
            )}

            <FormLayout>
              <TextField
                label="Order Number"
                value={orderName}
                onChange={setOrderName}
                placeholder="#1001"
                autoComplete="off"
                connectedRight={
                  <Button
                    onClick={handleSearch}
                    loading={searchFetcher.state === "submitting"}
                  >
                    Find Order
                  </Button>
                }
              />

              {searchError && <Banner tone="warning">{searchError}</Banner>}

              {order && (
                <Banner tone="success">
                  Order <strong>{order.name}</strong> ({order.status}) loaded — {order.products.length} products.
                  {order.customerEmail && <> Customer: <strong>{order.customerEmail}</strong></>}
                </Banner>
              )}

              {order && (
                <Select
                  label="Select Product from Order"
                  options={productOptions}
                  value={productId}
                  onChange={setProductId}
                />
              )}

              {selectedProduct && (
                <InlineStack gap="200" blockAlign="center">
                  {selectedProduct.image && (
                    <Thumbnail source={selectedProduct.image} alt={selectedProduct.title} size="small" />
                  )}
                  <Text as="p" fontWeight="bold">{selectedProduct.title}</Text>
                </InlineStack>
              )}

              <Select
                label="Carrier"
                options={carrierOptions}
                value={carrier}
                onChange={setCarrier}
              />

              <TextField
                label="Tracking ID"
                value={trackingId}
                onChange={setTrackingId}
                placeholder="Enter tracking number"
                autoComplete="off"
              />

              {carrier === "Other" && (
                <TextField
                  label="Custom Tracking URL (Optional)"
                  value={customUrl}
                  onChange={setCustomUrl}
                  placeholder="https://example-carrier.com/track?id={trackingId}"
                  autoComplete="off"
                  helpText="Use {trackingId} as placeholder — it'll be replaced automatically"
                />
              )}

              <Checkbox
                label={
                  order?.customerEmail
                    ? `Send tracking email to customer (${order.customerEmail})`
                    : "Send tracking email to customer"
                }
                checked={sendEmail}
                onChange={setSendEmail}
                disabled={!order?.customerEmail}
                helpText={
                  !order?.customerEmail
                    ? "No customer email found on this order"
                    : "Uses Shopify's native fulfillment email"
                }
              />

              <Button
                variant="primary"
                onClick={handleSave}
                loading={saveFetcher.state === "submitting"}
                disabled={!order || !selectedProduct || !trackingId}
              >
                Save Tracker
              </Button>
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
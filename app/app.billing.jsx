import { useLoaderData } from "react-router";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import {
  Page, Card, Layout, Button, Text, Badge, BlockStack, InlineStack, List, Banner
} from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  try {
    const { hasActivePayment, appSubscriptions } = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true, // Set to false when launching on App Store
    });

    return {
      hasActivePayment,
      currentPlan: appSubscriptions?.[0] || null,
    };
  } catch (error) {
    console.error("Billing check error:", error);
    return { hasActivePayment: false, currentPlan: null };
  }
};

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  const returnUrl = `https://admin.shopify.com/store/${session.shop.replace(".myshopify.com", "")}/apps/${process.env.SHOPIFY_APP_NAME || "multi-shipment-tracker"}/app/billing`;

  await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: true,
    onFailure: async () =>
      billing.request({
        plan: MONTHLY_PLAN,
        isTest: true,
        returnUrl,
      }),
  });

  return null;
};

export default function Billing() {
  const { hasActivePayment, currentPlan } = useLoaderData();

  return (
    <Page title="Pricing & Billing">
      <Layout>
        <Layout.Section>
          {hasActivePayment && (
            <Banner tone="success" title="You're subscribed!">
              <p>You have an active subscription. Enjoy unlimited trackers!</p>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">Monthly Pro Plan</Text>
                {hasActivePayment && <Badge tone="success">Active</Badge>}
              </InlineStack>

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="p" variant="heading2xl">$9.99</Text>
                <Text as="span" variant="bodyLg" tone="subdued">/ month</Text>
              </InlineStack>

              <Banner tone="info">
                <p><strong>🎁 7-day FREE trial!</strong> No charge for first 7 days — cancel anytime.</p>
              </Banner>

              <Text as="h3" variant="headingMd">Plan includes:</Text>

              <List type="bullet">
                <List.Item>Unlimited shipment trackers</List.Item>
                <List.Item>20+ carrier support (DHL, UPS, FedEx, and more)</List.Item>
                <List.Item>Automatic customer email notifications</List.Item>
                <List.Item>Order & product integration</List.Item>
                <List.Item>Edit, delete, manage all trackers</List.Item>
                <List.Item>Custom tracking URL support</List.Item>
                <List.Item>Priority email support (24-hour response)</List.Item>
                <List.Item>Regular feature updates</List.Item>
              </List>

              {!hasActivePayment && (
                <form method="post">
                  <Button variant="primary" size="large" submit fullWidth>
                    Start 7-Day Free Trial
                  </Button>
                </form>
              )}

              {hasActivePayment && (
                <Banner tone="info">
                  <p>To cancel or change your plan, go to <strong>Shopify Admin → Settings → Apps and sales channels</strong>.</p>
                </Banner>
              )}

              <Text as="p" variant="bodySm" tone="subdued">
                Billed monthly. Cancel anytime from your Shopify admin.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
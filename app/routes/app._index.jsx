import { useLoaderData, useNavigate, useFetcher, useRevalidator } from "react-router";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import { getTrackersByShop } from "../models/tracker.server";
import {
  Page, Card, DataTable, Button, Badge, EmptyState, Layout, ButtonGroup, Thumbnail, InlineStack, Text
} from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const trackers = await getTrackersByShop(session.shop);
  return { trackers };
};

export default function Index() {
  const { trackers } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

useEffect(() => {
    if (fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.data, revalidator]);

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this tracker?")) {
      fetcher.submit({ id: String(id) }, {
        method: "post",
        action: "/api/trackers/delete",
      });
    }
  };

  const rows = trackers.map((t) => [
    t.orderName,
    <InlineStack gap="200" blockAlign="center" key={`prd-${t.id}`}>
      {t.productImage && <Thumbnail source={t.productImage} alt={t.productName} size="small" />}
      <Text as="span">{t.productName || "—"}</Text>
    </InlineStack>,
    t.carrier,
    t.trackingId,
    <a href={t.trackingUrl} target="_blank" rel="noreferrer" key={`link-${t.id}`}>Track</a>,
    <Badge tone={t.status === "delivered" ? "success" : "info"} key={`badge-${t.id}`}>{t.status}</Badge>,
    <ButtonGroup key={`btns-${t.id}`}>
      <Button size="slim" onClick={() => navigate(`/app/trackers/${t.id}`)}>Edit</Button>
      <Button
        size="slim"
        tone="critical"
        variant="primary"
        onClick={() => handleDelete(t.id)}
        loading={fetcher.state === "submitting"}
      >
        Delete
      </Button>
    </ButtonGroup>,
  ]);

  return (
    <Page
      title="Multi-Shipment Trackers"
      primaryAction={{
        content: "Add Tracker",
        onAction: () => navigate("/app/trackers/new"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            {trackers.length === 0 ? (
              <EmptyState
                heading="No trackers yet"
                action={{ content: "Add Tracker", onAction: () => navigate("/app/trackers/new") }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Add DHL or UPS tracking IDs to your orders.</p>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={["text","text","text","text","text","text","text"]}
                headings={["Order","Product","Carrier","Tracking ID","Link","Status","Action"]}
                rows={rows}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
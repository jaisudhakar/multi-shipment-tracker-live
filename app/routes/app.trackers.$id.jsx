import { useState } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { updateTracker, deleteTracker } from "../models/tracker.server";
import { CARRIERS } from "../utils/carriers";
import db from "../db.server";
import {
  Page, Card, FormLayout, TextField, Select, Button, ButtonGroup, Layout
} from "@shopify/polaris";

export const loader = async ({ request, params }) => {
  await authenticate.admin(request);
  const tracker = await db.shipmentTracker.findUnique({
    where: { id: Number(params.id) },
  });
  if (!tracker) throw new Response("Not Found", { status: 404 });
  return { tracker };
};

export const action = async ({ request, params }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteTracker(params.id);
    return { deleted: true };
  }

  await updateTracker(params.id, {
    carrier:    formData.get("carrier"),
    trackingId: formData.get("trackingId"),
    status:     formData.get("status"),
  });
  return { updated: true };
};

export default function EditTracker() {
  const { tracker } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [carrier, setCarrier]       = useState(tracker.carrier);
  const [trackingId, setTrackingId] = useState(tracker.trackingId);
  const [status, setStatus]         = useState(tracker.status);

  const carrierOptions = CARRIERS.map((c) => ({ label: c, value: c }));
  const statusOptions = ["pending","in_transit","out_for_delivery","delivered","exception"]
    .map((s) => ({ label: s, value: s }));

  const handleUpdate = () => {
    fetcher.submit({ carrier, trackingId, status }, { method: "post" });
  };

  const handleDelete = () => {
    if (confirm("Delete this tracker?")) {
      fetcher.submit({ intent: "delete" }, { method: "post" });
    }
  };

  if (fetcher.data?.updated || fetcher.data?.deleted) {
    navigate("/app");
  }

  return (
    <Page
      title={`Edit Tracker — ${tracker.orderName}`}
      backAction={{ content: "Back", onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <FormLayout>
              <Select label="Carrier" options={carrierOptions} value={carrier} onChange={setCarrier} />
              <TextField label="Tracking ID" value={trackingId} onChange={setTrackingId} autoComplete="off" />
              <Select label="Status" options={statusOptions} value={status} onChange={setStatus} />
              <ButtonGroup>
                <Button variant="primary" onClick={handleUpdate} loading={fetcher.state === "submitting"}>
                  Update
                </Button>
                <Button tone="critical" onClick={handleDelete}>
                  Delete
                </Button>
              </ButtonGroup>
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
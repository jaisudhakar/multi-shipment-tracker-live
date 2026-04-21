import { authenticate } from "../shopify.server";
import { deleteTracker } from "../models/tracker.server";

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id");

  if (!id) {
    return { error: "ID is required" };
  }

  await deleteTracker(id);
  return { success: true };
};
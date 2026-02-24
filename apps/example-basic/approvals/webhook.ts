/// <reference types="@acp/config/globals" />
import { getApproverWebhookUrl } from "@acp/env";

export default defineApprovalHandler({
  id: "webhook",
  request: async (payload) => {
    await fetch(getApproverWebhookUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
});

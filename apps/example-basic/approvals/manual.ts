/// <reference types="@acp/config/globals" />

export default defineApprovalHandler({
  id: "manual",
  request: async ({ taskId, decisionUrl }) => {
    console.log(`[approval] task created: ${taskId}`);
    console.log(`[approval] decide manually via: ${decisionUrl}`);
  },
});

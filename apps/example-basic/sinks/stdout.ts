/// <reference types="@acp/config/globals" />

export default defineSink({
  id: "stdout",
  write: async (event) => {
    const level = event.kind === "error" ? "error" : event.kind === "approval_required" ? "warn" : "info";
    console.log(JSON.stringify({ level, type: "acp_audit", event }));
  },
});

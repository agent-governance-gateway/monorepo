/// <reference types="@acp/config/globals" />

export default defineSink({
  id: "stdout",
  write: async (event) => {
    console.log(`[audit] ${event.kind} ${event.outcome?.status ?? ""}`.trim());
  },
});

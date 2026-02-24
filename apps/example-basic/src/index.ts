import configFactory from "../acp.config.js";
import { createGateway } from "@acp/gateway";
import { sleep } from "@acp/utils";
import { startApproverServer } from "./approver.js";
import { startUpstreamServer } from "./upstream.js";

async function main(): Promise<void> {
  const upstream = await startUpstreamServer();
  const approver = await startApproverServer();
  const gateway = await createGateway(configFactory, { cwd: new URL("..", import.meta.url).pathname });
  await gateway.start();

  const base = "http://localhost:3100";
  const headers = {
    "content-type": "application/json",
    "x-env": "prod",
    "x-agent-id": "agent-demo",
    "x-tenant-id": "tenant-demo",
    "x-acp-upstream-url": "http://localhost:3200/v1/chat/completions",
  };

  const first = await fetch(`${base}/invoke`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: "hello" }),
  });
  const approval = (await first.json()) as { approval_task_id: string; poll_url: string };
  console.log("approval_required:", approval);

  let state = "pending";
  for (let i = 0; i < 20; i += 1) {
    await sleep(200);
    const poll = await fetch(`${base}${approval.poll_url}`);
    const json = (await poll.json()) as { status: string };
    state = json.status;
    if (state === "approved") break;
  }

  const retry = await fetch(`${base}/invoke`, {
    method: "POST",
    headers: {
      ...headers,
      "x-acp-approval-task-id": approval.approval_task_id,
      "x-idempotency-key": "demo-1",
    },
    body: JSON.stringify({ prompt: "hello" }),
  });
  console.log("retry status:", retry.status, await retry.text());

  const retry2 = await fetch(`${base}/invoke`, {
    method: "POST",
    headers: {
      ...headers,
      "x-acp-approval-task-id": approval.approval_task_id,
      "x-idempotency-key": "demo-2",
    },
    body: JSON.stringify({ prompt: "hello" }),
  });
  console.log("second retry status:", retry2.status, await retry2.text());

  await gateway.stop();
  await approver.close();
  await upstream.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

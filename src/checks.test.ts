import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { ScanContext } from "./http.js";
import { runChecks } from "./checks.js";
import { allowLoopbackForTests } from "./safeurl.js";

allowLoopbackForTests(true);

async function uxStatus(status: number, body: string): Promise<{ status: string; evidence: string }> {
  const server = createServer((_req, res) => {
    res.writeHead(status, { "content-type": "text/html" });
    res.end(body);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    const ctx = new ScanContext(new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`));
    const [hit] = await runChecks(ctx, ["agent-friendly-ux"]);
    return { status: hit.status, evidence: hit.evidence };
  } finally {
    server.close();
  }
}

test("agent-friendly-ux: non-200 homepage is 'unavailable', 200 HTML with actions passes", async () => {
  const down = await uxStatus(404, "<html></html>");
  assert.equal(down.status, "fail");
  assert.match(down.evidence, /Homepage unavailable/);
  const ok = await uxStatus(200, "<html><body><button>Go</button></body></html>");
  assert.equal(ok.status, "pass");
});

import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";

function runBridge(discovery, messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), "scripts/slstening-agent-bridge.mjs")], {
      env: { ...process.env, SLISTENING_AGENT_DISCOVERY: discovery },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", () => {
      try { resolve(output.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line))); }
      catch (error) { reject(error); }
    });
    child.stdin.end(messages.map((message) => JSON.stringify(message)).join("\n") + "\n");
  });
}

function runPrintConfig(discovery) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), "scripts/slstening-agent-bridge.mjs"), "--print-config"], {
      env: { ...process.env, SLISTENING_AGENT_DISCOVERY: discovery },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("--print-config emits safe client configuration without discovery secrets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "slstening-bridge-config-"));
  const discovery = join(directory, "slstening-agent.json");
  const secret = "distinctive-print-config-secret-should-never-leak";
  await writeFile(discovery, JSON.stringify({
    endpoint: "http://127.0.0.1:43123/mcp",
    token: secret,
    bridgePath: "/opt/slistening/scripts/slstening-agent-bridge.mjs",
    protocolVersion: "2025-06-18",
  }));
  if (process.platform !== "win32") await chmod(discovery, 0o600);

  const result = await runPrintConfig(discovery);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    command: "node",
    args: ["/opt/slistening/scripts/slstening-agent-bridge.mjs"],
    protocolVersion: "2025-06-18",
  });
  assert.doesNotMatch(result.stdout, /token/i);
  assert.equal(result.stdout.includes(secret), false);
});

test("stdio bridge forwards MCP requests and preserves JSON-RPC errors", async () => {
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      const value = JSON.parse(body);
      const payload = value.method === "tools/list"
        ? { jsonrpc: "2.0", id: value.id, result: { tools: [] } }
        : { jsonrpc: "2.0", id: value.id, error: { code: -32601, message: "Method not found" } };
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(payload));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const directory = await mkdtemp(join(tmpdir(), "slstening-bridge-"));
  const discovery = join(directory, "slstening-agent.json");
  await writeFile(discovery, JSON.stringify({ endpoint: `http://127.0.0.1:${address.port}/mcp`, token: "test-token-test-token-test-token-test-token" }));
  if (process.platform !== "win32") await chmod(discovery, 0o600);
  const responses = await runBridge(discovery, [
    { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 2, method: "unknown", params: {} },
  ]);
  // Requests are forwarded concurrently, so transport response order is not
  // part of the JSON-RPC contract. Match each response by id to keep this
  // boundary test deterministic.
  const toolsList = responses.find((response) => response.id === 1);
  const unknown = responses.find((response) => response.id === 2);
  assert.deepEqual(toolsList?.result, { tools: [] });
  assert.equal(unknown?.error.code, -32601);
  await new Promise((resolve) => server.close(resolve));
});

test("stdio bridge forwards initialize and cancels an in-flight request", async () => {
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      const value = JSON.parse(body);
      if (value.method === "slow") {
        setTimeout(() => response.end(JSON.stringify({ jsonrpc: "2.0", id: value.id, result: {} })), 5_000);
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ jsonrpc: "2.0", id: value.id, result: { protocolVersion: "2025-06-18" } }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const directory = await mkdtemp(join(tmpdir(), "slstening-bridge-cancel-"));
  const discovery = join(directory, "slstening-agent.json");
  await writeFile(discovery, JSON.stringify({ endpoint: `http://127.0.0.1:${address.port}/mcp`, token: "test-token-test-token-test-token-test-token" }));
  if (process.platform !== "win32") await chmod(discovery, 0o600);
  const responses = await runBridge(discovery, [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "slow", params: {} },
    { jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 2 } },
  ]);
  const initialize = responses.find((response) => response.id === 1);
  const cancelled = responses.find((response) => response.id === 2);
  assert.equal(initialize?.result.protocolVersion, "2025-06-18");
  assert.equal(cancelled?.error.code, -32000);
  assert.match(cancelled?.error.message ?? "", /cancelled|APP_UNAVAILABLE/);
  await new Promise((resolve) => server.close(resolve));
});

test("stdio bridge normalizes a failed app connection", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  const directory = await mkdtemp(join(tmpdir(), "slstening-bridge-unavailable-"));
  const discovery = join(directory, "slstening-agent.json");
  await writeFile(discovery, JSON.stringify({ endpoint: `http://127.0.0.1:${address.port}/mcp`, token: "test-token-test-token-test-token-test-token" }));
  if (process.platform !== "win32") await chmod(discovery, 0o600);
  const responses = await runBridge(discovery, [
    { jsonrpc: "2.0", id: 3, method: "ping", params: {} },
  ]);
  assert.equal(responses[0].error.code, -32000);
  assert.match(responses[0].error.message, /^APP_UNAVAILABLE:/);
});

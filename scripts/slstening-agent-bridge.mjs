#!/usr/bin/env node

/**
 * SLstening's local MCP stdio bridge.
 *
 * The bridge never receives a Supabase token. It reads the owner-only
 * discovery file created by the running desktop app and forwards MCP JSON-RPC
 * messages to the app's loopback gateway.
 * Requires Node.js 18 or newer.
 */
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const MAX_LINE_BYTES = 1024 * 1024;
const MAX_PENDING = 8;
const REQUEST_TIMEOUT_MS = 30_000;
const CLOSE_DRAIN_TIMEOUT_MS = 1_000;
const pending = new Map();
const inFlight = new Set();
let closing = false;

function log(message) {
  process.stderr.write(`[slstening-agent] ${message}\n`);
}

function candidatePaths() {
  const candidates = [];
  if (process.env.SLISTENING_AGENT_DISCOVERY) candidates.push(process.env.SLISTENING_AGENT_DISCOVERY);
  if (process.env.TAURI_APP_DATA_DIR) candidates.push(join(process.env.TAURI_APP_DATA_DIR, "slstening-agent.json"));
  candidates.push(join(process.cwd(), "slstening-agent.json"));
  if (process.platform === "darwin") candidates.push(join(homedir(), "Library", "Application Support", "slistening", "slstening-agent.json"));
  if (process.platform === "win32" && process.env.APPDATA) candidates.push(join(process.env.APPDATA, "slistening", "slstening-agent.json"));
  if (process.env.XDG_DATA_HOME) candidates.push(join(process.env.XDG_DATA_HOME, "slistening", "slstening-agent.json"));
  candidates.push(join(homedir(), ".local", "share", "slistening", "slstening-agent.json"));
  return [...new Set(candidates)];
}

async function readDiscovery() {
  let lastError;
  for (const path of candidatePaths()) {
    try {
      const metadata = await stat(path);
      if (process.platform !== "win32" && (metadata.mode & 0o077) !== 0) {
        throw new Error("discovery file permissions must be owner-only");
      }
      const discovery = JSON.parse(await readFile(path, "utf8"));
      const endpoint = new URL(discovery.endpoint);
      if (endpoint.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(endpoint.hostname)) {
        throw new Error("discovery endpoint must be loopback HTTP");
      }
      if (typeof discovery.token !== "string" || discovery.token.length < 32) throw new Error("discovery file is incomplete");
      return discovery;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`SLstening is not running or discovery is unavailable: ${lastError?.message ?? "file not found"}`);
}

async function callApp(request, controller) {
  let discovery;
  let response;
  try {
    discovery = await readDiscovery();
    response = await fetch(discovery.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${discovery.token}`,
        host: new URL(discovery.endpoint).host,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    const message = String(error?.message ?? error);
    throw new Error(message.startsWith("APP_UNAVAILABLE:") ? message : `APP_UNAVAILABLE: ${message}`);
  }
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`APP_UNAVAILABLE: invalid gateway response (${response.status})`);
  }
  if (!response.ok) throw new Error(`APP_UNAVAILABLE: ${payload.error ?? response.status}`);
  return payload;
}

async function callAppWithTimeout(request, controller) {
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await callApp(request, controller);
  } finally {
    clearTimeout(timeout);
  }
}

function clientConfig(discovery) {
  const bridgePath = typeof discovery.bridgePath === "string" && discovery.bridgePath.length > 0
    ? discovery.bridgePath
    : process.argv[1];
  const config = {
    command: "node",
    args: [bridgePath],
  };
  if (typeof discovery.protocolVersion === "string" && discovery.protocolVersion.length > 0) {
    config.protocolVersion = discovery.protocolVersion;
  }
  return config;
}

function errorResponse(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleLine(line) {
  if (Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES) {
    process.stdout.write(`${JSON.stringify(errorResponse(null, -32600, "Request too large"))}\n`);
    return;
  }
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(`${JSON.stringify(errorResponse(null, -32700, "Parse error"))}\n`);
    return;
  }
  if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    if (request?.id !== undefined) process.stdout.write(`${JSON.stringify(errorResponse(request.id, -32600, "Invalid JSON-RPC request"))}\n`);
    return;
  }
  if (request.method === "notifications/cancelled") {
    const id = request.params?.requestId;
    const controller = pending.get(String(id));
    controller?.abort();
    return;
  }
  if (request.id === undefined) {
    // Forward notifications without creating a response on stdout.
    try { await callAppWithTimeout(request, new AbortController()); } catch (error) { log(error.message); }
    return;
  }
  if (pending.size >= MAX_PENDING) {
    process.stdout.write(`${JSON.stringify(errorResponse(request.id, -32000, "APP_BUSY: too many pending requests"))}\n`);
    return;
  }
  const controller = new AbortController();
  pending.set(String(request.id), controller);
  try {
    const response = await callAppWithTimeout(request, controller);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    const message = error?.name === "AbortError" ? "Request cancelled" : String(error?.message ?? error);
    process.stdout.write(`${JSON.stringify(errorResponse(request.id, -32000, message))}\n`);
  } finally {
    pending.delete(String(request.id));
  }
}

if (process.argv.includes("--print-config")) {
  try {
    process.stdout.write(`${JSON.stringify(clientConfig(await readDiscovery()))}\n`);
    process.exit(0);
  } catch (error) {
    log(error.message);
    process.exit(1);
  }
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  if (closing) return;
  const task = handleLine(line);
  inFlight.add(task);
  void task.then(() => inFlight.delete(task), () => inFlight.delete(task));
});
input.on("close", () => {
  closing = true;
  const finish = () => {
    for (const controller of pending.values()) controller.abort();
    process.exit(0);
  };
  if (inFlight.size === 0) {
    finish();
    return;
  }
  const timeout = setTimeout(finish, CLOSE_DRAIN_TIMEOUT_MS);
  void Promise.allSettled([...inFlight]).then(() => {
    clearTimeout(timeout);
    finish();
  });
});

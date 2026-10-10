import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Subprocess } from "bun";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const agentBaseUrl = "https://agent.timeweb.cloud/api/v1/cloud-ai/agents/test-agent/v1";
const processes: Subprocess[] = [];
const urls: Record<string, string> = {};
let requestNumber = 0;

async function start(mode: "agent" | "gateway" | "missing" | "invalid") {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = probe.port;
  await probe.stop(true);
  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port), HOST: "127.0.0.1", TEST_AI_PROVIDER: mode };
  delete env.AI_AGENT_BASE_URL;
  delete env.AI_AGENT_API_KEY;
  delete env.AI_GATEWAY_API_KEY;
  if (mode !== "gateway") env.AI_AGENT_BASE_URL = agentBaseUrl;
  if (mode === "agent" || mode === "invalid") env.AI_AGENT_API_KEY = "test-agent-key";
  if (mode === "invalid") env.AI_AGENT_BASE_URL = "https://example.invalid/v1";
  // Missing agent credentials must never silently use an existing Gateway key.
  env.AI_GATEWAY_API_KEY = "test-gateway-key";
  const child = Bun.spawn([process.execPath, "--preload", "./tests/mock-ai.ts", "./server.ts"], {
    cwd: root, env, stdout: "ignore", stderr: "inherit",
  });
  processes.push(child);
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(500) });
      if (response.ok) { urls[mode] = base; return; }
    } catch { /* Wait for the Bun server to bind its port. */ }
    await Bun.sleep(50);
  }
  throw new Error(`Chat test server did not start: ${mode}`);
}

async function send(mode: string, messages: { role: string; content: string }[], origin = urls[mode]) {
  return fetch(`${urls[mode]}/api/chat`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Real-IP": `test-client-${++requestNumber}`,
    },
    body: JSON.stringify({ messages }),
    signal: AbortSignal.timeout(15_000),
  });
}

beforeAll(async () => {
  await Promise.all([start("agent"), start("gateway"), start("missing"), start("invalid")]);
}, 10_000);

afterAll(async () => {
  for (const child of processes) child.kill();
  await Promise.all(processes.map(child => child.exited));
});

test("agent uses its own URL and token without model-specific generation parameters", async () => {
  const response = await send("agent", [{ role: "user", content: "Привет" }]);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ reply: "Привет. Я тут." });
});

test("legacy Gateway remains usable when no agent URL is configured", async () => {
  const response = await send("gateway", [{ role: "user", content: "Привет" }]);
  expect(response.status).toBe(200);
});

test("a configured agent needs its own token even when a Gateway key exists", async () => {
  const response = await send("missing", [{ role: "user", content: "Привет" }]);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Чат пока не настроен" });
});

test("invalid server configuration returns a controlled error", async () => {
  const response = await send("invalid", [{ role: "user", content: "Привет" }]);
  expect(response.status).toBe(503);
});

test("a long Russian conversation and 1200-character assistant replies remain valid", async () => {
  const messages = Array.from({ length: 9 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: "я".repeat(index % 2 === 0 ? 800 : 1200),
  }));
  expect(Buffer.byteLength(JSON.stringify({ messages }))).toBeGreaterThan(8192);
  const response = await send("agent", messages);
  expect(response.status).toBe(200);
});

test("a reply taking longer than Bun's default idle timeout still reaches the visitor", async () => {
  const response = await send("agent", [{ role: "user", content: "slow" }]);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ reply: "Привет. Я тут." });
}, 15_000);

test.each([
  ["unauthorized", 503], ["busy", 429], ["html", 502], ["timeout", 504], ["empty", 502],
])("upstream %s produces status %i without leaking credentials", async (content, status) => {
  const response = await send("agent", [{ role: "user", content }]);
  expect(response.status).toBe(status);
  const data = await response.json();
  expect(typeof data.error).toBe("string");
  expect(JSON.stringify(data)).not.toContain("test-agent-key");
});

test("a foreign origin cannot submit a chat request", async () => {
  const response = await send("agent", [{ role: "user", content: "Привет" }], "https://example.invalid");
  expect(response.status).toBe(403);
});

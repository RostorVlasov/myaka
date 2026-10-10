import { expect, test } from "bun:test";
import { chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const agentId = "test-agent-id";
const agentBaseUrl = `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/${agentId}/v1`;
const oldSettings = "AI_GATEWAY_API_KEY=test-existing-gateway-key\nOTHER_SETTING=keep\nAI_AGENT_BASE_URL=\nAI_AGENT_API_KEY=\n";

async function setup({ token = "test-new-agent-key", status = 200, response = "reply", baseUrl = agentBaseUrl } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "myaka-configure-chat-"));
  const filename = join(directory, ".env");
  const pm2File = join(directory, "pm2.txt");
  const requestFile = join(directory, "request.json");
  const bin = join(directory, "bin");
  try {
    await mkdir(bin);
    await writeFile(filename, oldSettings, { mode: 0o600 });
    await writeFile(join(bin, "pm2"), '#!/bin/sh\nprintf "%s\\n" "$*" > "$MYAKA_TEST_PM2_FILE"\n');
    await chmod(join(bin, "pm2"), 0o755);
    const child = Bun.spawn(["bash", join(root, "ops/configure-chat.sh")], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        NODE_OPTIONS: `--require=${join(root, "tests/mock-configure-chat.cjs")}`,
        MYAKA_ENV_FILE: filename,
        MYAKA_TEST_PM2_FILE: pm2File,
        MYAKA_TEST_REQUEST_FILE: requestFile,
        MYAKA_TEST_STATUS: String(status),
        MYAKA_TEST_RESPONSE: response,
      },
      stdin: new Blob([`${baseUrl}\n${token}\n`]), stdout: "pipe", stderr: "pipe",
    });
    const [code, stdout, stderr] = await Promise.all([
      child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
    ]);
    const request = await readFile(requestFile, "utf8").then(JSON.parse).catch(() => null);
    return {
      code, output: stdout + stderr, request,
      settings: await readFile(filename, "utf8"), permissions: (await stat(filename)).mode & 0o777,
      pm2: await readFile(pm2File, "utf8").catch(() => null),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("setup validates opaque tokens through the agent instead of comparing them with its ID", async () => {
  const result = await setup({ token: `Bearer ${agentId}` });
  expect(result.code).toBe(0);
  expect(result.request).toEqual({
    url: `${agentBaseUrl}/chat/completions`, method: "POST",
    headers: { Authorization: `Bearer ${agentId}`, "Content-Type": "application/json" },
    body: { messages: [{ role: "user", content: "Ответь одним словом: готово." }], stream: false },
  });
  expect(result.settings).toBe(oldSettings.replace("AI_AGENT_BASE_URL=\n", `AI_AGENT_BASE_URL=${agentBaseUrl}\n`)
    .replace("AI_AGENT_API_KEY=\n", `AI_AGENT_API_KEY=${agentId}\n`));
  expect(result.permissions).toBe(0o600);
  expect(result.pm2).toBe("restart myaka --update-env\n");
  expect(result.output).not.toContain(agentId);
});

test.each([401, 403, 404, 405, 429, 503])("setup reports HTTP %i without changing credentials or restarting the app", async status => {
  const result = await setup({ status });
  expect(result.code).toBe(1);
  expect(result.output).toContain(`HTTP ${status}`);
  expect(result.output).not.toContain("test-new-agent-key");
  expect(result.output).not.toContain("at [stdin]");
  expect(result.settings).toBe(oldSettings);
  expect(result.pm2).toBeNull();
});

test.each(["timeout", "network", "empty"])("setup preserves working settings when the agent returns %s", async response => {
  const result = await setup({ response });
  expect(result.code).toBe(1);
  expect(result.output).toContain("Не удалось настроить чат:");
  expect(result.output).not.toContain("test-new-agent-key");
  expect(result.settings).toBe(oldSettings);
  expect(result.pm2).toBeNull();
});

test("empty token is explained before any request or configuration change", async () => {
  const result = await setup({ token: "" });
  expect(result.code).toBe(1);
  expect(result.output).toContain("Токен не введён");
  expect(result.request).toBeNull();
  expect(result.settings).toBe(oldSettings);
  expect(result.pm2).toBeNull();
});

test("setup never sends a token to a URL outside the official agent API", async () => {
  const result = await setup({ baseUrl: "https://example.invalid/v1" });
  expect(result.code).toBe(1);
  expect(result.request).toBeNull();
  expect(result.settings).toBe(oldSettings);
  expect(result.pm2).toBeNull();
});

// Loaded only by the integration tests; no requests reach Timeweb or use real tokens.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith("https://agent.timeweb.cloud/") && !url.startsWith("https://api.timeweb.ai/")) {
    return nativeFetch(input, init);
  }
  const payload = JSON.parse(String(init?.body));
  const agent = process.env.TEST_AI_PROVIDER === "agent";
  const expectedUrl = agent
    ? `${process.env.AI_AGENT_BASE_URL}/chat/completions`
    : "https://api.timeweb.ai/v1/chat/completions";
  const expectedKey = agent ? "test-agent-key" : "test-gateway-key";
  if (url !== expectedUrl || new Headers(init?.headers).get("Authorization") !== `Bearer ${expectedKey}` ||
      payload.stream !== false || payload.messages[0]?.role !== "system" ||
      !payload.messages[0]?.content.includes("Ты Мяка") ||
      (agent && ("model" in payload || "temperature" in payload || "max_tokens" in payload)) ||
      (!agent && payload.model !== "dashscope/qwen3.5-plus")) {
    return Response.json({ error: "Incorrect upstream configuration" }, { status: 400 });
  }
  const message = payload.messages.at(-1)?.content;
  if (message === "slow") await Bun.sleep(11_000);
  if (message === "unauthorized") return Response.json({ error: expectedKey }, { status: 401 });
  if (message === "busy") return Response.json({ error: expectedKey }, { status: 429 });
  if (message === "html") return new Response("<html>Unavailable</html>", { status: 502 });
  if (message === "timeout") throw new DOMException("Timed out", "TimeoutError");
  if (message === "empty") return Response.json({ choices: [{ message: { content: "" } }] });
  return Response.json({ choices: [{ message: { content: "Привет. Я тут." } }] });
}) as typeof fetch;

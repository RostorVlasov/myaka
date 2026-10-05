import { realpath, stat } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

const port = Number(process.env.PORT || 2027);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const root = realpathSync(resolve(import.meta.dir, "dist/client"));
if (!existsSync(resolve(root, "index.html"))) {
  throw new Error("dist/client/index.html is missing. Run bun run build first.");
}

const chatLimits = new Map<string, { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number }>();
let activeChats = 0;

const chatHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const chatError = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: chatHeaders });

async function chat(request: Request, server: import("bun").Server<undefined>) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") === "https" ? "https:" : url.protocol;
  const expectedOrigin = proto + "//" + (request.headers.get("host") || url.host);
  if (request.headers.get("origin") !== expectedOrigin) return chatError(403, "Недоступно");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return chatError(415, "Ожидается JSON");

  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return chatError(503, "Чат пока не настроен");
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 8192) return chatError(413, "Сообщение слишком длинное");

  const ip = request.headers.get("x-real-ip") || server.requestIP(request)?.address || "unknown";
  const now = Date.now();
  if (chatLimits.size > 2000) {
    for (const [address, value] of chatLimits) if (now - value.dayStart > 86_400_000) chatLimits.delete(address);
  }
  const limit = chatLimits.get(ip) || { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
  if (now - limit.minuteStart >= 60_000) { limit.minuteStart = now; limit.minuteCount = 0; }
  if (now - limit.dayStart >= 86_400_000) { limit.dayStart = now; limit.dayCount = 0; }
  if (limit.minuteCount >= 6 || limit.dayCount >= 80 || activeChats >= 3) {
    return chatError(429, "Мяка немного устал. Попробуй позже");
  }

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return chatError(400, "Пустое сообщение");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        return chatError(413, "Сообщение слишком длинное");
      }
      chunks.push(value);
    }
    const raw = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch { return chatError(400, "Неверный JSON"); }
  if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages) ||
      body.messages.length < 1 || body.messages.length > 9 ||
      !body.messages.every((item: unknown) => item && typeof item === "object" &&
        "role" in item && (item.role === "user" || item.role === "assistant") &&
        "content" in item && typeof item.content === "string" &&
        item.content.trim().length > 0 && item.content.length <= 800) ||
      body.messages.at(-1).role !== "user") {
    return chatError(400, "Проверь сообщение");
  }

  limit.minuteCount++;
  limit.dayCount++;
  chatLimits.set(ip, limit);
  activeChats++;
  try {
    const response = await fetch("https://api.timeweb.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "dashscope/qwen3.5-plus",
        messages: [
          { role: "system", content: "Ты Мяка, выдуманный чёрный кот с характером. Ты спокойный, ленивый, чуть наглый и невозмутимый. Отвечай по-русски коротко и естественно, обычно 1-3 предложения. Не улыбайся постоянно, не сюсюкай, не изображай психолога. Ты любишь тёплые места, коробки и смотреть в окно. Если спрашивают, кто отвечает, честно скажи, что ты персонаж, которому помогает нейросеть. Не придумывай факты о посетителе или создателях. Если человек пишет о немедленной опасности для себя, отложи шутки, предложи позвать находящегося рядом человека и обратиться в местную экстренную службу." },
          ...body.messages,
        ],
        max_tokens: 180,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error("AI Gateway returned", response.status);
      return chatError(502, "Мяка не смог ответить. Попробуй позже");
    }
    const result: unknown = await response.json();
    const reply = result && typeof result === "object" && "choices" in result &&
      Array.isArray(result.choices) ? result.choices[0]?.message?.content : null;
    if (typeof reply !== "string" || !reply.trim()) return chatError(502, "Мяка задумался. Попробуй позже");
    return new Response(JSON.stringify({ reply: reply.trim().slice(0, 1200) }), { headers: chatHeaders });
  } catch (error) {
    console.error("AI Gateway request failed:", error instanceof Error ? error.name : "unknown");
    return chatError(502, "Мяка не смог ответить. Попробуй позже");
  } finally {
    activeChats--;
  }
}

const server = Bun.serve({
  hostname: process.env.HOST || "127.0.0.1",
  port,
  async fetch(request, server) {
    if (new URL(request.url).pathname === "/api/chat") {
      if (request.method !== "POST") return chatError(405, "Метод не поддерживается");
      return chat(request, server);
    }
    const head = request.method === "HEAD";
    if (request.method !== "GET" && !head) {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return new Response(head ? null : JSON.stringify({
        ok: true,
        app: "myaka",
        release: process.env.MYAKA_RELEASE_ID || "local",
      }), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response(head ? null : "Bad request", { status: 400 });
    }
    if (pathname.includes("\\") || pathname.includes("\0") ||
        pathname.split("/").some((segment) => segment.startsWith("."))) {
      return new Response(head ? null : "Not found", { status: 404 });
    }

    const candidate = resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
    if (!candidate.startsWith(`${root}${sep}`)) {
      return new Response(head ? null : "Not found", { status: 404 });
    }

    try {
      const filename = await realpath(candidate);
      if (!filename.startsWith(`${root}${sep}`) || !(await stat(filename)).isFile()) {
        return new Response(head ? null : "Not found", { status: 404 });
      }
      const file = Bun.file(filename);
      const immutable = pathname.startsWith("/_next/static/");
      const cache = immutable ? "public, max-age=31536000, immutable"
        : /\.(html|txt|xml|rsc)$/.test(filename) ? "no-cache"
        : "public, max-age=3600";
      return new Response(head ? null : file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-Length": String(file.size),
          "Cache-Control": cache,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") console.error("Static file error:", error);
      return new Response(head ? null : "Not found", { status: 404 });
    }
  },
});

console.log(`Myaka is listening on http://${server.hostname}:${server.port}`);
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    await server.stop(true);
    process.exit(0);
  });
}

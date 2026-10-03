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

const server = Bun.serve({
  hostname: process.env.HOST || "127.0.0.1",
  port,
  async fetch(request) {
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

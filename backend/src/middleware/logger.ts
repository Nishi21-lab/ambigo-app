import type { MiddlewareHandler } from "hono";

export const logger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  const status = c.res.status;
  console.log(`[HTTP] ${method} ${path} → ${status} (${ms}ms)`);
};

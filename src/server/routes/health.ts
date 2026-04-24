import { Hono } from "hono";

export const health = new Hono().get("/", (c) =>
  c.json({
    ok: true,
    service: "elf",
    version: "0.1.0",
    time: new Date().toISOString()
  })
);

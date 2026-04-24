import { Hono } from "hono";
import { z } from "zod";

const Body = z.object({
  email: z.string().email()
});

/**
 * Waitlist signup. Stub: validates and logs only.
 * Wire to a `waitlist_signups` table + Resend confirmation in a later sprint.
 */
export const waitlist = new Hono().post("/", async (c) => {
  let body: unknown;
  try {
    const ct = c.req.header("content-type") ?? "";
    body = ct.includes("application/json")
      ? await c.req.json()
      : Object.fromEntries((await c.req.formData()).entries());
  } catch {
    return c.json({ error: "invalid_body" }, 400);
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_email", issues: parsed.error.issues }, 400);
  }

  console.log("[waitlist] signup:", parsed.data.email);

  // Form posts get redirected back to landing with ?joined=1 so we can flash UI later.
  const ct = c.req.header("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return c.redirect("/?joined=1", 303);
  }
  return c.json({ ok: true });
});

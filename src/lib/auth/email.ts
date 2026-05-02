/**
 * Magic-link email delivery.
 *
 * Transport selection (in order):
 *   1. Brevo SMTP (primary) — requires BREVO_SMTP_USER + BREVO_SMTP_PASS.
 *      Sends from BREVO_FROM, which must be a verified single-sender or
 *      verified-domain address in your Brevo account.
 *   2. Resend (fallback) — requires RESEND_API_KEY + RESEND_FROM.
 *   3. Console (dev) — prints the magic-link URL to the server log so you
 *      can sign in locally without configuring any provider.
 *
 * Keeping multiple providers means a hackathon judge with no email setup
 * still gets a working sign-in flow via the console fallback.
 */

type MagicLinkArgs = {
  email: string;
  url: string;
};

export async function sendMagicLinkEmail({ email, url }: MagicLinkArgs): Promise<void> {
  if (process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
    await sendViaBrevo({ email, url });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendViaResend({ email, url });
    return;
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n[magic-link] ${email}\n  ${url}\n  (set BREVO_SMTP_USER + BREVO_SMTP_PASS to deliver via email)\n`
  );
}

async function sendViaBrevo({ email, url }: MagicLinkArgs): Promise<void> {
  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST ?? "smtp-relay.brevo.com",
    port: Number(process.env.BREVO_SMTP_PORT ?? 587),
    secure: false, // STARTTLS on 587
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS
    }
  });

  const from = process.env.BREVO_FROM ?? process.env.BREVO_SMTP_USER ?? "noreply@elf.so";

  await transporter.sendMail({
    from,
    to: email,
    subject: "Sign in to elf",
    html: magicLinkHtml(url),
    text: `Sign in to elf: ${url}\n\nThis link expires in 15 minutes.`
  });
}

async function sendViaResend({ email, url }: MagicLinkArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Sign in to elf",
    html: magicLinkHtml(url),
    text: `Sign in to elf: ${url}\n\nThis link expires in 15 minutes.`
  });
  if (error) throw new Error(`resend send failed: ${error.message}`);
}

function magicLinkHtml(url: string): string {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F1EFE8;font-family:-apple-system,Inter,system-ui,sans-serif;color:#2C2C2A">
    <div style="max-width:520px;margin:0 auto;padding:48px 24px">
      <h1 style="font-family:'DM Serif Display',serif;font-weight:400;font-size:28px;color:#0F3D2B;margin:0 0 24px">elf</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px">Click the button below to sign in. This link expires in 15 minutes.</p>
      <a href="${url}" style="display:inline-block;background:#0F6E56;color:#F1EFE8;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px">Sign in to elf</a>
      <p style="font-size:13px;color:#5F5E5A;margin:32px 0 0">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </body>
</html>
  `.trim();
}

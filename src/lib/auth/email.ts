/**
 * Magic-link email delivery.
 *
 * Production: sends via Resend using RESEND_API_KEY + RESEND_FROM.
 * Dev fallback: prints the magic-link URL to the server console so you can
 *   click through during local development without an email provider.
 *
 * This keeps sign-in flows fully functional for hackathon judges who
 * haven't set RESEND_API_KEY.
 */

type MagicLinkArgs = {
  email: string;
  url: string;
};

export async function sendMagicLinkEmail({ email, url }: MagicLinkArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "noreply@elf.so";

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[magic-link] ${email}\n  ${url}\n  (set RESEND_API_KEY to deliver via email)\n`
    );
    return;
  }

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

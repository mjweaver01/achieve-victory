import { Resend } from 'resend';

export async function sendDiscountEmail(
  email: string,
  code: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY or RESEND_FROM_EMAIL is not set');
  }

  const storeUrl =
    process.env.SHOPIFY_STORE_URL ??
    process.env.BUN_PUBLIC_STORE_URL ??
    'https://shop.madeon.com';

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: 'Your Madeon discount code 🎵',
    html: `
      <p>Thank you for playing.</p>
      <p>Use code <strong>${code}</strong> at checkout for your discount.</p>
      <p><a href="${storeUrl}">Shop now</a></p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

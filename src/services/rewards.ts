import { customAlphabet } from 'nanoid';
import {
  findOrCreateCustomer,
  isShopifyConfigured,
  mintDiscountCode,
} from './shopify';
import { isResendConfigured, sendDiscountEmail } from './resend';

const devCodeId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

export function useMockRewards(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.DEV_MOCK_REWARDS === 'false') return false;
  return !isShopifyConfigured() || !isResendConfigured();
}

export function isRewardSystemConfigured(): boolean {
  if (useMockRewards()) return true;
  return isShopifyConfigured() && isResendConfigured();
}

export async function resendRewardEmail(
  email: string,
  code: string
): Promise<{ mock: boolean }> {
  if (useMockRewards()) {
    console.log(`[dev] Resend code for ${email}: ${code}`);
    return { mock: true };
  }

  await sendDiscountEmail(email, code);
  return { mock: false };
}

export async function fulfillReward(
  email: string
): Promise<{ code: string; shopifyCustomerId: string }> {
  if (useMockRewards()) {
    return {
      code: `MADEON-DEV-${devCodeId()}`,
      shopifyCustomerId: 'dev-mock',
    };
  }

  const { customerId } = await findOrCreateCustomer(email);
  const code = await mintDiscountCode(customerId);
  await sendDiscountEmail(email, code);
  return { code, shopifyCustomerId: customerId };
}

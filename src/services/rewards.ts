import { customAlphabet } from 'nanoid';
import {
  findOrCreateCustomer,
  isShopifyConfigured,
  mintDiscountCode,
} from './shopify';
import { isResendConfigured, sendDiscountEmail } from './resend';

const devCodeId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

export class RewardEmailDeliveryError extends Error {
  code: string;
  shopifyCustomerId: string;

  constructor(message: string, code: string, shopifyCustomerId: string) {
    super(message);
    this.name = 'RewardEmailDeliveryError';
    this.code = code;
    this.shopifyCustomerId = shopifyCustomerId;
  }
}

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
  try {
    await sendDiscountEmail(email, code);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not send reward email';
    throw new RewardEmailDeliveryError(message, code, customerId);
  }
  return { code, shopifyCustomerId: customerId };
}

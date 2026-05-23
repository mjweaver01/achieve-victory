import { customAlphabet } from 'nanoid';
import {
  findOrCreateCustomer,
  isShopifyConfigured,
  mintDiscountCode,
} from './shopify';

const devCodeId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

export function useMockRewards(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.DEV_MOCK_REWARDS === 'false') return false;
  return !isShopifyConfigured();
}

export function isRewardSystemConfigured(): boolean {
  if (useMockRewards()) return true;
  return isShopifyConfigured();
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
  return { code, shopifyCustomerId: customerId };
}

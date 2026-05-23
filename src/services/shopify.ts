import { customAlphabet } from 'nanoid';
import { getDiscountPercent } from './discount';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function shopDomain(): string {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN;
  if (!domain) throw new Error('SHOPIFY_SHOP_DOMAIN is not set');
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function adminToken(): string {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!token) throw new Error('SHOPIFY_ADMIN_TOKEN is not set');
  return token;
}

function apiBase(): string {
  return `https://${shopDomain()}/admin/api/2024-04`;
}

async function shopifyFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${apiBase()}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminToken(),
      ...init?.headers,
    },
  });
}

export async function findOrCreateCustomer(
  email: string
): Promise<{ customerId: string }> {
  const searchRes = await shopifyFetch(
    `/customers/search.json?query=email:${encodeURIComponent(email)}`
  );
  if (!searchRes.ok) {
    throw new Error(`Shopify customer search failed: ${searchRes.status}`);
  }

  const searchData = (await searchRes.json()) as {
    customers?: { id: number }[];
  };
  const existing = searchData.customers?.[0];
  if (existing) {
    return { customerId: String(existing.id) };
  }

  const createRes = await shopifyFetch('/customers.json', {
    method: 'POST',
    body: JSON.stringify({
      customer: { email, verified_email: true },
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Shopify customer create failed: ${createRes.status}`);
  }

  const createData = (await createRes.json()) as {
    customer: { id: number };
  };
  return { customerId: String(createData.customer.id) };
}

export async function mintDiscountCode(
  customerId: string
): Promise<string> {
  const percent = getDiscountPercent();
  const value = `-${percent}.0`;

  const ruleRes = await shopifyFetch('/price_rules.json', {
    method: 'POST',
    body: JSON.stringify({
      price_rule: {
        title: `MADEON-GAME-${customerId}`,
        value_type: 'percentage',
        value,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        starts_at: new Date().toISOString(),
        customer_selection: 'prerequisite',
        prerequisite_customer_ids: [Number(customerId)],
        usage_limit: 1,
        once_per_customer: true,
      },
    }),
  });
  if (!ruleRes.ok) {
    throw new Error(`Shopify price rule create failed: ${ruleRes.status}`);
  }

  const ruleData = (await ruleRes.json()) as {
    price_rule: { id: number };
  };
  const priceRuleId = ruleData.price_rule.id;
  const code = `MADEON-${nanoid()}`;

  const codeRes = await shopifyFetch(
    `/price_rules/${priceRuleId}/discount_codes.json`,
    {
      method: 'POST',
      body: JSON.stringify({ discount_code: { code } }),
    }
  );
  if (!codeRes.ok) {
    throw new Error(`Shopify discount code create failed: ${codeRes.status}`);
  }

  return code;
}

export function isShopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_ADMIN_TOKEN && process.env.SHOPIFY_SHOP_DOMAIN);
}

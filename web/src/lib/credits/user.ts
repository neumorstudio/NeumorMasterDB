import { createHash } from 'crypto';
import { getServerEnv } from '@/lib/env';

export type UserCreditStatus = {
  ok: boolean;
  user_id?: string;
  period_start?: string;
  plan_code?: string;
  subscription_status?: string;
  monthly_credits?: number;
  used_credits?: number;
  remaining_credits?: number;
  required_credits?: number;
  charged?: boolean;
  message?: string;
};

type RpcError = { message?: string };

export function buildQueryFingerprint(raw: string) {
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export async function getUserCreditStatus(userId: string) {
  return callRpc<UserCreditStatus>('get_user_credit_status', { p_user_id: userId });
}

export async function consumeUserSearchCredit(args: {
  userId: string;
  cost?: number;
  endpoint?: string;
  queryFingerprint?: string | null;
}) {
  return callRpc<UserCreditStatus>('consume_user_search_credit', {
    p_user_id: args.userId,
    p_cost: args.cost ?? 1,
    p_endpoint: args.endpoint ?? 'items_search',
    p_query_fingerprint: args.queryFingerprint ?? null,
  });
}

async function callRpc<T>(fnName: string, payload: Record<string, unknown>): Promise<T> {
  const { supabaseKey, supabaseUrl } = getServerEnv();
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as RpcError | null;
    throw new Error(`RPC ${fnName} failed (${response.status}): ${body?.message ?? 'unknown error'}`);
  }

  return (await response.json()) as T;
}

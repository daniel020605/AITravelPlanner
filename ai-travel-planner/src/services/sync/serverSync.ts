import type { TravelPlan, Expense } from '../../types';
import { useConfigStore } from '../../stores/configStore';

function base() {
  const cfg = useConfigStore.getState().config || {};
  const url = (cfg.sync_api_base || 'http://localhost:4000').replace(/\/+$/, '');
  return { url };
}

export function isEnabled(): boolean {
  // 启用条件：配置了同步服务地址
  const { url } = base();
  return !!url;
}

export async function fetchPlans(userId: string): Promise<TravelPlan[]> {
  const { url } = base();
  const cfg = useConfigStore.getState().config || {};
  const headers: Record<string, string> = {};
  if (cfg.sync_api_key) headers['X-API-KEY'] = cfg.sync_api_key as string;
  const resp = await fetch(`${url}/api/travel_plans?user_id=${encodeURIComponent(userId)}`, { headers });
  if (!resp.ok) throw new Error(`fetchPlans failed: ${resp.status}`);
  const rows = await resp.json();
  return rows as TravelPlan[];
}

export async function upsertPlan(plan: TravelPlan): Promise<void> {
  const { url } = base();
  const cfg = useConfigStore.getState().config || {};
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.sync_api_key) headers['X-API-KEY'] = cfg.sync_api_key as string;
  const resp = await fetch(`${url}/api/travel_plans`, {
    method: 'POST',
    headers,
    body: JSON.stringify(plan)
  });
  if (!resp.ok) throw new Error(`upsertPlan failed: ${resp.status}`);
}

export async function deletePlan(planId: string): Promise<void> {
  const { url } = base();
  const cfg = useConfigStore.getState().config || {};
  const headers: Record<string, string> = {};
  if (cfg.sync_api_key) headers['X-API-KEY'] = cfg.sync_api_key as string;
  const resp = await fetch(`${url}/api/travel_plans/${encodeURIComponent(planId)}`, { method: 'DELETE', headers });
  if (!resp.ok) throw new Error(`deletePlan failed: ${resp.status}`);
}

export async function upsertExpense(expense: Expense): Promise<void> {
  const { url } = base();
  const cfg = useConfigStore.getState().config || {};
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.sync_api_key) headers['X-API-KEY'] = cfg.sync_api_key as string;
  const resp = await fetch(`${url}/api/expenses`, {
    method: 'POST',
    headers,
    body: JSON.stringify(expense)
  });
  if (!resp.ok) throw new Error(`upsertExpense failed: ${resp.status}`);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { url } = base();
  const cfg = useConfigStore.getState().config || {};
  const headers: Record<string, string> = {};
  if (cfg.sync_api_key) headers['X-API-KEY'] = cfg.sync_api_key as string;
  const resp = await fetch(`${url}/api/expenses/${encodeURIComponent(expenseId)}`, { method: 'DELETE', headers });
  if (!resp.ok) throw new Error(`deleteExpense failed: ${resp.status}`);
}
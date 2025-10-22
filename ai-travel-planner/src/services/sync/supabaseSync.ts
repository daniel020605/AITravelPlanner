// Supabase 云端同步层（使用 REST API）
// 需要在 Settings 中配置 supabase_url 与 supabase_anon_key
// 要求 Supabase 已建表 travel_plans 与 expenses，且 travel_plans.itinerary 为 JSONB

import type { TravelPlan, Expense } from '../../types';
import { useConfigStore } from '../../stores/configStore';

type Json = any;

function base() {
  const cfg = useConfigStore.getState().config || {};
  const url = (cfg.supabase_url || '').replace(/\/+$/, '');
  const key = (cfg.supabase_anon_key || '').trim();
  return { url, key };
}

export function isEnabled(): boolean {
  const { url, key } = base();
  return !!(url && key);
}

function headers() {
  const { key } = base();
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  } as Record<string, string>;
}

// travel_plans: id(text), user_id(text), title, destination, start_date, end_date,
// budget(numeric), travelers(int4), preferences(jsonb), itinerary(jsonb),
// expenses_agg(可不需要), created_at(timestamptz), updated_at(timestamptz)

export async function fetchPlans(userId: string): Promise<TravelPlan[]> {
  if (!isEnabled()) return [];
  const { url } = base();
  
  try {
    const resp = await fetch(`${url}/rest/v1/travel_plans?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
      method: 'GET',
      headers: headers()
    });
    
    if (!resp.ok) {
      throw new Error(`Supabase fetchPlans failed: ${resp.status} ${resp.statusText}`);
    }
    
    const rows: any[] = await resp.json();

    return rows.map(row => ({
      id: String(row.id),
      user_id: String(row.user_id),
      title: String(row.title),
      destination: String(row.destination),
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      budget: Number(row.budget) || 0,
      travelers: Number(row.travelers) || 1,
      preferences: Array.isArray(row.preferences) ? row.preferences : [],
      itinerary: Array.isArray(row.itinerary) ? row.itinerary : [],
      expenses: Array.isArray(row.expenses) ? row.expenses : [],
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    })) as TravelPlan[];
  } catch (error) {
    console.error('Supabase fetchPlans error:', error);
    throw error;
  }
}

export async function fetchPlanById(planId: string): Promise<TravelPlan | null> {
  if (!isEnabled()) return null;
  const { url } = base();
  try {
    const resp = await fetch(`${url}/rest/v1/travel_plans?id=eq.${encodeURIComponent(planId)}&select=*`, {
      method: 'GET',
      headers: headers()
    });
    if (!resp.ok) {
      throw new Error(`Supabase fetchPlanById failed: ${resp.status} ${resp.statusText}`);
    }
    const rows: any[] = await resp.json();
    if (!rows || rows.length === 0) return null;
    const row: any = rows[0];
    const plan: TravelPlan = {
      id: String(row.id),
      user_id: String(row.user_id),
      title: String(row.title),
      destination: String(row.destination),
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      budget: Number(row.budget) || 0,
      travelers: Number(row.travelers) || 1,
      preferences: Array.isArray(row.preferences) ? row.preferences : [],
      itinerary: Array.isArray(row.itinerary) ? row.itinerary : [],
      expenses: Array.isArray(row.expenses) ? row.expenses : [],
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
    return plan;
  } catch (error) {
    console.error('Supabase fetchPlanById error:', error);
    throw error;
  }
}

export async function upsertPlan(plan: TravelPlan): Promise<void> {
  if (!isEnabled()) return;
  const { url } = base();
  
  try {
    const payload: any = {
      ...plan,
      // 确保存为 JSON
      preferences: plan.preferences as Json,
      itinerary: plan.itinerary as Json,
      expenses: plan.expenses as Json
    };
    
    // First try POST (insert)
    const resp = await fetch(`${url}/rest/v1/travel_plans`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    });
    
    // If conflict (409), try PATCH (update)
    if (resp.status === 409) {
      const updateResp = await fetch(`${url}/rest/v1/travel_plans?id=eq.${encodeURIComponent(plan.id)}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(payload)
      });
      
      if (!updateResp.ok && updateResp.status !== 200 && updateResp.status !== 204) {
        throw new Error(`Supabase upsertPlan update failed: ${updateResp.status} ${updateResp.statusText}`);
      }
    } else if (!resp.ok && resp.status !== 201) {
      throw new Error(`Supabase upsertPlan failed: ${resp.status} ${resp.statusText}`);
    }
  } catch (error) {
    console.error('Supabase upsertPlan error:', error);
    throw error;
  }
}

export async function deletePlan(planId: string): Promise<void> {
  if (!isEnabled()) return;
  const { url } = base();
  
  try {
    const resp = await fetch(`${url}/rest/v1/travel_plans?id=eq.${encodeURIComponent(planId)}`, {
      method: 'DELETE',
      headers: headers()
    });
    
    if (!resp.ok && resp.status !== 200 && resp.status !== 204) {
      throw new Error(`Supabase deletePlan failed: ${resp.status} ${resp.statusText}`);
    }
  } catch (error) {
    console.error('Supabase deletePlan error:', error);
    throw error;
  }
}

// expenses: id(text), travel_plan_id(text), category(text), amount(numeric),
// description(text), date(date), location(jsonb)
export async function upsertExpense(expense: Expense): Promise<void> {
  if (!isEnabled()) return;
  const { url } = base();
  
  try {
    const payload: any = { ...expense };
    
    // First try POST (insert)
    const resp = await fetch(`${url}/rest/v1/expenses`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    });
    
    // If conflict (409), try PATCH (update)
    if (resp.status === 409) {
      const updateResp = await fetch(`${url}/rest/v1/expenses?id=eq.${encodeURIComponent(expense.id)}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(payload)
      });
      
      if (!updateResp.ok && updateResp.status !== 200 && updateResp.status !== 204) {
        throw new Error(`Supabase upsertExpense update failed: ${updateResp.status} ${updateResp.statusText}`);
      }
    } else if (!resp.ok && resp.status !== 201) {
      throw new Error(`Supabase upsertExpense failed: ${resp.status} ${resp.statusText}`);
    }
  } catch (error) {
    console.error('Supabase upsertExpense error:', error);
    throw error;
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (!isEnabled()) return;
  const { url } = base();
  
  try {
    const resp = await fetch(`${url}/rest/v1/expenses?id=eq.${encodeURIComponent(expenseId)}`, {
      method: 'DELETE',
      headers: headers()
    });
    
    if (!resp.ok && resp.status !== 200 && resp.status !== 204) {
      throw new Error(`Supabase deleteExpense failed: ${resp.status} ${resp.statusText}`);
    }
  } catch (error) {
    console.error('Supabase deleteExpense error:', error);
    throw error;
  }
}
// Supabase 云端同步层
// 需要在 Settings 中配置 supabase_url 与 supabase_anon_key

import type { TravelPlan, Expense } from '../../types';
import { getSupabaseClient } from './supabaseClient';
import { useAuthStore } from '../../stores/authStore';

function ensureClient() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase 未配置');
  }
  return supabase;
}

export function isEnabled(): boolean {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const user = useAuthStore.getState().user;
  return !!user;
}

function mapPlan(row: any): TravelPlan {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title),
    destination: String(row.destination),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    budget: Number(row.budget) || 0,
    travelers: Number(row.travelers) || 1,
    preferences: Array.isArray(row.preferences) ? row.preferences : (row.preferences ?? []),
    itinerary: Array.isArray(row.itinerary) ? row.itinerary : (row.itinerary ?? []),
    expenses: Array.isArray(row.expenses) ? row.expenses : (row.expenses ?? []),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

type QueryResult<T> = { data: T | null; error: { message?: string } | null; };

async function handleQuery<T>(promise: Promise<QueryResult<T>>, context: string): Promise<T | null> {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`${context} 失败: ${error.message || error}`);
  }
  return data;
}

export async function fetchPlans(userId: string): Promise<TravelPlan[]> {
  if (!userId) return [];
  const supabase = ensureClient();
  const data = await handleQuery(
    supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    'Supabase fetchPlans'
  );
  return (data || []).map(mapPlan);
}

export async function fetchPlanById(planId: string): Promise<TravelPlan | null> {
  if (!planId) return null;
  const supabase = ensureClient();
  const data = await handleQuery(
    supabase
      .from('travel_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle(),
    'Supabase fetchPlanById'
  );
  return data ? mapPlan(data) : null;
}

export async function upsertPlan(plan: TravelPlan): Promise<void> {
  if (!plan.user_id) {
    throw new Error('缺少 user_id，无法同步行程计划');
  }
  const supabase = ensureClient();
  await handleQuery(
    supabase
      .from('travel_plans')
      .upsert({
        ...plan,
        preferences: plan.preferences ?? [],
        itinerary: plan.itinerary ?? [],
        expenses: plan.expenses ?? [],
      }, { onConflict: 'id' }),
    'Supabase upsertPlan'
  );
}

export async function deletePlan(planId: string): Promise<void> {
  if (!planId) return;
  const supabase = ensureClient();
  await handleQuery(
    supabase
      .from('travel_plans')
      .delete()
      .eq('id', planId),
    'Supabase deletePlan'
  );
}

export async function upsertExpense(expense: Expense): Promise<void> {
  if (!expense.travel_plan_id) {
    throw new Error('缺少 travel_plan_id，无法同步费用记录');
  }
  const supabase = ensureClient();
  await handleQuery(
    supabase
      .from('expenses')
      .upsert(expense, { onConflict: 'id' }),
    'Supabase upsertExpense'
  );
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (!expenseId) return;
  const supabase = ensureClient();
  await handleQuery(
    supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId),
    'Supabase deleteExpense'
  );
}

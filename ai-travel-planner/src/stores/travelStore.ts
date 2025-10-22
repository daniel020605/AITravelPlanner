import { create } from 'zustand';
import type { TravelPlan, ItineraryItem, Expense } from '../types/index';
import * as srv from '../services/sync/serverSync';
import * as supabaseSync from '../services/sync/supabaseSync';
import { useAuthStore } from './authStore';

interface TravelState {
  currentPlan: TravelPlan | null;
  plans: TravelPlan[];
  isLoading: boolean;
  error: string | null;

  // 同步状态
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncAt?: string;

  // 手动触发同步
  syncNow?: () => Promise<void>;

  // 行程规划
  createPlan: (plan: Omit<TravelPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updatePlan: (id: string, updates: Partial<TravelPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  loadPlans: () => Promise<void>;
  fetchPlanById: (id: string) => Promise<TravelPlan | null>;

  // 行程项目管理
  addItineraryItem: (item: Omit<ItineraryItem, 'id'>) => Promise<void>;
  updateItineraryItem: (id: string, updates: Partial<ItineraryItem>) => Promise<void>;
  removeItineraryItem: (id: string) => Promise<void>;

  // 费用管理
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;

  // AI生成行程
  generateItinerary: (request: {
    destination: string;
    days: number;
    budget: number;
    travelers: number;
    preferences: string[];
    start_date: string;
  }) => Promise<ItineraryItem[]>;

  clearError: () => void;
  setCurrentPlan: (plan: TravelPlan | null) => void;
}

const LS_PLANS_KEY = 'travel-plans';
const LS_CURRENT_PLAN_ID_KEY = 'travel-current-plan-id';

function savePlansToStorage(plans: TravelPlan[]) {
  try {
    localStorage.setItem(LS_PLANS_KEY, JSON.stringify(plans));
  } catch {}
}
function loadPlansFromStorage(): TravelPlan[] {
  try {
    const raw = localStorage.getItem(LS_PLANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveCurrentPlanId(id: string | null) {
  try {
    if (id) localStorage.setItem(LS_CURRENT_PLAN_ID_KEY, id);
    else localStorage.removeItem(LS_CURRENT_PLAN_ID_KEY);
  } catch {}
}
function loadCurrentPlanId(): string | null {
  try {
    return localStorage.getItem(LS_CURRENT_PLAN_ID_KEY);
  } catch {
    return null;
  }
}

export const useTravelStore = create<TravelState>((set, get) => ({
  currentPlan: null,
  plans: [],
  isLoading: false,
  error: null,
  syncStatus: 'idle',
  lastSyncAt: undefined,

  createPlan: async (planData) => {
    set({ isLoading: true, error: null });
    try {
      const plan: TravelPlan = {
        ...planData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set(state => {
        const newPlans = [...state.plans, plan];
        // 持久化
        savePlansToStorage(newPlans);
        saveCurrentPlanId(plan.id);
        return {
          plans: newPlans,
          currentPlan: plan,
          isLoading: false
        };
      });

      // 云端同步（不阻塞 UI）
      try {
        // 优先使用 Supabase 同步
        if (supabaseSync.isEnabled()) {
          await supabaseSync.upsertPlan(plan);
        } else if (srv.isEnabled()) {
          // 回退到服务器同步
          await srv.upsertPlan(plan);
        }
      } catch (e) {
        console.warn('Cloud upsertPlan failed:', e);
      }

      return plan.id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create plan',
        isLoading: false
      });
      return '';
    }
  },

  updatePlan: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      let updatedPlanRef: TravelPlan | null = null;
      set(state => {
        const updatedPlans = state.plans.map(plan => {
          if (plan.id === id) {
            const p = { ...plan, ...updates, updated_at: new Date().toISOString() };
            updatedPlanRef = p;
            return p;
          }
          return plan;
        });
        const updatedCurrent = state.currentPlan?.id === id
          ? { ...state.currentPlan, ...updates, updated_at: new Date().toISOString() }
          : state.currentPlan;

        // 持久化
        savePlansToStorage(updatedPlans);
        if (updatedCurrent?.id) saveCurrentPlanId(updatedCurrent.id);

        return {
          plans: updatedPlans,
          currentPlan: updatedCurrent,
          isLoading: false
        };
      });

      // 云端同步
      try {
        if (updatedPlanRef) {
          // 优先使用 Supabase 同步
          if (supabaseSync.isEnabled()) {
            await supabaseSync.upsertPlan(updatedPlanRef);
          } else if (srv.isEnabled()) {
            // 回退到服务器同步
            await srv.upsertPlan(updatedPlanRef);
          }
        }
      } catch (e) {
        console.warn('Cloud upsertPlan (update) failed:', e);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update plan',
        isLoading: false
      });
    }
  },

  deletePlan: async (id) => {
    set({ isLoading: true, error: null });
    try {
      set(state => {
        const newPlans = state.plans.filter(plan => plan.id !== id);
        const newCurrent = state.currentPlan?.id === id ? null : state.currentPlan;

        // 持久化
        savePlansToStorage(newPlans);
        saveCurrentPlanId(newCurrent ? newCurrent.id : null);

        return {
          plans: newPlans,
          currentPlan: newCurrent,
          isLoading: false
        };
      });

      // 云端同步
      try {
        // 优先使用 Supabase 同步
        if (supabaseSync.isEnabled()) {
          await supabaseSync.deletePlan(id);
        } else if (srv.isEnabled()) {
          // 回退到服务器同步
          await srv.deletePlan(id);
        }
      } catch (e) {
        console.warn('Cloud deletePlan failed:', e);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete plan',
        isLoading: false
      });
    }
  },

  loadPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const stored = loadPlansFromStorage();
      const currentId = loadCurrentPlanId();

      let plans = stored;
      let cloud: TravelPlan[] = [];
      const user = useAuthStore.getState().user;

      // 优先从 Supabase 获取数据
      if (supabaseSync.isEnabled() && user?.id) {
        try {
          cloud = await supabaseSync.fetchPlans(user.id);
        } catch (e) {
          console.warn('Supabase fetchPlans failed, fallback to server or local:', e);
          // 回退到服务器同步
          if (srv.isEnabled() && user?.id) {
            try {
              cloud = await srv.fetchPlans(user.id);
            } catch (e) {
              console.warn('Server fetchPlans failed, fallback to local:', e);
            }
          }
        }
      } else if (srv.isEnabled() && user?.id) {
        // 如果 Supabase 不可用，尝试服务器同步
        try {
          cloud = await srv.fetchPlans(user.id);
        } catch (e) {
          console.warn('Server fetchPlans failed, fallback to local:', e);
        }
      }

      // 合并策略：按 id 合并，取 updated_at 较新的版本
      const map = new Map<string, TravelPlan>();
      for (const p of plans) map.set(p.id, p);
      for (const c of cloud) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        } else {
          const l = map.get(c.id)!;
          const lt = new Date(l.updated_at).getTime();
          const ct = new Date(c.updated_at).getTime();
          map.set(c.id, ct >= lt ? c : l);
        }
      }
      plans = Array.from(map.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const current = currentId ? plans.find(p => p.id === currentId) || null : null;

      // 持久化合并结果
      savePlansToStorage(plans);
      if (current?.id) saveCurrentPlanId(current.id);

      set({
        plans,
        currentPlan: current,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load plans',
        isLoading: false
      });
    }
  },

  fetchPlanById: async (id: string) => {
    try {
      // 先查本地
      const localList = loadPlansFromStorage();
      const localHit = localList.find(p => p.id === id) || null;
      if (localHit) {
        // 更新状态并返回
        set(state => {
          const exists = state.plans.find(p => p.id === id);
          const mergedPlans = exists ? state.plans.map(p => p.id === id ? localHit : p) : [...state.plans, localHit];
          savePlansToStorage(mergedPlans);
          saveCurrentPlanId(localHit.id);
          return { plans: mergedPlans, currentPlan: localHit };
        });
        return localHit;
      }

      // 云端
      let cloud: TravelPlan | null = null;
      if (supabaseSync.isEnabled()) {
        try { cloud = await supabaseSync.fetchPlanById(id); } catch (e) { console.warn('Supabase fetchPlanById failed:', e); }
      }
      if (!cloud && srv.isEnabled()) {
        try { cloud = await srv.fetchPlanById(id); } catch (e) { console.warn('Server fetchPlanById failed:', e); }
      }

      if (cloud) {
        set(state => {
          const exists = state.plans.find(p => p.id === id);
          const mergedPlans = exists ? state.plans.map(p => p.id === id ? cloud! : p) : [...state.plans, cloud!];
          savePlansToStorage(mergedPlans);
          saveCurrentPlanId(cloud!.id);
          return { plans: mergedPlans, currentPlan: cloud };
        });
        return cloud;
      }

      return null;
    } catch {
      return null;
    }
  },

  addItineraryItem: async (itemData) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const item: ItineraryItem = {
      ...itemData,
      id: Date.now().toString(),
    };

    const updatedItinerary = [...currentPlan.itinerary, item];
    get().updatePlan(currentPlan.id, { itinerary: updatedItinerary });
  },

  updateItineraryItem: async (id, updates) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const updatedItinerary = currentPlan.itinerary.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    get().updatePlan(currentPlan.id, { itinerary: updatedItinerary });
  },

  removeItineraryItem: async (id) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const updatedItinerary = currentPlan.itinerary.filter(item => item.id !== id);
    get().updatePlan(currentPlan.id, { itinerary: updatedItinerary });
  },

  addExpense: async (expenseData) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const expense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
    };

    const updatedExpenses = [...currentPlan.expenses, expense];
    get().updatePlan(currentPlan.id, { expenses: updatedExpenses });

    // 云端同步
    try {
      // 优先使用 Supabase 同步
      if (supabaseSync.isEnabled()) {
        await supabaseSync.upsertExpense(expense);
        // 同步整单以确保汇总一致
        const updatedPlan = { ...currentPlan, expenses: updatedExpenses };
        await supabaseSync.upsertPlan(updatedPlan);
      } else if (srv.isEnabled()) {
        // 回退到服务器同步
        await srv.upsertExpense(expense);
        // 同步整单以确保汇总一致
        const updatedPlan = { ...currentPlan, expenses: updatedExpenses };
        await srv.upsertPlan(updatedPlan);
      }
    } catch (e) {
      console.warn('Cloud upsertExpense failed:', e);
    }
  },

  updateExpense: async (id, updates) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const updatedExpenses = currentPlan.expenses.map(expense =>
      expense.id === id ? { ...expense, ...updates } : expense
    );
    get().updatePlan(currentPlan.id, { expenses: updatedExpenses });

    // 云端同步
    try {
      const target = updatedExpenses.find(e => e.id === id);
      if (target) {
        // 优先使用 Supabase 同步
        if (supabaseSync.isEnabled()) {
          await supabaseSync.upsertExpense(target);
          const updatedPlan = { ...currentPlan, expenses: updatedExpenses };
          await supabaseSync.upsertPlan(updatedPlan);
        } else if (srv.isEnabled()) {
          // 回退到服务器同步
          await srv.upsertExpense(target);
          const updatedPlan = { ...currentPlan, expenses: updatedExpenses };
          await srv.upsertPlan(updatedPlan);
        }
      }
    } catch (e) {
      console.warn('Cloud updateExpense failed:', e);
    }
  },

  removeExpense: async (id) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const updatedExpenses = currentPlan.expenses.filter(expense => expense.id !== id);
    get().updatePlan(currentPlan.id, { expenses: updatedExpenses });

    // 云端同步
    try {
      // 优先使用 Supabase 同步
      if (supabaseSync.isEnabled()) {
        await supabaseSync.deleteExpense(id);
        const updatedPlan = { ...currentPlan, expenses: updatedExpenses };
        await supabaseSync.upsertPlan(updatedPlan);
      } else if (srv.isEnabled()) {
        // 回退到服务器同步
        await srv.deleteExpense(id);
        const updatedPlan = { ...currentPlan, expenses: updatedExpenses };
        await srv.upsertPlan(updatedPlan);
      }
    } catch (e) {
      console.warn('Cloud removeExpense failed:', e);
    }
  },

  generateItinerary: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const { openaiService } = await import('../services/ai/openaiService');
      const response = await openaiService.generateItinerary(request);

      set({ isLoading: false });
      return response.itinerary;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate itinerary',
        isLoading: false
      });
      return [];
    }
  },

  clearError: () => set({ error: null }),

  // 手动同步：将本地较新的计划上推，拉取云端并合并，然后落盘
  syncNow: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const user = useAuthStore.getState().user;
      if (!user?.id) {
        set({ syncStatus: 'error' });
        return;
      }
      
      const local = loadPlansFromStorage();
      let cloud: TravelPlan[] = [];
      
      // 优先从 Supabase 同步
      if (supabaseSync.isEnabled()) {
        try {
          cloud = await supabaseSync.fetchPlans(user.id);
        } catch (e) {
          console.warn('Supabase fetchPlans failed in syncNow:', e);
          // 回退到服务器同步
          if (srv.isEnabled()) {
            try {
              cloud = await srv.fetchPlans(user.id);
            } catch (e) {
              console.warn('Server fetchPlans failed in syncNow:', e);
            }
          }
        }
      } else if (srv.isEnabled()) {
        // 如果 Supabase 不可用，尝试服务器同步
        try {
          cloud = await srv.fetchPlans(user.id);
        } catch (e) {
          console.warn('Server fetchPlans failed in syncNow:', e);
        }
      }

      // 合并与决策：较新者胜，缺失的补齐
      const index = new Map<string, { local?: TravelPlan; cloud?: TravelPlan }>();
      for (const p of local) index.set(p.id, { ...(index.get(p.id) || {}), local: p });
      for (const c of cloud) index.set(c.id, { ...(index.get(c.id) || {}), cloud: c });

      const merged: TravelPlan[] = [];
      const toPush: TravelPlan[] = [];

      for (const [, pair] of index.entries()) {
        const l = pair.local;
        const c = pair.cloud;
        if (l && c) {
          const lt = new Date(l.updated_at).getTime();
          const ct = new Date(c.updated_at).getTime();
          if (lt >= ct) {
            merged.push(l);
            toPush.push(l);
          } else {
            merged.push(c);
          }
        } else if (l && !c) {
          merged.push(l);
          toPush.push(l);
        } else if (!l && c) {
          merged.push(c);
        }
      }

      // 上推本地较新的记录
      for (const p of toPush) {
        try {
          // 优先使用 Supabase 同步
          if (supabaseSync.isEnabled()) {
            await supabaseSync.upsertPlan(p);
          } else if (srv.isEnabled()) {
            // 回退到服务器同步
            await srv.upsertPlan(p);
          }
        } catch (e) {
          console.warn('Cloud upsertPlan(syncNow) failed:', e);
        }
      }

      merged.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      savePlansToStorage(merged);
      const currentId = loadCurrentPlanId();
      const current = currentId ? merged.find(p => p.id === currentId) || null : null;

      set({
        plans: merged,
        currentPlan: current,
        syncStatus: 'success',
        lastSyncAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('syncNow failed:', e);
      set({ syncStatus: 'error' });
    }
  },

  setCurrentPlan: (plan) => {
    saveCurrentPlanId(plan ? plan.id : null);
    set({ currentPlan: plan });
  },
}));
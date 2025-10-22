import { useEffect, useMemo, useState } from 'react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useTravelStore } from '../../stores/travelStore';
import { useAuthStore } from '../../stores/authStore';
import type { Expense } from '../../types';

const categories: Array<{ key: Expense['category']; label: string; color: string }> = [
  { key: 'transportation', label: '交通', color: 'bg-blue-500' },
  { key: 'accommodation', label: '住宿', color: 'bg-indigo-500' },
  { key: 'food', label: '餐饮', color: 'bg-emerald-500' },
  { key: 'attraction', label: '景点', color: 'bg-orange-500' },
  { key: 'shopping', label: '购物', color: 'bg-pink-500' },
  { key: 'other', label: '其他', color: 'bg-gray-400' },
];

const inputClass =
  'w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent backdrop-blur';

const Analytics = () => {
  const { plans, loadPlans } = useTravelStore();
  const { user } = useAuthStore();

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    loadPlans().catch(() => {});
  }, [loadPlans]);

  const planList = plans ?? []

  const filteredPlans = useMemo(() => {
    const withinRange = (dateStr: string, start?: string, end?: string) => {
      const t = new Date(dateStr).getTime();
      if (start) {
        const s = new Date(start).getTime();
        if (t < s) return false;
      }
      if (end) {
        const e = new Date(end).getTime();
        if (t > e) return false;
      }
      return true;
    };

    return planList.filter((plan) => {
      if (!dateStart && !dateEnd) return true;
      return (
        withinRange(plan.start_date, dateStart || undefined, dateEnd || undefined) ||
        withinRange(plan.end_date, dateStart || undefined, dateEnd || undefined)
      );
    });
  }, [plans, dateStart, dateEnd]);

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const totalPlans = filteredPlans.length;
    const upcoming = filteredPlans.filter(p => p.start_date >= today).length;
    const past = filteredPlans.filter(p => p.end_date < today).length;

    let totalBudget = 0;
    let totalDays = 0;
    let totalTravelers = 0;
    filteredPlans.forEach(plan => {
      totalBudget += Number(plan.budget) || 0;
      const days = Math.max(
        1,
        Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      totalDays += days;
      totalTravelers += Number(plan.travelers) || 0;
    });
    const avgDailyBudget = totalDays > 0 ? totalBudget / totalDays : 0;
    const avgPerCapitaBudget = totalTravelers > 0 ? totalBudget / totalTravelers : 0;

    const allExpenses: Expense[] = filteredPlans.flatMap(plan => plan.expenses || []);
    const totalExpense = allExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const byCategory: Record<string, number> = {};
    categories.forEach(c => { byCategory[c.key] = 0; });
    allExpenses.forEach(expense => {
      const key = expense.category || 'other';
      byCategory[key] = (byCategory[key] || 0) + (Number(expense.amount) || 0);
    });

    const destCount: Record<string, number> = {};
    filteredPlans.forEach(plan => {
      const destination = (plan.destination || '').trim();
      if (!destination) return;
      destCount[destination] = (destCount[destination] || 0) + 1;
    });
    const topDestinations = Object.entries(destCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalPlans,
      upcoming,
      past,
      totalBudget,
      totalDays,
      totalTravelers,
      avgDailyBudget,
      avgPerCapitaBudget,
      totalExpense,
      byCategory,
      topDestinations,
    };
  }, [filteredPlans, today]);

  const formatCurrency = (value: number) => `¥${(Number.isFinite(value) ? value : 0).toLocaleString()}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="glass-card p-8 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">统计分析</h1>
            <p className="text-sm text-slate-500">
              追踪预算与消费趋势，为下一次旅程做更好的筹划。
            </p>
          </div>
          {user && (
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
              {user.email}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 tracking-[0.2em] mb-2 block">
              开始日期
            </label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 tracking-[0.2em] mb-2 block">
              结束日期
            </label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => { setDateStart(''); setDateEnd(''); }}
              className="secondary-button w-full justify-center"
            >
              清除过滤
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card-compact p-5 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.2em]">
              <CalendarDaysIcon className="h-4 w-4" /> 总行程数
            </div>
            <div className="text-3xl font-semibold text-slate-900">{stats.totalPlans}</div>
            <div className="text-xs text-slate-500">未来 {stats.upcoming} · 过去 {stats.past}</div>
          </div>
          <div className="glass-card-compact p-5 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.2em]">
              <CurrencyDollarIcon className="h-4 w-4" /> 总预算
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              {formatCurrency(stats.totalBudget)}
            </div>
            <div className="text-xs text-slate-500">
              人均 {formatCurrency(Math.round(stats.avgPerCapitaBudget))}
            </div>
          </div>
          <div className="glass-card-compact p-5 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.2em]">
              <ChartBarIcon className="h-4 w-4" /> 总费用
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              {formatCurrency(stats.totalExpense)}
            </div>
            <div className="text-xs text-slate-500">
              日均 {formatCurrency(Math.round(stats.avgDailyBudget))}
            </div>
          </div>
          <div className="glass-card-compact p-5 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.2em]">
              <UsersIcon className="h-4 w-4" /> 出行人数
            </div>
            <div className="text-3xl font-semibold text-slate-900">{stats.totalTravelers}</div>
            <div className="text-xs text-slate-500">累计 {stats.totalDays} 天</div>
          </div>
        </div>

        <div className="surface-subtle p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ChartBarIcon className="h-5 w-5 text-slate-400" /> 费用分类占比
          </div>
          {categories.map((c) => {
            const value = stats.byCategory[c.key] || 0;
            const percentage = stats.totalExpense > 0 ? Math.round((value / stats.totalExpense) * 100) : 0;
            return (
              <div key={c.key} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{c.label}</span>
                  <span>{formatCurrency(value)}（{percentage}%）</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/60">
                  <div className={`h-2 rounded-full ${c.color}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="surface-subtle p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPinIcon className="h-5 w-5 text-slate-400" /> 热门目的地 Top5
          </div>
          {stats.topDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.topDestinations.map(([dest, count]) => (
                <div
                  key={dest}
                  className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/65 px-4 py-3 backdrop-blur"
                >
                  <span className="text-slate-900 font-medium">{dest}</span>
                  <span className="text-xs text-slate-500">{count} 次</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">暂无数据</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

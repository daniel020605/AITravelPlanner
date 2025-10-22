import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTravelStore } from '../../stores/travelStore';
import { useAuthStore } from '../../stores/authStore';
import {
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { plans, loadPlans } = useTravelStore();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalPlans: 0,
    upcomingTrips: 0,
    totalBudget: 0,
    thisMonthExpenses: 0,
  });

  const calculateStats = useCallback(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const upcomingTrips = plans.filter(plan =>
      new Date(plan.start_date) > now
    ).length;

    const totalBudget = plans.reduce((sum, plan) => sum + plan.budget, 0);

    const thisMonthExpenses = plans.reduce((sum, plan) => {
      const planExpenses = plan.expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === thisMonth && expenseDate.getFullYear() === thisYear;
      });
      return sum + planExpenses.reduce((expenseSum, expense) => expenseSum + expense.amount, 0);
    }, 0);

    setStats({
      totalPlans: plans.length,
      upcomingTrips,
      totalBudget,
      thisMonthExpenses,
    });
  }, [plans]);

  useEffect(() => {
    const load = async () => {
      try {
        await loadPlans();
      } catch (error) {
        console.error('Failed to load plans:', error);
      }
    };
    load();
  }, [loadPlans]);

  useEffect(() => {
    calculateStats();
  }, [plans, calculateStats]);

  const recentPlans = plans
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* 欢迎信息 */}
      <div className="glass-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              {user ? `欢迎回来，${user?.name || user?.email}！` : '欢迎使用 AI Travel Planner'}
            </h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {user
                ? '开启下一段旅程，让智能助手帮你策划每一步。'
                : '无需登录即可体验 AI 规划；登录后可保存、同步并管理你的行程灵感。'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/travel/planner" className="primary-button">
              <PlusIcon className="h-5 w-5 mr-2" />
              创建新行程
            </a>
            <a href="/travel" className="secondary-button">
              <CalendarIcon className="h-5 w-5 mr-2" />
              查看全部行程
            </a>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-compact p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-600">
              <MapPinIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-blue-500">总计划数</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalPlans}</p>
            </div>
          </div>
        </div>

        <div className="glass-card-compact p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
              <CalendarIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-500">即将旅行</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.upcomingTrips}</p>
            </div>
          </div>
        </div>

        <div className="glass-card-compact p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
              <CurrencyDollarIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-500">总预算</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                ¥{stats.totalBudget.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card-compact p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
              <CurrencyDollarIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-rose-500">本月支出</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                ¥{stats.thisMonthExpenses.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 最近行程 */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-white/40 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">最近行程</h2>
            <p className="text-sm text-slate-500 mt-1">追踪你近期的旅程灵感与计划进度。</p>
          </div>
          <a href="/travel" className="tertiary-button">
            查看全部
          </a>
        </div>
        <div className="divide-y divide-white/40">
          {recentPlans.length > 0 ? (
            recentPlans.map((plan) => (
              <Link
                key={plan.id}
                to={`/travel/${plan.id}`}
                className="block p-6 transition hover:bg-white/60 hover:shadow-lg rounded-3xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {plan.destination} · {new Date(plan.start_date).toLocaleDateString()} -{' '}
                      {new Date(plan.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      预算 ¥{plan.budget.toLocaleString()} · {plan.travelers} 人同行
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600">
                      最新更新：{new Date(plan.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">
              <MapPinIcon className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p>还没有行程计划</p>
              <p className="text-sm">
                {user 
                  ? '点击上方"创建新行程"开始规划' 
                  : '点击上方"创建新行程"开始规划（登录后可保存）'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

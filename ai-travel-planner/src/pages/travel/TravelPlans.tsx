import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useTravelStore } from '../../stores/travelStore';
import { useAuthStore } from '../../stores/authStore';
import type { TravelPlan } from '../../types';

const statusClassMap: Record<string, string> = {
  blue: 'bg-sky-500/15 text-sky-600 border border-sky-500/20',
  green: 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20',
  gray: 'bg-slate-500/15 text-slate-600 border border-slate-400/20',
};

const TravelPlans = () => {
  const {
    plans,
    loadPlans,
    deletePlan,
    isLoading,
    syncNow,
    syncStatus,
    lastSyncAt,
  } = useTravelStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    loadPlans().catch(() => {});
  }, [loadPlans]);

  const filteredPlans = useMemo(() => {
    const now = new Date();
    if (filter === 'upcoming') {
      return plans.filter(plan => new Date(plan.start_date) > now);
    }
    if (filter === 'past') {
      return plans.filter(plan => new Date(plan.end_date) < now);
    }
    return plans;
  }, [plans, filter]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('zh-CN');
    const end = new Date(endDate).toLocaleDateString('zh-CN');
    return `${start} - ${end}`;
  };

  const getStatus = (plan: TravelPlan) => {
    const now = new Date();
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);

    if (now < start) return { label: '即将开始', color: 'blue' };
    if (now <= end) return { label: '进行中', color: 'green' };
    return { label: '已结束', color: 'gray' };
  };

  const handleDeletePlan = (planId: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (window.confirm('确定要删除这个行程吗？')) {
      deletePlan(planId);
    }
  };

  const handleEditPlan = (planId: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    navigate(`/travel/planner?edit=${planId}`);
  };

  return (
    <div className="space-y-8">
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur p-4">
          <div className="glass-card max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                <ExclamationTriangleIcon className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-semibold text-slate-900">此操作需要登录</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              登录后可同步、备份并管理你的行程，跨设备保持旅程进度。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="secondary-button flex-1 justify-center"
              >
                稍后登录
              </button>
              <button
                onClick={() => navigate('/auth/login')}
                className="primary-button flex-1 justify-center"
              >
                立即登录
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">我的行程</h1>
            <p className="mt-2 text-sm text-slate-500">
              管理所有旅行计划，保持灵感与预算随时同步。
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => syncNow?.()}
                disabled={syncStatus === 'syncing'}
                className={`secondary-button px-5 ${syncStatus === 'syncing' ? 'opacity-70 cursor-wait' : ''}`}
                title="与云端合并并更新本地数据"
              >
                {syncStatus === 'syncing' ? '正在同步…' : '立即同步'}
              </button>
              <div className="hidden sm:block text-xs text-slate-400">
                {lastSyncAt ? `上次同步：${new Date(lastSyncAt).toLocaleString('zh-CN')}` : '尚未同步'}
              </div>
            </div>

            <div className="inline-flex overflow-hidden rounded-full border border-white/40 bg-white/55 backdrop-blur">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white shadow-inner'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部 ({plans.length})
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  filter === 'upcoming'
                    ? 'bg-slate-900 text-white shadow-inner'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                即将开始
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  filter === 'past'
                    ? 'bg-slate-900 text-white shadow-inner'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                已结束
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-12 text-center">
          <div className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">加载中...</p>
        </div>
      ) : filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlans.map(plan => {
            const status = getStatus(plan);
            const totalExpenses = plan.expenses.reduce((sum, expense) => sum + expense.amount, 0);
            const preferences = plan.preferences ?? [];
            const itinerary = plan.itinerary ?? [];
            const description = (plan as any).description as string | undefined;

            return (
              <div
                key={plan.id}
                className="glass-card-compact p-6 hover:shadow-[0_30px_60px_-20px_rgba(15,23,42,0.35)] transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      statusClassMap[status.color] ?? statusClassMap.gray
                    }`}
                  >
                    {status.label}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      className="tertiary-button p-1 hover:text-blue-600"
                      title={expanded[plan.id] ? '收起详情' : '查看详情'}
                      onClick={() => setExpanded(prev => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <Link
                      to={`/travel/${plan.id}`}
                      className="tertiary-button p-1 hover:text-blue-600"
                      title="查看详情"
                    >
                      <MapPinIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleEditPlan(plan.id)}
                      className="tertiary-button p-1 hover:text-blue-600"
                      title="编辑行程"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="tertiary-button p-1 hover:text-rose-500"
                      title="删除行程"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">{plan.title}</h3>
                  <p className="text-sm text-slate-500 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2 text-slate-400" />
                    {plan.destination}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-slate-400" />
                    {formatDateRange(plan.start_date, plan.end_date)}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center">
                    <UserGroupIcon className="h-4 w-4 mr-2 text-slate-400" />
                    {plan.travelers} 位同行者
                  </p>
                  <p className="text-sm text-slate-500 flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2 text-slate-400" />
                    预算 ¥{plan.budget.toLocaleString()} · 已支出 ¥{totalExpenses.toLocaleString()}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">
                    <span>预算使用</span>
                    <span>{Math.round((totalExpenses / plan.budget) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        totalExpenses > plan.budget
                          ? 'bg-rose-500'
                          : totalExpenses > plan.budget * 0.8
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((totalExpenses / plan.budget) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {preferences.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {preferences.slice(0, 3).map(preference => (
                      <span
                        key={preference}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/60 text-slate-600 border border-white/50"
                      >
                        {preference}
                      </span>
                    ))}
                    {preferences.length > 3 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/60 text-slate-500 border border-white/50">
                        +{preferences.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {expanded[plan.id] && (
                  <div className="mt-4 space-y-3 surface-subtle p-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">偏好</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {preferences.length > 0 ? preferences.join('、') : '未设置偏好'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">描述</h4>
                      <p className="mt-1 text-sm text-slate-600">{description || '暂无描述'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">更新时间</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(plan.updated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">行程概要</h4>
                      {itinerary.length > 0 ? (
                        <ul className="mt-2 max-h-48 space-y-2 overflow-auto pr-1">
                          {itinerary.map(item => (
                            <li key={item.id} className="rounded-xl bg-white/60 p-3">
                              <div className="flex items-center justify-between text-sm font-medium text-slate-900">
                                <span>
                                  第{item.day}天 · {item.time} · {item.title}
                                </span>
                                {typeof item.estimated_cost === 'number' && (
                                  <span className="text-xs text-slate-500">
                                    ¥{item.estimated_cost.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                              <div className="mt-1 text-xs text-slate-400">
                                {item.location?.name} · {item.location?.address}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">暂无行程项目</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/60">
              <MapPinIcon className="h-8 w-8 text-slate-300" />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">暂无行程</h3>
            <p className="text-sm text-slate-500">
              {filter === 'all'
                ? '你还没有创建任何旅程计划'
                : `没有${filter === 'upcoming' ? '即将开始' : '已结束'}的行程`}
            </p>
            <Link to="/travel/planner" className="primary-button">
              <span className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                创建新行程
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPlans;

import { useState, useEffect } from 'react';
import { useTravelStore } from '../../stores/travelStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import type { TravelPlan } from '../../types';
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

const TravelPlans = () => {
  const { plans, loadPlans, deletePlan, isLoading, syncNow, syncStatus, lastSyncAt } = useTravelStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();

  // 行程卡片展开/收起状态
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const getFilteredPlans = () => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return plans.filter(plan => new Date(plan.start_date) > now);
      case 'past':
        return plans.filter(plan => new Date(plan.end_date) < now);
      default:
        return plans;
    }
  };

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
    if (now >= start && now <= end) return { label: '进行中', color: 'green' };
    return { label: '已结束', color: 'gray' };
  };

  const handleDeletePlan = (planId: string) => {
    // Check if user is logged in before deleting
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (window.confirm('确定要删除这个行程吗？')) {
      deletePlan(planId);
    }
  };

  const filteredPlans = getFilteredPlans();

  return (
    <div className="space-y-6">
      {/* 登录提示模态框 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">此操作需要登录</h3>
              </div>
              <p className="text-gray-600 mb-6">
                您需要登录账户才能管理行程计划。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  稍后登录
                </button>
                <button
                  onClick={() => navigate('/auth/login')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  立即登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 页面标题和筛选 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">我的行程</h1>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => syncNow && syncNow()}
              disabled={syncStatus === 'syncing'}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              title="与云端合并并更新本地数据"
            >
              {syncStatus === 'syncing' ? '正在同步…' : '立即同步'}
            </button>
            <div className="hidden sm:block text-xs text-gray-500">
              {lastSyncAt ? `上次同步：${new Date(lastSyncAt).toLocaleString('zh-CN')}` : '尚未同步'}
            </div>
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                全部 ({plans.length})
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 text-sm font-medium border-t border-b ${
                  filter === 'upcoming'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                即将开始
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                  filter === 'past'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                已结束
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 行程列表 */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      ) : filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const status = getStatus(plan);
            const totalExpenses = plan.expenses.reduce((sum, expense) => sum + expense.amount, 0);

            return (
              <div key={plan.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* 状态标签 */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}>
                      {status.label}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title={expanded[plan.id] ? '收起详情' : '查看详情'}
                        onClick={() => toggleExpand(plan.id)}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="编辑"
                        onClick={() => {
                          if (!user) {
                            setShowLoginPrompt(true);
                            return;
                          }
                        }}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* 行程标题 */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    <Link
                      to={`/travel/${plan.id}`}
                      className="text-blue-600 hover:underline"
                      title="查看行程详情"
                    >
                      {plan.title}
                    </Link>
                  </h3>
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span className="text-sm">{plan.destination}</span>
                  </div>

                  {/* 行程详情 */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        {formatDateRange(plan.start_date, plan.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm">{plan.travelers} 人</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        预算: ¥{plan.budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        已花费: ¥{totalExpenses.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>预算使用</span>
                      <span>{Math.round((totalExpenses / plan.budget) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          totalExpenses > plan.budget
                            ? 'bg-red-600'
                            : totalExpenses > plan.budget * 0.8
                            ? 'bg-yellow-600'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min((totalExpenses / plan.budget) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 偏好标签 */}
                  <div className="flex flex-wrap gap-1">
                    {plan.preferences.slice(0, 3).map((preference) => (
                      <span
                        key={preference}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {preference}
                      </span>
                    ))}
                    {plan.preferences.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        +{plan.preferences.length - 3}
                      </span>
                    )}
                  </div>

                  {expanded[plan.id] && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">行程详情</h4>
                      {plan.itinerary && plan.itinerary.length > 0 ? (
                        <ul className="space-y-2 max-h-64 overflow-auto pr-1">
                          {plan.itinerary.map(item => (
                            <li key={item.id} className="p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-900">
                                  第{item.day}天 · {item.time} · {item.title}
                                </div>
                                {typeof item.estimated_cost === 'number' && (
                                  <div className="text-xs text-gray-500">¥{item.estimated_cost.toLocaleString()}</div>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-gray-600">{item.description}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                {item.location?.name} · {item.location?.address}
                              </div>
                              <div className="mt-1">
                                <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700">
                                  {item.category}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-500">暂无行程项目</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <MapPinIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无行程</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all'
                ? '您还没有创建任何行程计划'
                : `没有${filter === 'upcoming' ? '即将开始' : '已结束'}的行程`
              }
            </p>
            <a
              href="/travel/planner"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              创建新行程
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPlans;
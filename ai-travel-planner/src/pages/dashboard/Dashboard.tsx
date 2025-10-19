import { useState, useEffect, useCallback } from 'react';
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
    <div className="space-y-6">
      {/* 欢迎信息 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {user ? `欢迎回来，${user?.name || user?.email}！` : '欢迎使用AI旅行规划师！'}
        </h1>
        <p className="mt-2 text-gray-600">
          {user 
            ? '开始规划您的下一次完美旅行吧' 
            : '无需登录即可使用我们的AI行程规划功能，登录后可保存和管理您的旅行计划'}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPinIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">总计划数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPlans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">即将到来的旅行</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingTrips}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">总预算</p>
              <p className="text-2xl font-bold text-gray-900">¥{stats.totalBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">本月支出</p>
              <p className="text-2xl font-bold text-gray-900">¥{stats.thisMonthExpenses.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="/travel/planner" 
            className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            创建新行程
          </a>
          <a 
            href="/travel" 
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            查看所有行程
          </a>
        </div>
      </div>

      {/* 最近行程 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">最近行程</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentPlans.length > 0 ? (
            recentPlans.map((plan) => (
              <div key={plan.id} className="p-6 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{plan.title}</h3>
                    <p className="text-sm text-gray-500">
                      {plan.destination} • {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      预算: ¥{plan.budget.toLocaleString()} • {plan.travelers} 人
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      进行中
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              <MapPinIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
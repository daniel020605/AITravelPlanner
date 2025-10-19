import { useState } from 'react';
import { useTravelStore } from '../../stores/travelStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import type { Expense } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CurrencyDollarIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import VoiceInput from './VoiceInput';

const expenseSchema = z.object({
  category: z.enum(['transportation', 'accommodation', 'food', 'attraction', 'shopping', 'other']),
  amount: z.number().min(0.01, '金额必须大于0'),
  description: z.string().min(1, '请输入描述'),
  date: z.string().min(1, '请选择日期'),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const categoryOptions = [
  { value: 'transportation', label: '交通', icon: '🚗' },
  { value: 'accommodation', label: '住宿', icon: '🏨' },
  { value: 'food', label: '餐饮', icon: '🍜' },
  { value: 'attraction', label: '景点', icon: '🎫' },
  { value: 'shopping', label: '购物', icon: '🛍️' },
  { value: 'other', label: '其他', icon: '📦' },
];

interface ExpenseTrackerProps {
  travelPlanId: string;
}

const ExpenseTracker = ({ travelPlanId }: ExpenseTrackerProps) => {
  const { currentPlan, addExpense, updateExpense, removeExpense } = useTravelStore();
  const { user } = useAuthStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [voiceInput, setVoiceInput] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'other',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const expenses = currentPlan?.expenses || [];
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budget = currentPlan?.budget || 0;
  const budgetUsagePercentage = budget > 0 ? (totalExpenses / budget) * 100 : 0;

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      // Check if user is logged in before saving
      if (!user) {
        setShowLoginPrompt(true);
        return;
      }

      const expenseData = {
        travel_plan_id: travelPlanId,
        ...data,
        location: data.location_name ? {
          name: data.location_name,
          address: data.location_address || '',
          latitude: 0,
          longitude: 0,
        } : undefined,
      };

      if (editingExpense) {
        await updateExpense(editingExpense, expenseData);
        setEditingExpense(null);
      } else {
        await addExpense(expenseData);
      }

      reset();
      setIsFormOpen(false);
      setVoiceInput('');
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setVoiceInput(transcript);

    // 简单的语音解析逻辑
    const amountMatch = transcript.match(/(\d+)/g);
    const categoryMatch = transcript.match(/(交通|住宿|餐饮|景点|购物|其他)/);

    if (amountMatch) {
      setValue('amount', parseFloat(amountMatch[0]));
    }

    if (categoryMatch) {
      const categoryMap: Record<string, string> = {
        '交通': 'transportation',
        '住宿': 'accommodation',
        '餐饮': 'food',
        '景点': 'attraction',
        '购物': 'shopping',
        '其他': 'other',
      };
      setValue('category', categoryMap[categoryMatch[0]] as ExpenseFormData['category']);
    }

    // 设置描述为完整语音内容
    setValue('description', transcript);
  };

  const startEdit = (expense: Expense) => {
    // Check if user is logged in before editing
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    setEditingExpense(expense.id);
    setValue('category', expense.category);
    setValue('amount', expense.amount);
    setValue('description', expense.description);
    setValue('date', expense.date);
    if (expense.location) {
      setValue('location_name', expense.location.name);
      setValue('location_address', expense.location.address);
    }
    setIsFormOpen(true);
  };

  const handleRemoveExpense = (expenseId: string) => {
    // Check if user is logged in before removing
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (window.confirm('确定要删除这个费用记录吗？')) {
      removeExpense(expenseId);
    }
  };

  const getCategoryIcon = (category: string) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option?.icon || '📦';
  };

  const getCategoryLabel = (category: string) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option?.label || '其他';
  };

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
                您需要登录账户才能保存和管理费用记录。
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

      {/* 预算概览 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">预算概览</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">总预算</p>
            <p className="text-2xl font-bold text-gray-900">¥{budget.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">已花费</p>
            <p className={`text-2xl font-bold ${totalExpenses > budget ? 'text-red-600' : 'text-green-600'}`}>
              ¥{totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">剩余</p>
            <p className={`text-2xl font-bold ${budget - totalExpenses < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              ¥{Math.max(0, budget - totalExpenses).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 预算进度条 */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>预算使用情况</span>
            <span>{Math.round(budgetUsagePercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                budgetUsagePercentage > 100
                  ? 'bg-red-600'
                  : budgetUsagePercentage > 80
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(budgetUsagePercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 添加费用按钮 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">费用记录</h3>
        <button
          onClick={() => {
            if (!user) {
              setShowLoginPrompt(true);
              return;
            }
            setIsFormOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          添加费用
        </button>
      </div>

      {/* 费用表单 */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            {editingExpense ? '编辑费用' : '添加费用'}
          </h4>

          {/* 语音输入 */}
          <div className="mb-4">
            <VoiceInput
              onTranscript={handleVoiceInput}
              placeholder="语音输入费用信息，例如：餐饮消费200元"
            />
            {voiceInput && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                语音识别：{voiceInput}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金额（元）</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地点名称</label>
                <input
                  type="text"
                  {...register('location_name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：麦当劳餐厅"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="费用描述..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地点地址（可选）</label>
              <input
                type="text"
                {...register('location_address')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="详细地址"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingExpense(null);
                  reset();
                  setVoiceInput('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingExpense ? '更新' : '添加'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 费用列表 */}
      {expenses.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {expenses.map((expense) => (
              <div key={expense.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getCategoryIcon(expense.category)}</div>
                    <div>
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{getCategoryLabel(expense.category)}</span>
                        <span>¥{expense.amount.toLocaleString()}</span>
                        <span>{new Date(expense.date).toLocaleDateString('zh-CN')}</span>
                        {expense.location && (
                          <span>{expense.location.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEdit(expense)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="编辑"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveExpense(expense.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="删除"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">还没有费用记录</p>
          <p className="text-sm text-gray-400 mt-1">点击上方"添加费用"开始记录</p>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
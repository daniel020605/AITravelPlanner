import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useConfigStore } from '../../stores/configStore';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSupabasePrompt, setShowSupabasePrompt] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState('');
  const [configError, setConfigError] = useState('');

  const { login, isLoading, error, clearError } = useAuthStore();
  const { config, updateConfig } = useConfigStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    setSupabaseUrl(config.supabase_url || '');
    setSupabaseAnonKey(config.supabase_anon_key || '');
    setSupabaseServiceRoleKey(config.supabase_service_role_key || '');
  }, [config.supabase_url, config.supabase_anon_key, config.supabase_service_role_key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Supabase')) {
        setShowSupabasePrompt(true);
      }
    }
  };

  const handleSaveSupabaseConfig = () => {
    const trimmedUrl = supabaseUrl.trim();
    const trimmedAnonKey = supabaseAnonKey.trim();
    const trimmedServiceKey = supabaseServiceRoleKey.trim();

    if (!trimmedUrl || !trimmedAnonKey) {
      setConfigError('请至少填写 Supabase URL 和 Public Anon Key。');
      return;
    }

    updateConfig({
      supabase_url: trimmedUrl,
      supabase_anon_key: trimmedAnonKey,
      supabase_service_role_key: trimmedServiceKey,
    });
    setConfigError('');
    clearError();
    setShowSupabasePrompt(false);
  };

  const handleClosePrompt = () => {
    setConfigError('');
    setShowSupabasePrompt(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录您的账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            还没有账户？{' '}
            <Link
              to="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              立即注册
            </Link>
          </p>
        </div>



        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              忘记密码？
            </Link>
          </div>
        </form>
      </div>

      {showSupabasePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">配置 Supabase</h3>
              <button
                type="button"
                onClick={handleClosePrompt}
                className="text-gray-500 transition hover:text-gray-700"
                aria-label="关闭 Supabase 配置弹窗"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-gray-600">
                登录需要 Supabase 凭据。请填入项目的 Supabase URL 与 Public Anon Key，这些信息可在 Supabase 控制台
                Project Settings → API 中获取。数据仅保存在本地浏览器。
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supabase Public Anon Key
                </label>
                <textarea
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supabase Service Role Key（可选，谨慎粘贴）
                </label>
                <textarea
                  value={supabaseServiceRoleKey}
                  onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
                  rows={2}
                  placeholder="可选：仅在需要自动确认邮箱时填写，注意安全风险"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="mt-1 text-xs text-gray-500">
                  若保留为空，应用不会接触 Service Role Key。填写后仅用于本地自动确认邮箱，勿在不受信任环境使用。
                </p>
              </div>

              {configError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {configError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClosePrompt}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveSupabaseConfig}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

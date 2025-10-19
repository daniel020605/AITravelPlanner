import { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useAuthStore } from '../../stores/authStore';
import {
  KeyIcon,
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { openaiService } from '../../services/ai/openaiService';
import { getSupabaseClient } from '../../services/sync/supabaseClient';
import { amapSearchText } from '../../services/maps/amap';

const Settings = () => {
  const { config, updateConfig, validateConfig } = useConfigStore();
  const { user, logout } = useAuthStore();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [apiConfig, setApiConfig] = useState({
    openai_base_url: config.openai_base_url || '',
    openai_api_key: config.openai_api_key || '',
    xunfei_app_id: config.xunfei_app_id || '',
    xunfei_api_key: config.xunfei_api_key || '',
    xunfei_api_secret: config.xunfei_api_secret || '',
    amap_key: config.amap_key || '',
    // Supabase 云端同步配置
    supabase_url: config.supabase_url || '',
    supabase_anon_key: config.supabase_anon_key || '',
  });

  const [testing, setTesting] = useState(false);
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; models?: string[] } | null>(null);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [amapTesting, setAmapTesting] = useState(false);
  const [amapTestResult, setAmapTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    travel_reminders: true,
    budget_alerts: true,
  });

  const [privacy, setPrivacy] = useState({
    profile_public: false,
    share_travel_plans: false,
    analytics_cookies: true,
  });

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (showApiKeys[key]) return key;
    return key.slice(0, 8) + '...' + key.slice(-4);
  };

  const handleApiConfigChange = (field: string, value: string) => {
    setApiConfig(prev => ({
      ...prev,
      [field]: value
    }));
    updateConfig({ [field]: value });
  };

  const isConfigValid = validateConfig();

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await logout();
      window.location.href = '/auth/login';
    }
  };

  const testSupabaseConnection = async () => {
    setSupabaseTesting(true);
    setSupabaseTestResult(null);

    try {
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        setSupabaseTestResult({
          ok: false,
          message: 'Supabase URL 和 Anon Key 不能为空'
        });
        return;
      }
      
      // Test connection by trying to get the current user or checking the health
      const { error } = await supabase.rpc('version');
      
      if (error) {
        // If rpc version fails, try a simple select from a table that might exist
        const { error: healthError } = await supabase
          .from('travel_plans')
          .select('id')
          .limit(1);
        
        if (healthError && healthError.message.includes('Relation')) {
          // Table doesn't exist, but connection is successful
          setSupabaseTestResult({
            ok: true,
            message: '连接成功，但需要创建数据表'
          });
        } else if (healthError) {
          setSupabaseTestResult({
            ok: false,
            message: `连接失败: ${healthError.message}`
          });
        } else {
          setSupabaseTestResult({
            ok: true,
            message: '连接成功'
          });
        }
      } else {
        setSupabaseTestResult({
          ok: true,
          message: '连接成功'
        });
      }
    } catch (error) {
      setSupabaseTestResult({
        ok: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setSupabaseTesting(false);
    }
  };

  const testAmapConnection = async () => {
    setAmapTesting(true);
    setAmapTestResult(null);

    try {
      const key = (apiConfig.amap_key || '').trim();
      if (!key) {
        setAmapTestResult({ ok: false, message: '请先填写高德地图 API Key' });
        setAmapTesting(false);
        return;
      }

      const result = await amapSearchText({
        key,
        keywords: '北京 景点',
        page: 1,
        offset: 1,
      });

      if (Array.isArray(result) && result.length > 0) {
        setAmapTestResult({ ok: true, message: `连接成功，返回 ${result.length} 条示例数据` });
      } else {
        setAmapTestResult({ ok: true, message: '连接成功，但未返回结果，请确认 Key 权限' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setAmapTestResult({ ok: false, message: `连接失败: ${message}` });
    } finally {
      setAmapTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">设置</h1>

        {/* 个人信息设置 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <UserCircleIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">个人信息</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="您的姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={formData.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                disabled
              />
            </div>
          </div>
        </div>

        {/* API 配置 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">API 配置</h2>
            <div className="ml-auto">
              {isConfigValid ? (
                <span className="flex items-center text-sm text-green-600">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  配置完整
                </span>
              ) : (
                <span className="flex items-center text-sm text-yellow-600">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  需要配置必要API
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* 云端同步（Supabase） */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">云端同步（Supabase）- 主要数据存储</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Supabase URL</label>
                <input
                  type="url"
                  value={apiConfig.supabase_url}
                  onChange={(e) => handleApiConfigChange('supabase_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://xxxx.supabase.co"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anon Key</label>
                <div className="relative">
                  <input
                    type={showApiKeys.supabase_anon_key ? 'text' : 'password'}
                    value={maskApiKey(apiConfig.supabase_anon_key)}
                    onChange={(e) => handleApiConfigChange('supabase_anon_key', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                  <button
                    type="button"
                    onClick={() => toggleApiKeyVisibility('supabase_anon_key')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKeys.supabase_anon_key ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Supabase 测试连接按钮 */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={supabaseTesting}
                    onClick={testSupabaseConnection}
                    className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {supabaseTesting ? '测试中…' : '测试连接'}
                  </button>
                  {supabaseTestResult && (
                    <span className={`text-sm ${supabaseTestResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {supabaseTestResult.message}
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                配置后将作为主要数据存储使用，本地存储作为兜底备份。
              </p>
            </div>

            {/* AI API 配置 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">AI 服务 (OpenAI/智谱AI)</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="url"
                  value={apiConfig.openai_base_url}
                  onChange={(e) => handleApiConfigChange('openai_base_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKeys.openai_api_key ? 'text' : 'password'}
                    value={maskApiKey(apiConfig.openai_api_key)}
                    onChange={(e) => handleApiConfigChange('openai_api_key', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => toggleApiKeyVisibility('openai_api_key')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKeys.openai_api_key ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* 测试 AI 连接 + 模型选择 */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={async () => {
                      setTesting(true);
                      setTestResult(null);
                      try {
                        const result = await openaiService.testConnection();
                        setTestResult(result);
                        setModels(result.models || []);
                        if ((!((useConfigStore.getState().config?.openai_model || '')).trim()) && (result.models && result.models.length > 0)) {
                          useConfigStore.getState().updateConfig({ openai_model: result.models[0] });
                        }
                      } finally {
                        setTesting(false);
                      }
                    }}
                    className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {testing ? '测试中…' : '测试 AI 连接'}
                  </button>
                  {testResult && (
                    <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.message}
                    </span>
                  )}
                </div>

                {models.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-700">选择模型</label>
                    <select
                      className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={(useConfigStore.getState().config?.openai_model || models[0])}
                      onChange={(e) => {
                        const value = e.target.value;
                        useConfigStore.getState().updateConfig({ openai_model: value });
                      }}
                    >
                      {models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 科大讯飞配置 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">科大讯飞语音识别</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                  <input
                    type="text"
                    value={apiConfig.xunfei_app_id}
                    onChange={(e) => handleApiConfigChange('xunfei_app_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="您的App ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKeys.xunfei_api_key ? 'text' : 'password'}
                      value={maskApiKey(apiConfig.xunfei_api_key)}
                      onChange={(e) => handleApiConfigChange('xunfei_api_key', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="您的API Key"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('xunfei_api_key')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showApiKeys.xunfei_api_key ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                  <div className="relative">
                    <input
                      type={showApiKeys.xunfei_api_secret ? 'text' : 'password'}
                      value={maskApiKey(apiConfig.xunfei_api_secret || '')}
                      onChange={(e) => handleApiConfigChange('xunfei_api_secret', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="您的API Secret"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('xunfei_api_secret')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showApiKeys.xunfei_api_secret ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 高德地图配置 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">高德地图</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKeys.amap_key ? 'text' : 'password'}
                    value={maskApiKey(apiConfig.amap_key)}
                    onChange={(e) => handleApiConfigChange('amap_key', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="您的高德地图API Key"
                  />
                  <button
                    type="button"
                    onClick={() => toggleApiKeyVisibility('amap_key')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKeys.amap_key ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="mt-3 flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={amapTesting}
                    onClick={testAmapConnection}
                    className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {amapTesting ? '测试中…' : '测试连接'}
                  </button>
                  {amapTestResult && (
                    <span className={`text-sm ${amapTestResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {amapTestResult.message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 通知设置 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <BellIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">通知设置</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">邮件通知</span>
              <input
                type="checkbox"
                checked={notifications.email_notifications}
                onChange={(e) => setNotifications(prev => ({ ...prev, email_notifications: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">推送通知</span>
              <input
                type="checkbox"
                checked={notifications.push_notifications}
                onChange={(e) => setNotifications(prev => ({ ...prev, push_notifications: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">旅行提醒</span>
              <input
                type="checkbox"
                checked={notifications.travel_reminders}
                onChange={(e) => setNotifications(prev => ({ ...prev, travel_reminders: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">预算警报</span>
              <input
                type="checkbox"
                checked={notifications.budget_alerts}
                onChange={(e) => setNotifications(prev => ({ ...prev, budget_alerts: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        {/* 隐私设置 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">隐私与安全</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">公开个人资料</span>
              <input
                type="checkbox"
                checked={privacy.profile_public}
                onChange={(e) => setPrivacy(prev => ({ ...prev, profile_public: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">分享旅行计划</span>
              <input
                type="checkbox"
                checked={privacy.share_travel_plans}
                onChange={(e) => setPrivacy(prev => ({ ...prev, share_travel_plans: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">分析Cookie</span>
              <input
                type="checkbox"
                checked={privacy.analytics_cookies}
                onChange={(e) => setPrivacy(prev => ({ ...prev, analytics_cookies: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        {/* 保存和退出按钮 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            <button className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              保存设置
            </button>
            <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              重置
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

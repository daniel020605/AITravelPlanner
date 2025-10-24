import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useAuthStore } from '../../stores/authStore';
import {
  KeyIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { openaiService } from '../../services/ai/openaiService';
import { getSupabaseClient } from '../../services/sync/supabaseClient';
import { amapSearchText } from '../../services/maps/amap';
import { XFYunIAT } from '../../services/voice/xfyunIat';
import type { APIConfig } from '../../types';

const API_CONFIG_FIELDS = [
  'openai_base_url',
  'openai_api_key',
  'xunfei_app_id',
  'xunfei_api_key',
  'xunfei_api_secret',
  'amap_key',
  'supabase_url',
  'supabase_anon_key',
  'supabase_service_role_key',
] as const;

const EXTRA_CONFIG_FIELDS = ['openai_model', 'sync_api_base', 'sync_api_key'] as const;

const ALL_CONFIG_FIELDS = [...API_CONFIG_FIELDS, ...EXTRA_CONFIG_FIELDS] as const;

type ConfigField = (typeof ALL_CONFIG_FIELDS)[number];

const CONFIG_TEMPLATE: Record<ConfigField, string> = {
  openai_base_url: 'https://api.openai.com/v1',
  openai_api_key: 'sk-xxxx',
  openai_model: 'qwen-max',
  xunfei_app_id: 'your-xunfei-app-id',
  xunfei_api_key: 'your-xunfei-api-key',
  xunfei_api_secret: 'your-xunfei-api-secret',
  amap_key: 'your-amap-key',
  supabase_url: 'https://your-project.supabase.co',
  supabase_anon_key: 'public-anon-key',
  supabase_service_role_key: 'service-role-key (仅限受信环境使用)',
  sync_api_base: 'https://your-sync-service.example.com',
  sync_api_key: 'sync-service-api-key',
};

const Settings = () => {
  const { config, updateConfig, validateConfig } = useConfigStore();
  const { user, logout } = useAuthStore();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    supabase_service_role_key: config.supabase_service_role_key || '',
  });

  const [testing, setTesting] = useState(false);
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; models?: string[] } | null>(null);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [amapTesting, setAmapTesting] = useState(false);
  const [amapTestResult, setAmapTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [privacy, setPrivacy] = useState({
    profile_public: false,
    share_travel_plans: false,
    analytics_cookies: true,
  });
  const [configActionStatus, setConfigActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copyEmailStatus, setCopyEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleCopyEmail = async () => {
    if (!formData.email) {
      setCopyEmailStatus({ type: 'error', message: '当前邮箱为空' });
      window.setTimeout(() => setCopyEmailStatus(null), 3000);
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formData.email);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formData.email;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyEmailStatus({ type: 'success', message: '邮箱已复制' });
      window.setTimeout(() => setCopyEmailStatus(null), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '复制失败';
      setCopyEmailStatus({ type: 'error', message });
      window.setTimeout(() => setCopyEmailStatus(null), 3000);
    }
  };

  const triggerDownload = (filename: string, payload: Record<string, unknown>) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const downloadTemplate = () => {
    setConfigActionStatus(null);
    triggerDownload('config-template.json', CONFIG_TEMPLATE);
    setConfigActionStatus({ type: 'success', message: '配置模板已下载' });
  };

  const exportCurrentConfig = () => {
    setConfigActionStatus(null);
    const currentConfig = useConfigStore.getState().config || {};
    const payload: Record<string, unknown> = { ...CONFIG_TEMPLATE };
    ALL_CONFIG_FIELDS.forEach((field) => {
      if (currentConfig[field] !== undefined && currentConfig[field] !== null) {
        payload[field] = currentConfig[field] as unknown;
      }
    });
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    triggerDownload(`config-${timestamp}.json`, payload);
    setConfigActionStatus({ type: 'success', message: '当前配置已导出' });
  };

  const handleChooseConfigFile = () => {
    setConfigActionStatus(null);
    fileInputRef.current?.click();
  };

  const handleConfigFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const input = event.target;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('配置文件格式不正确');
        }

        const updates: Partial<APIConfig> = {};
        ALL_CONFIG_FIELDS.forEach((field) => {
          const value = parsed[field];
          if (typeof value === 'string') {
            updates[field] = value;
          } else if (value === undefined || value === null) {
            updates[field] = '';
          }
        });

        if (Object.keys(updates).length === 0) {
          throw new Error('未找到可识别的配置项');
        }

        updateConfig(updates);
        setApiConfig((prev) => {
          const next = { ...prev };
          API_CONFIG_FIELDS.forEach((field) => {
            if (updates[field] !== undefined) {
              next[field] = (updates[field] || '') as string;
            }
          });
          return next;
        });

        setConfigActionStatus({ type: 'success', message: '配置已成功加载' });
      } catch (error) {
        const message = error instanceof Error ? error.message : '配置文件解析失败';
        setConfigActionStatus({ type: 'error', message });
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      setConfigActionStatus({ type: 'error', message: '读取配置文件失败' });
      input.value = '';
    };
    reader.readAsText(file, 'utf-8');
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
              <div className="flex items-center space-x-3">
                <div className="flex-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                  {formData.email || '未绑定邮箱'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                  disabled={!formData.email}
                >
                  复制
                </button>
              </div>
              {copyEmailStatus && (
                <p className={`mt-2 text-sm ${copyEmailStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {copyEmailStatus.message}
                </p>
              )}
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
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Role Key（可选，慎用）</label>
                <div className="relative">
                  <input
                    type={showApiKeys.supabase_service_role_key ? 'text' : 'password'}
                    value={maskApiKey(apiConfig.supabase_service_role_key)}
                    onChange={(e) => handleApiConfigChange('supabase_service_role_key', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="仅限受信环境，建议放在后端"
                  />
                  <button
                    type="button"
                    onClick={() => toggleApiKeyVisibility('supabase_service_role_key')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKeys.supabase_service_role_key ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  Service Role Key 拥有完全访问权限，仅在受信本地环境使用。若可能，请改在自建中间层存储。
                </p>
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
              <h3 className="text-sm font-medium text-gray-900 mb-3">AI 服务 (阿里百炼等，建议使用 Qwen-Max)</h3>

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
                {/* 测试连接按钮与结果 */}
                <div className="md:col-span-3">
                  <XFYunTester />
                </div>
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

            {/* 配置文件操作 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">配置文件</h3>
              <p className="text-xs text-gray-500 mb-3">
                使用模板快速填写，或导入/导出 JSON 配置文件以备份与同步本地环境。
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                >
                  下载配置模板
                </button>
                <button
                  type="button"
                  onClick={exportCurrentConfig}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                >
                  导出当前配置
                </button>
                <button
                  type="button"
                  onClick={handleChooseConfigFile}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                >
                  从文件加载配置
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleConfigFileChange}
              />
              {configActionStatus && (
                <p className={`mt-3 text-sm ${configActionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {configActionStatus.message}
                </p>
              )}
            </div>
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

// 讯飞测试子组件
const XFYunTester = () => {
  const cfg = useConfigStore((s) => s.config);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const appId = (cfg?.xunfei_app_id || '').trim();
      const apiKey = (cfg?.xunfei_api_key || '').trim();
      const apiSecret = (cfg?.xunfei_api_secret || '').trim();
      if (!appId || !apiKey || !apiSecret) {
        setResult({ ok: false, message: '请先填写 App ID、API Key、API Secret' });
        return;
      }
      const r = await XFYunIAT.testConnection({ appId, apiKey, apiSecret, timeoutMs: 6000 });
      setResult(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误';
      setResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-2 flex items-center space-x-3">
      <button
        type="button"
        onClick={runTest}
        disabled={testing}
        className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {testing ? '测试中…' : '测试连接'}
      </button>
      {result && (
        <span className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
          {result.message}
        </span>
      )}
      <span className="text-xs text-gray-500">仅测试鉴权与连接建立，不会请求麦克风权限</span>
    </div>
  );
};

export default Settings;

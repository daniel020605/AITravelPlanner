import { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { openaiService } from '../../services/ai/openaiService';

interface APIKeyManagerProps {
  showTitle?: boolean;
  className?: string;
}

const APIKeyManager = ({ showTitle = true, className = '' }: APIKeyManagerProps) => {
  const { config, updateConfig, validateConfig } = useConfigStore();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const [apiConfig, setApiConfig] = useState({
    openai_base_url: config.openai_base_url || '',
    openai_api_key: config.openai_api_key || '',
    xunfei_app_id: config.xunfei_app_id || '',
    xunfei_api_key: config.xunfei_api_key || '',
    amap_key: config.amap_key || '',
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; models?: string[] } | null>(null);
  const [models, setModels] = useState<string[]>([]);

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (showApiKeys[key]) return key;
    return key.length > 12 ? `${key.slice(0, 8)}...${key.slice(-4)}` : key;
  };

  const handleApiConfigChange = (field: string, value: string) => {
    setApiConfig(prev => ({
      ...prev,
      [field]: value
    }));
    updateConfig({ [field]: value });
  };

  const isConfigValid = validateConfig();

  const apiDescriptions = {
    openai_base_url: {
      label: 'OpenAI Base URL',
      description: 'AI 服务的基础地址，默认为 https://api.openai.com/v1，可替换为自建网关或第三方兼容端点',
      placeholder: 'https://api.openai.com/v1',
      required: false,
    },
    openai_api_key: {
      label: 'OpenAI API Key',
      description: '用于 AI 行程规划的 OpenAI API 密钥',
      placeholder: 'sk-...',
      required: false,
    },
    xunfei_app_id: {
      label: '科大讯飞 App ID',
      description: '科大讯飞语音识别服务的应用 ID',
      placeholder: '您的应用ID',
      required: false,
    },
    xunfei_api_key: {
      label: '科大讯飞 API Key',
      description: '科大讯飞语音识别服务的 API 密钥',
      placeholder: '您的API密钥',
      required: false,
    },
    amap_key: {
      label: '高德地图 API Key',
      description: '高德地图服务的 API 密钥，用于地图显示和地理编码',
      placeholder: '您的高德地图API Key',
      required: false,
    },
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">API 配置管理</h2>
          <div className="flex items-center space-x-2">
            {isConfigValid ? (
              <span className="flex items-center text-sm text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                基础配置完整
              </span>
            ) : (
              <span className="flex items-center text-sm text-yellow-600">
                <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                需要配置必要API
              </span>
            )}
          </div>
        </div>
      )}

      {/* 已移除数据库（Supabase）配置；仅保留可选的第三方服务 */}

      {/* AI 服务配置 */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          AI 服务 (可选)
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {apiDescriptions.openai_base_url.label}
          </label>
          <input
            type="url"
            value={apiConfig.openai_base_url}
            onChange={(e) => handleApiConfigChange('openai_base_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={apiDescriptions.openai_base_url.placeholder}
          />
          <p className="mt-1 text-xs text-gray-500">{apiDescriptions.openai_base_url.description}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {apiDescriptions.openai_api_key.label}
          </label>
          <div className="relative">
            <input
              type={showApiKeys.openai_api_key ? 'text' : 'password'}
              value={maskApiKey(apiConfig.openai_api_key)}
              onChange={(e) => handleApiConfigChange('openai_api_key', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={apiDescriptions.openai_api_key.placeholder}
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
          <p className="mt-1 text-xs text-gray-500">{apiDescriptions.openai_api_key.description}</p>
        </div>

        {/* 测试连接 */}
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
                  // 若未选择模型且有列表，默认选第一个
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

      {/* 语音识别配置 */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          语音识别服务 (可选)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {apiDescriptions.xunfei_app_id.label}
            </label>
            <input
              type="text"
              value={apiConfig.xunfei_app_id}
              onChange={(e) => handleApiConfigChange('xunfei_app_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={apiDescriptions.xunfei_app_id.placeholder}
            />
            <p className="mt-1 text-xs text-gray-500">{apiDescriptions.xunfei_app_id.description}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {apiDescriptions.xunfei_api_key.label}
            </label>
            <div className="relative">
              <input
                type={showApiKeys.xunfei_api_key ? 'text' : 'password'}
                value={maskApiKey(apiConfig.xunfei_api_key)}
                onChange={(e) => handleApiConfigChange('xunfei_api_key', e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={apiDescriptions.xunfei_api_key.placeholder}
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
            <p className="mt-1 text-xs text-gray-500">{apiDescriptions.xunfei_api_key.description}</p>
          </div>
        </div>
      </div>

      {/* 地图服务配置 */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
          地图服务 (可选)
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {apiDescriptions.amap_key.label}
          </label>
          <div className="relative">
            <input
              type={showApiKeys.amap_key ? 'text' : 'password'}
              value={maskApiKey(apiConfig.amap_key)}
              onChange={(e) => handleApiConfigChange('amap_key', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={apiDescriptions.amap_key.placeholder}
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
          <p className="mt-1 text-xs text-gray-500">{apiDescriptions.amap_key.description}</p>
        </div>
      </div>

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">配置说明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 所有 API 密钥都安全存储在本地浏览器中，不会上传到任何服务器</li>
          <li>• 认证与数据存储现为本地实现，无需外部数据库</li>
          <li>• AI 服务用于智能行程规划（可选）</li>
          <li>• 语音识别需要科大讯飞的 API 配置（可选）</li>
          <li>• 地图服务需要高德地图 API Key（可选）</li>
        </ul>
      </div>
    </div>
  );
};

export default APIKeyManager;
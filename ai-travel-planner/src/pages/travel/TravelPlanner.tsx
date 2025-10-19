import { useState, useEffect, useRef } from 'react';
import { useTravelStore } from '../../stores/travelStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../../stores/configStore';
import { XFYunIAT } from '../../services/voice/xfyunIat';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        maxAlternatives: number;
        onstart: () => void;
        onresult: (event: SpeechRecognitionEvent) => void;
        onerror: (event: { error: string }) => void;
        onend: () => void;
        start: () => void;
        abort: () => void;
      };
    };
    webkitSpeechRecognition?: Window['SpeechRecognition'];
  }
}
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  SparklesIcon,
  MicrophoneIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const travelSchema = z.object({
  destination: z.string().min(1, '请输入目的地'),
  start_date: z.string().min(1, '请选择开始日期'),
  end_date: z.string().min(1, '请选择结束日期'),
  budget: z.number().min(1, '预算必须大于0'),
  travelers: z.number().min(1, '至少1人'),
  preferences: z.array(z.string()).min(1, '请至少选择一个偏好'),
  remarks: z.string().max(500).optional(),
});

type TravelFormData = z.infer<typeof travelSchema>;

const preferenceOptions = [
  { id: 'food', label: '美食', icon: '🍜' },
  { id: 'culture', label: '文化', icon: '🏛️' },
  { id: 'nature', label: '自然', icon: '🏔️' },
  { id: 'shopping', label: '购物', icon: '🛍️' },
  { id: 'adventure', label: '冒险', icon: '🧗' },
  { id: 'relaxation', label: '休闲', icon: '🏖️' },
  { id: 'photography', label: '摄影', icon: '📷' },
  { id: 'nightlife', label: '夜生活', icon: '🌃' },
  { id: 'anime', label: '动漫', icon: '🎌' },
  { id: 'history', label: '历史', icon: '📚' },
];

const TravelPlanner = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [customPref, setCustomPref] = useState('');
  const recognizerRef = useRef<{ stop: () => void } | null>(null);
  const { generateItinerary, createPlan } = useTravelStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TravelFormData>({
    resolver: zodResolver(travelSchema),
    defaultValues: {
      destination: '',
      start_date: '',
      end_date: '',
      budget: 0,
      travelers: 1,
      preferences: [],
      remarks: '',
    },
  });

  const selectedPreferences = watch('preferences');

  const togglePreference = (preferenceId: string) => {
    const current = selectedPreferences;
    const updated = current.includes(preferenceId)
      ? current.filter(id => id !== preferenceId)
      : [...current, preferenceId];
    setValue('preferences', updated);
  };

  const PENDING_DRAFT_KEY = 'pending-plan-draft';

  // 基于中文口述的简单解析：目的地/预算/人数/偏好
  const applyVoiceParsing = (text: string) => {
    try {
      // 目的地：匹配“去XXX”或“我想去XXX”
      const destMatch = text.match(/(?:我想去|去)([\\u4e00-\\u9fa5A-Za-z0-9·\\s]{1,30})/);
      if (destMatch && destMatch[1]) {
        const dest = destMatch[1].replace(/(玩|旅游|旅行|看看|逛逛)$/,'').trim();
        if (dest) setValue('destination', dest);
      }
      // 预算：匹配“预算xxx元/块/人民币/¥”
      const budgetMatch = text.match(/(?:预算|花费|经费|大约|大概)\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(?:元|块|人民币|RMB|¥)?/i);
      if (budgetMatch && budgetMatch[1]) {
        const b = Math.round(parseFloat(budgetMatch[1]));
        if (Number.isFinite(b) && b > 0) setValue('budget', b);
      }
      // 人数：匹配“(一共|人数|我们)X人”
      const numMatch = text.match(/(?:一共|人数|我们)?\\s*([0-9]+)\\s*人/);
      if (numMatch && numMatch[1]) {
        const n = parseInt(numMatch[1], 10);
        if (Number.isFinite(n) && n > 0) setValue('travelers', n);
      }
      // 偏好：按关键词映射
      const prefMap: Record<string,string> = {
        '美食|吃|餐厅|小吃':'food',
        '文化|博物馆|艺术|历史':'culture',
        '自然|山|湖|公园|海':'nature',
        '购物|买买买|商场|奥特莱斯':'shopping',
        '冒险|徒步|攀岩|潜水':'adventure',
        '休闲|放松|度假|温泉':'relaxation',
        '摄影|拍照|打卡':'photography',
        '夜生活|酒吧|夜店':'nightlife',
        '动漫|二次元|动画':'anime',
        '历史|古城|遗址':'history'
      };
      const selected = new Set<string>(watch('preferences') || []);
      Object.entries(prefMap).forEach(([keys, id]) => {
        if (new RegExp(keys).test(text)) selected.add(id);
      });
      setValue('preferences', Array.from(selected));
    } catch {}
  };

  const onSubmit = async (data: TravelFormData) => {
    setIsGenerating(true);
    try {
      const days = Math.ceil(
        (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const itinerary = await generateItinerary({
        destination: data.destination,
        days,
        budget: data.budget,
        travelers: data.travelers,
        preferences: data.preferences,
        start_date: data.start_date,
      });

      const draft = {
        title: `${data.destination} 旅行`,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        budget: data.budget,
        travelers: data.travelers,
        preferences: data.preferences,
        itinerary,
        expenses: [] as any[],
      };

      // 未登录：先持久化草稿，提示登录
      if (!user) {
        try {
          localStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(draft));
        } catch {}
        setShowLoginPrompt(true);
        return;
      }

      const newId = await createPlan({
        user_id: user.id,
        ...draft,
      });

      if (newId) {
        navigate(`/travel/${newId}`);
      }

    } catch (error) {
      console.error('Failed to generate itinerary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 登录后自动恢复未保存的草稿
  useEffect(() => {
    const tryRecover = async () => {
      if (!user) return;
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(PENDING_DRAFT_KEY);
      } catch {}
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        const newId = await createPlan({
          user_id: user.id,
          ...draft,
        });
        // 清理草稿并跳转详情
        localStorage.removeItem(PENDING_DRAFT_KEY);
        if (newId) navigate(`/travel/${newId}`);
      } catch (e) {
        console.error('Failed to recover pending draft:', e);
      }
    };
    tryRecover();
    // 依赖 user，登录成功时触发
  }, [user, createPlan, navigate]);

  const handleVoiceInput = () => {
    // 若正在录音，则本次点击视为“停止录音”
    if (isListening && recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch {}
      recognizerRef.current = null;
      setIsListening(false);
      return;
    }

    const cfg = (useConfigStore.getState().config || {}) as any;
    const appId = (cfg.xunfei_app_id || '').trim();
    const apiKey = (cfg.xunfei_api_key || '').trim();
    const apiSecret = (cfg.xunfei_api_secret || '').trim();

    // Prefer XFYun IAT if fully configured
    if (appId && apiKey && apiSecret) {
      const client = new XFYunIAT(
        { appId, apiKey, apiSecret },
        {
          onStart: () => setIsListening(true),
          onInterim: (t) => setVoiceInput(prev => prev ? prev + ' ' + t : t), // Accumulate interim results
          onFinal: (t) => {
            setVoiceInput(prev => prev ? prev + ' ' + t : t); // Accumulate final results
            applyVoiceParsing(t);
          },
          onError: (e) => {
            console.error('xfyun error:', e);
            setIsListening(false);
            alert('讯飞识别出错，已回退到浏览器语音识别。');
            fallbackWebSpeech();
          },
          onEnd: () => setIsListening(false),
        }
      );
      (window as any).__xfyunClient = client; // optional: allow stop from console
      recognizerRef.current = { stop: () => client.stop() };
      client.start();
      return;
    }

    // Fallback
    fallbackWebSpeech();

    function fallbackWebSpeech() {
      if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
        alert('您的浏览器不支持语音识别功能');
        return;
      }
      const SRClass = (window.webkitSpeechRecognition || window.SpeechRecognition) as any;
      if (!SRClass) {
        alert('您的浏览器不支持语音识别功能');
        return;
      }
      const recognition = new SRClass();

      recognition.lang = 'zh-CN';
      recognition.continuous = true; // Changed to true for continuous recognition
      recognition.interimResults = true; // Changed to true to get interim results

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) finalText += text;
          else interimText += text;
        }
        
        // Accumulate results instead of replacing them
        setVoiceInput(prev => {
          let newText = prev;
          if (finalText) {
            // Add space if needed
            if (newText && !newText.endsWith(' ')) {
              newText += ' ';
            }
            newText += finalText;
          }
          // For interim text, we just display it but don't accumulate it yet
          // The final accumulated text will be used for parsing
          const displayText = newText + (interimText ? (newText ? ' ' : '') + interimText : '');
          return displayText;
        });
        
        if (finalText) {
          // Apply parsing to the accumulated text, not just the new final text
          const currentAccumulatedText = voiceInput ? voiceInput + ' ' + finalText : finalText;
          applyVoiceParsing(currentAccumulatedText);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      // 将 Web Speech 识别对象包装成统一 stop 接口
      recognizerRef.current = { stop: () => {
        try { recognition.stop && recognition.stop(); } catch {}
        try { recognition.abort && recognition.abort(); } catch {}
      }};
      recognition.start();
    }
  };

  // Add a function to clear accumulated voice input
  const clearVoiceInput = () => {
    setVoiceInput('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 登录提示模态框 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">保存行程需要登录</h3>
              </div>
              <p className="text-gray-600 mb-6">
                您的行程已成功生成，但需要登录账户才能保存和管理行程计划。
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

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">智能行程规划</h1>

        {/* 语音输入区域 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MicrophoneIcon className="h-6 w-6 text-blue-600" />
              <span className="text-sm text-blue-800">语音输入行程需求</span>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={clearVoiceInput}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                清除
              </button>
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isListening
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isListening ? '停止录音' : '开始录音'}
              </button>
            </div>
          </div>
          {voiceInput && (
            <div className="mt-3 p-3 bg-white rounded-md">
              <p className="text-sm text-gray-600">识别结果：</p>
              <p className="text-gray-900 break-words">{voiceInput}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyVoiceParsing(voiceInput)}
                  className="px-3 py-1.5 rounded-md text-sm bg-white border border-gray-300 hover:bg-gray-50"
                >
                  根据识别内容填充
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = watch('start_date'); const e = watch('end_date');
                    if (!s || !e) { alert('请先选择开始/结束日期'); return; }
                    handleSubmit(onSubmit)();
                  }}
                  className="px-3 py-1.5 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  一键生成
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 目的地 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPinIcon className="h-4 w-4 mr-2" />
              目的地
            </label>
            <input
              type="text"
              {...register('destination')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如：日本东京"
            />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
            )}
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="h-4 w-4 mr-2" />
                开始日期
              </label>
              <input
                type="date"
                {...register('start_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="h-4 w-4 mr-2" />
                结束日期
              </label>
              <input
                type="date"
                {...register('end_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* 预算和人数 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                预算（元）
              </label>
              <input
                type="number"
                {...register('budget', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10000"
              />
              {errors.budget && (
                <p className="mt-1 text-sm text-red-600">{errors.budget.message}</p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <UserGroupIcon className="h-4 w-4 mr-2" />
                旅行人数
              </label>
              <input
                type="number"
                {...register('travelers', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2"
                min="1"
              />
              {errors.travelers && (
                <p className="mt-1 text-sm text-red-600">{errors.travelers.message}</p>
              )}
            </div>
          </div>

          {/* 旅行偏好 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <SparklesIcon className="h-4 w-4 mr-2" />
              旅行偏好
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {preferenceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => togglePreference(option.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedPreferences.includes(option.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
            {errors.preferences && (
              <p className="mt-2 text-sm text-red-600">{errors.preferences.message}</p>
            )}
            {/* 自定义偏好输入与标签 */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customPref}
                onChange={(e) => setCustomPref(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="添加自定义偏好，如：亲子、动漫、美食街"
              />
              <button
                type="button"
                onClick={() => {
                  const v = (customPref || '').trim();
                  if (!v) return;
                  const cur = (watch('preferences') || []) as string[];
                  if (!cur.includes(v)) {
                    setValue('preferences', [...cur, v]);
                  }
                  setCustomPref('');
                }}
                className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                添加
              </button>
            </div>
            {selectedPreferences && selectedPreferences.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedPreferences.map((p) => (
                  <span key={p} className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                    {p}
                    <button
                      type="button"
                      onClick={() => setValue('preferences', selectedPreferences.filter(id => id !== p))}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                      aria-label={`移除 ${p}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              {...register('remarks')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="可选：补充说明（如必须包含某个景点/餐厅，饮食禁忌，特殊人群需求等）"
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2 animate-spin" />
                  AI正在规划中...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  生成智能行程
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TravelPlanner;
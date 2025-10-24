import { useParams, Link } from 'react-router-dom';
import { openaiService } from '../../services/ai/openaiService';
import { extractPoiQueries } from '../../services/ai/poiExtractor';
import { amapSearchText } from '../../services/maps/amap';
import type { AmapPlace } from '../../services/maps/amap';
import { useTravelStore } from '../../stores/travelStore';
import { useConfigStore } from '../../stores/configStore';
import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import { MapPinIcon, CalendarIcon, CurrencyDollarIcon, UserGroupIcon, ArrowLeftIcon, ArrowPathIcon, MicrophoneIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import AMap from '../../components/features/AMap';
import { env } from '../../utils/env';

const DEFAULT_CENTER = {
  name: '北京',
  address: '北京市',
  latitude: 39.9042,
  longitude: 116.4074,
};

const EXPENSE_CATEGORIES = [
  { value: 'transportation', label: '交通' },
  { value: 'accommodation', label: '住宿' },
  { value: 'food', label: '餐饮' },
  { value: 'attraction', label: '景点' },
  { value: 'shopping', label: '购物' },
  { value: 'activities', label: '活动' },
  { value: 'other', label: '其他' },
] as const;

const buildExpenseFormState = () => ({
  amount: '',
  category: 'other',
  description: '',
  date: new Date().toISOString().slice(0, 10),
});

const expenseLabel = (value: string) => EXPENSE_CATEGORIES.find(c => c.value === value)?.label ?? value;

const normalizeKey = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatLocationParam = (loc: unknown): string | null => {
  if (!loc) return null;
  if (typeof loc === 'string') {
    const [lngStr, latStr] = loc.split(',');
    const lng = toFiniteNumber(lngStr);
    const lat = toFiniteNumber(latStr);
    if (lng === null || lat === null) return null;
    return `${lng},${lat}`;
  }
  if (typeof loc === 'object') {
    const anyLoc = loc as Record<string, unknown>;
    const lngArray = Array.isArray(anyLoc.lnglat) ? anyLoc.lnglat : undefined;
    const lng = toFiniteNumber(anyLoc.longitude ?? anyLoc.lng ?? anyLoc.lon ?? (lngArray ? lngArray[0] : undefined));
    const lat = toFiniteNumber(anyLoc.latitude ?? anyLoc.lat ?? (lngArray ? lngArray[1] : undefined));
    if (lng === null || lat === null) return null;
    return `${lng},${lat}`;
  }
  return null;
};

const TravelDetail = () => {
  const { id } = useParams();
  const { plans, loadPlans, generateItinerary, updatePlan, addExpense, updateExpense, removeExpense } = useTravelStore();
  const { config } = useConfigStore();
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // 附近推荐（POI）状态
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [poiOpen, setPoiOpen] = useState(true);
  const [poi, setPoi] = useState<{
    transport: AmapPlace[];
    hotels: AmapPlace[];
    restaurants: AmapPlace[];
  }>({ transport: [], hotels: [], restaurants: [] });

  // 预算分析状态
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    breakdown: { transportation: number; accommodation: number; dining: number; attractions: number; activities: number; shopping: number; other: number; };
    daily_budget: number[];
    tips: string[];
  } | null>(null);

  // 语音记账状态
  const [isListening, setIsListening] = useState(false);
  const [voiceExpense, setVoiceExpense] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ amount: number; category: string; description: string; date: string }>({ amount: 0, category: 'other', description: '', date: new Date().toISOString().slice(0,10) });
  const [newExpenseForm, setNewExpenseForm] = useState(() => buildExpenseFormState());
  const [addingExpense, setAddingExpense] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);

  const resolvedAmapKey = useMemo(() => {
    const fromConfig = normalizeKey(config?.amap_key);
    if (fromConfig) return fromConfig;
    const envKey = normalizeKey(env.amapKey);
    if (envKey) return envKey;
    try {
      const raw = localStorage.getItem('config-store');
      if (raw) {
        const parsed = JSON.parse(raw);
        const stored = normalizeKey(parsed?.state?.amap_key || parsed?.amap_key);
        if (stored) return stored;
      }
    } catch {}
    return '';
  }, [config?.amap_key]);

  const startVoiceExpense = () => {
    const SRClass = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SRClass) { alert('您的浏览器不支持语音识别功能'); return; }
    const rec = new SRClass();
    rec.lang = 'zh-CN'; rec.continuous = false; rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = async (e: any) => {
      const text = e.results[0][0].transcript as string;
      setVoiceExpense(text);
      const amtMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:元|块|人民币|RMB|¥)?/i);
      const amount = amtMatch ? Math.round(parseFloat(amtMatch[1])) : 0;
      const catPairs: Array<[RegExp, string]> = [
        [/早饭|午饭|晚饭|餐|吃|美食|小吃|咖啡|奶茶/, 'food'],
        [/地铁|打车|出租|公交|车票|高铁|飞机|航班|滴滴/, 'transportation'],
        [/酒店|民宿|住宿|房费|客栈/, 'accommodation'],
        [/门票|景点|博物馆|乐园|展览|观光/, 'attraction'],
        [/购物|买|特产|纪念品|商场|奥特莱斯/, 'shopping'],
        [/活动|体验|娱乐|演出|项目/, 'activities'],
      ];
      let category = 'other';
      for (const [re, id] of catPairs) { if (re.test(text)) { category = id; break; } }
      const description = text.replace(/([0-9]+(?:\.[0-9]+)?)\s*(?:元|块|人民币|RMB|¥)?/i, '').trim() || '语音记账';
      const date = new Date().toISOString().slice(0,10);

      try {
        await addExpense({
          travel_plan_id: plan!.id,
          category: category as any,
          amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
          description,
          date,
        });
      } catch {}
    };
    rec.start();
  };

  // 若直接访问详情页且本地列表为空，则尝试加载行程列表以恢复数据
  useEffect(() => {
    if (!id) return;
    if (plans.length === 0) {
      loadPlans().catch(() => {});
    }
  }, [id, plans.length]);

  const plan = plans.find(p => p.id === id);

  // 直接访问详情页：若找不到则尝试按ID单独拉取
  useEffect(() => {
    if (!id || plan) return;
    useTravelStore.getState().fetchPlanById(id).catch(() => {});
  }, [id, plan]);

  const itineraryMarkers = useMemo(() => {
    if (!plan) return [] as Array<{ name: string; address: string; latitude: number; longitude: number }>;
    const sorted = [...plan.itinerary].sort((a, b) => {
      const dayDiff = (a.day ?? 0) - (b.day ?? 0);
      if (dayDiff !== 0) return dayDiff;
      return (a.time || '').localeCompare(b.time || '');
    });
    return sorted
      .map(item => {
        const loc = item.location;
        if (!loc) return null;
        const lng = toFiniteNumber(loc.longitude);
        const lat = toFiniteNumber(loc.latitude);
        if (lng === null || lat === null) return null;
        if (lng === 0 && lat === 0) return null;
        return {
          name: loc.name || item.title,
          address: loc.address || plan.destination,
          latitude: lat,
          longitude: lng,
        };
      })
      .filter(Boolean) as Array<{ name: string; address: string; latitude: number; longitude: number }>;
  }, [plan]);

  const poiMarkers = useMemo(() => {
    const parseLocation = (loc?: string) => {
      if (!loc) return null;
      const [lngStr, latStr] = loc.split(',');
      const lng = toFiniteNumber(lngStr);
      const lat = toFiniteNumber(latStr);
      if (lng === null || lat === null) return null;
      return { longitude: lng, latitude: lat };
    };

    return [...poi.transport, ...poi.hotels, ...poi.restaurants]
      .map(place => {
        const coords = parseLocation(place.location);
        if (!coords) return null;
        return {
          name: place.name,
          address: place.address || '',
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
      })
      .filter(Boolean) as Array<{ name: string; address: string; latitude: number; longitude: number }>;
  }, [poi]);

  const mapMarkers = useMemo(() => [...itineraryMarkers, ...poiMarkers], [itineraryMarkers, poiMarkers]);

  const mapCenter = useMemo(() => {
    if (mapMarkers.length > 0) {
      return mapMarkers[0];
    }
    return {
      name: plan ? plan.destination : DEFAULT_CENTER.name,
      address: plan ? plan.destination : DEFAULT_CENTER.address,
      latitude: DEFAULT_CENTER.latitude,
      longitude: DEFAULT_CENTER.longitude,
    };
  }, [mapMarkers, plan?.destination]);

  const fetchPoiRecommendations = useCallback(
    async ({ force = false, signal }: { force?: boolean; signal?: AbortSignal } = {}) => {
      if (!plan) return;
      const cacheKey = `poi-reco:${plan.id}`;
      const readCached = () => {
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (!cachedRaw) return null;
          return JSON.parse(cachedRaw);
        } catch {
          return null;
        }
      };

      if (!force) {
        const cached = readCached();
        if (cached) {
          if (!signal?.aborted) {
            setPoi(cached);
          }
          return;
        }
      }

      if (signal?.aborted) return;

      setPoiLoading(true);
      setPoiError(null);

      try {
        const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
        const delayBetweenRequestsMs = 400;

        const queries = await extractPoiQueries({
          destination: plan.destination,
          itinerary: plan.itinerary.map(i => ({
            day: i.day,
            time: i.time,
            title: i.title,
            description: i.description,
            location: i.location,
            category: i.category,
          })),
        });

        if (signal?.aborted) return;

        const rawRefLoc = plan.itinerary.find(i => i.location?.address || i.location?.name)?.location;
        const locationParam = formatLocationParam(rawRefLoc);
        const key = resolvedAmapKey;

        if (!key) {
          if (!signal?.aborted) {
            setPoiError('未配置高德地图 Key，已跳过附近推荐检索');
            setPoiLoading(false);
          }
          return;
        }

        const fallbackIfEmpty = (arr: string[] | undefined, fallback: string[]) => {
          const cleaned = (Array.isArray(arr) ? arr : [])
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter(Boolean);
          return cleaned.length > 0 ? cleaned : fallback;
        };

        const transportQueries = fallbackIfEmpty(queries.transport, ['交通枢纽', '地铁站', '公交站']).slice(0, 2);
        const hotelQueries = fallbackIfEmpty(queries.hotels, ['酒店', '住宿', '民宿']).slice(0, 2);
        const restaurantQueries = fallbackIfEmpty(queries.restaurants, ['餐厅', '美食', '小吃']).slice(0, 2);

        type PoiCategory = 'transport' | 'hotels' | 'restaurants';
        const categoryConfigs: Array<{ key: PoiCategory; queries: string[] }> = [
          { key: 'transport', queries: transportQueries },
          { key: 'hotels', queries: hotelQueries },
          { key: 'restaurants', queries: restaurantQueries },
        ];

        const destinationRaw = (plan.destination || '').trim();
        const fragments = destinationRaw
          .split(/[·\s,，、\-]+/)
          .map(part => part.trim())
          .filter(Boolean);
        const primaryFragment = fragments.length > 0 ? fragments[fragments.length - 1] : destinationRaw;
        const normalizeDestination = (value: string) => value.replace(/[·,，、]+/g, ' ').replace(/\s+/g, ' ').trim();

        const buildKeyword = (keyword: string) => {
          const normalized = keyword.trim();
          if (!normalized) return '';
          if (!destinationRaw) return normalized;
          const dest = normalizeDestination(destinationRaw);
          return `${dest} ${normalized}`.replace(/\s+/g, ' ').trim();
        };

        const searchOnce = async (keyword: string) => {
          const finalKeyword = buildKeyword(keyword);
          if (!finalKeyword) return [] as AmapPlace[];
          try {
            const res = await amapSearchText({
              key,
              keywords: finalKeyword,
              city: primaryFragment || undefined,
              location: locationParam ?? undefined,
              sortrule: locationParam ? 'distance' : 'weight',
              page: 1,
              offset: 10,
            });
            return Array.isArray(res) ? res : [];
          } catch (err: any) {
            const message = String(err?.message || '');
            if (message.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT')) {
              throw err;
            }
            return [];
          }
        };

        const results: Record<PoiCategory, AmapPlace[]> = {
          transport: [],
          hotels: [],
          restaurants: [],
        };

        for (let categoryIndex = 0; categoryIndex < categoryConfigs.length; categoryIndex++) {
          const { key: categoryKey, queries } = categoryConfigs[categoryIndex];
          if (signal?.aborted) return;
          const seen = new Set<string>();
          for (let queryIndex = 0; queryIndex < queries.length; queryIndex++) {
            const rawQuery = queries[queryIndex];
            if (signal?.aborted) return;
            const candidate = (rawQuery || '').trim();
            if (!candidate || seen.has(candidate)) continue;
            seen.add(candidate);
            const res = await searchOnce(candidate);
            if (signal?.aborted) return;
            if (res.length > 0) {
              results[categoryKey] = res;
              break;
            }
            const hasNextQuery = queryIndex < queries.length - 1;
            if (hasNextQuery) {
              await sleep(delayBetweenRequestsMs);
            }
          }
          const hasNextCategory = categoryIndex < categoryConfigs.length - 1;
          if (hasNextCategory && results[categoryKey].length === 0) {
            await sleep(delayBetweenRequestsMs);
          }
        }

        if (signal?.aborted) return;

        const next = {
          transport: dedupeById(results.transport).slice(0, 12),
          hotels: dedupeById(results.hotels).slice(0, 12),
          restaurants: dedupeById(results.restaurants).slice(0, 12),
        };
        setPoi(next);
        try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
      } catch (e: any) {
        if (!signal?.aborted) {
          const message = String(e?.message || '');
          const cached = readCached();
          if (cached) {
            setPoi(cached);
          }
          if (message.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT')) {
            setPoiError(cached ? '附近推荐调用频繁，已展示上次结果' : '附近推荐调用频繁，请稍后重试');
          } else {
            setPoiError(e?.message || (cached ? '附近推荐检索失败，已展示上次结果' : '附近推荐检索失败，请稍后重试'));
          }
        }
      } finally {
        if (!signal?.aborted) {
          setPoiLoading(false);
        }
      }
    },
    [plan, resolvedAmapKey]
  );

  // 自动触发：读取缓存或发起检索
  useEffect(() => {
    if (!plan) return;
    const controller = new AbortController();
    fetchPoiRecommendations({ signal: controller.signal }).catch(() => {});
    return () => controller.abort();
  }, [plan, fetchPoiRecommendations]);

  function dedupeById(items: AmapPlace[]): AmapPlace[] {
    const seen = new Set<string>();
    const out: AmapPlace[] = [];
    for (const it of items) {
      const key = it.id || `${it.name}-${it.address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500 mr-2" />
            <Link to="/travel" className="text-blue-600 hover:underline">返回我的行程</Link>
          </div>
          <div className="text-gray-500">行程未找到或加载中，请稍后重试。</div>
        </div>
      </div>
    );
  }

  const totalExpenses = plan.expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleManualExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addingExpense) return;
    setAddExpenseError(null);
    const parsedAmount = Number.parseFloat(newExpenseForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAddExpenseError('请输入大于 0 的金额');
      return;
    }
    const amountValue = Math.round(parsedAmount);
    const description = newExpenseForm.description.trim() || '手动记账';
    const date = newExpenseForm.date || new Date().toISOString().slice(0, 10);
    setAddingExpense(true);
    try {
      await addExpense({
        travel_plan_id: plan.id,
        category: newExpenseForm.category as any,
        amount: amountValue,
        description,
        date,
      });
      setNewExpenseForm(prev => ({
        ...buildExpenseFormState(),
        category: prev.category,
        date: prev.date,
      }));
    } catch (e: any) {
      setAddExpenseError(e?.message || '新增开销失败，请稍后重试');
    } finally {
      setAddingExpense(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500 mr-2" />
          <Link to="/travel" className="text-blue-600 hover:underline">返回我的行程</Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{plan.title || '未命名行程'}</h1>
          <div className="flex items-center space-x-3">
            {regenError && <span className="text-sm text-red-600">{regenError}</span>}
            {analysisError && <span className="text-sm text-red-600">{analysisError}</span>}
            <button
              disabled={regenerating}
              onClick={async () => {
                setRegenError(null);
                setRegenerating(true);
                try {
                  const days = Math.max(
                    1,
                    Math.ceil(
                      (new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1
                  );
                  const newItinerary = await generateItinerary({
                    destination: plan.destination,
                    days,
                    budget: plan.budget,
                    travelers: plan.travelers,
                    preferences: plan.preferences,
                    start_date: plan.start_date,
                  });
                  await updatePlan(plan.id, { itinerary: newItinerary });
                } catch (e: any) {
                  setRegenError(e?.message || '重新生成失败，请稍后重试');
                } finally {
                  setRegenerating(false);
                }
              }}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                regenerating ? 'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              }`}
              title="基于当前参数重新生成行程"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? '正在重新生成...' : '一键重新生成'}
            </button>

            <button
              disabled={analyzing}
              onClick={async () => {
                setAnalysisError(null);
                setAnalyzing(true);
                try {
                  const days = Math.max(
                    1,
                    Math.ceil(
                      (new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1
                  );
                  const result = await openaiService.analyzeBudget({
                    destination: plan.destination,
                    days,
                    budget: plan.budget,
                    travelers: plan.travelers,
                    preferences: plan.preferences,
                    start_date: plan.start_date
                  });
                  setAnalysis(result);
                } catch (e: any) {
                  setAnalysis(null);
                  setAnalysisError(e?.message || '预算分析失败，请稍后重试');
                } finally {
                  setAnalyzing(false);
                }
              }}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                analyzing ? 'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
              }`}
              title="基于当前参数进行预算分析"
            >
              {analyzing ? '正在分析预算...' : '预算分析'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center text-gray-700">
            <MapPinIcon className="h-5 w-5 mr-2" />
            <span>{plan.destination || '—'}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <CalendarIcon className="h-5 w-5 mr-2" />
            <span>{`${new Date(plan.start_date).toLocaleDateString('zh-CN')} - ${new Date(plan.end_date).toLocaleDateString('zh-CN')}`}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            <span>{plan.travelers ?? '—'} 人</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center text-gray-700">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            <span>预算：¥{(plan.budget ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            <span>已花费：¥{totalExpenses.toLocaleString()}</span>
          </div>
          <div className="text-gray-700">
            偏好：{plan.preferences?.length ? plan.preferences.join('、') : '—'}
          </div>
        </div>

        <div className="mb-6 border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">行程地图</h2>
          </div>
          <AMap
            center={mapCenter}
            markers={mapMarkers}
            polylinePath={itineraryMarkers}
            height="360px"
            className="w-full"
            apiKey={resolvedAmapKey || undefined}
          />
        </div>

        {/* 费用管理 */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">费用管理</h2>
        <div className="mb-6 border rounded-lg p-4 bg-white">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <div className="xl:col-span-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <MicrophoneIcon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-blue-900">语音记账</p>
                      <p className="text-xs text-blue-700/80">示例：“餐饮 120 元 午饭” 或 “交通 45 元 地铁”</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      {isListening && <span className="text-xs text-red-600">正在识别语音...</span>}
                      <button
                        type="button"
                        disabled={isListening}
                        onClick={startVoiceExpense}
                        className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
                          isListening ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isListening ? '识别中...' : '开始录音'}
                      </button>
                    </div>
                  </div>
                </div>
                {voiceExpense && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">识别结果</div>
                        <div className="mt-1 font-medium text-emerald-900">{voiceExpense}</div>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        onClick={() => setVoiceExpense('')}
                      >
                        清除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-3 space-y-4">
              <form
                onSubmit={handleManualExpenseSubmit}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div>
                  <label className="block text-xs text-gray-500 mb-1">金额</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newExpenseForm.amount}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded border px-2 py-1"
                    placeholder="金额"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">分类</label>
                  <select
                    value={newExpenseForm.category}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded border px-2 py-1"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">描述</label>
                  <input
                    type="text"
                    value={newExpenseForm.description}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded border px-2 py-1"
                    placeholder="描述"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">日期</label>
                  <input
                    type="date"
                    value={newExpenseForm.date}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded border px-2 py-1"
                    required
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={addingExpense}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white transition ${
                      addingExpense ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {addingExpense ? '添加中...' : '添加开销'}
                  </button>
                </div>
              </form>
              {addExpenseError && (
                <div className="text-sm text-red-600">{addExpenseError}</div>
              )}
            </div>
          </div>

          <div className="mt-6">
            {plan.expenses.length === 0 ? (
              <div className="text-sm text-gray-500">暂无开销记录</div>
            ) : (
              <ul className="space-y-2">
                {plan.expenses.map(exp => (
                  <li key={exp.id} className="p-3 border rounded-md">
                    {editId === exp.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                        <input
                          type="number"
                          value={editForm.amount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseInt(e.target.value || '0', 10) }))}
                          className="px-2 py-1 border rounded"
                          placeholder="金额"
                        />
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          className="px-2 py-1 border rounded"
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          className="px-2 py-1 border rounded md:col-span-2"
                          placeholder="描述"
                        />
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                          className="px-2 py-1 border rounded"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-sm text-white bg-emerald-600 rounded"
                            onClick={async () => {
                              await updateExpense(exp.id, {
                                amount: editForm.amount,
                                category: editForm.category as any,
                                description: editForm.description,
                                date: editForm.date,
                              });
                              setEditId(null);
                            }}
                          >
                            保存
                          </button>
                          <button
                            className="px-2 py-1 text-sm border rounded"
                            onClick={() => setEditId(null)}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          <div>¥{exp.amount.toLocaleString()} · {expenseLabel(exp.category)} · {exp.description}</div>
                          <div className="text-xs text-gray-500">{exp.date}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center px-2 py-1 text-sm border rounded hover:bg-gray-50"
                            onClick={() => {
                              setEditId(exp.id);
                              setEditForm({
                                amount: exp.amount,
                                category: exp.category,
                                description: exp.description,
                                date: exp.date,
                              });
                            }}
                          >
                            <PencilSquareIcon className="h-4 w-4 mr-1" />
                            编辑
                          </button>
                          <button
                            className="inline-flex items-center px-2 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                            onClick={async () => {
                              if (confirm('确认删除该开销？')) {
                                await removeExpense(exp.id);
                              }
                            }}
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-3">行程安排</h2>

        {analysis && (
          <div className="mb-6 border rounded-lg p-4 bg-white">
            <h3 className="text-md font-semibold text-gray-900 mb-2">预算分析</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-700">
              <div>交通：¥{analysis.breakdown.transportation.toLocaleString()}</div>
              <div>住宿：¥{analysis.breakdown.accommodation.toLocaleString()}</div>
              <div>餐饮：¥{analysis.breakdown.dining.toLocaleString()}</div>
              <div>景点：¥{analysis.breakdown.attractions.toLocaleString()}</div>
              <div>活动：¥{analysis.breakdown.activities.toLocaleString()}</div>
              <div>购物：¥{analysis.breakdown.shopping.toLocaleString()}</div>
              <div>其他：¥{analysis.breakdown.other.toLocaleString()}</div>
            </div>
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-900 mb-1">每日建议预算</div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-700">
                {analysis.daily_budget.map((v, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded">
                    第{i + 1}天：¥{Number(v).toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
            {analysis.tips.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-900 mb-1">建议</div>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {analysis.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-gray-900">附近推荐</h3>
            <div className="flex items-center gap-3">
              {poiLoading && <span className="text-sm text-gray-600">正在获取附近推荐...</span>}
              {poiError && <span className="text-sm text-red-600">{poiError}</span>}
              <button
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:hover:no-underline"
                onClick={() => fetchPoiRecommendations({ force: true })}
                disabled={poiLoading}
              >
                {poiLoading ? '刷新中...' : '刷新推荐'}
              </button>
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setPoiOpen(o => !o)}
              >
                {poiOpen ? '折叠' : '展开'}
              </button>
            </div>
          </div>
          {poiOpen && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <PoiList title="交通" items={poi.transport} />
              <PoiList title="住宿" items={poi.hotels} />
              <PoiList title="餐厅" items={poi.restaurants} />
            </div>
          )}
        </div>

        {plan.itinerary.length === 0 ? (
          <div className="text-gray-500">暂无行程项目</div>
        ) : (
          <ul className="space-y-3">
            {plan.itinerary.map(item => (
              <li key={item.id} className="p-4 bg-white border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">
                    第{item.day}天 · {item.time} · {item.title}
                  </div>
                  {typeof item.estimated_cost === 'number' && (
                    <div className="text-sm text-gray-500">¥{item.estimated_cost.toLocaleString()}</div>
                  )}
                </div>
                <div className="mt-1 text-gray-700">{item.description}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {item.location?.name} · {item.location?.address}
                </div>
                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700">
                    {item.category}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

function PoiList({ title, items }: { title: string; items: AmapPlace[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div>
        <div className="font-medium text-gray-900 mb-2">{title}</div>
        <div className="text-gray-500">暂无推荐</div>
      </div>
    );
  }

  const visibleItems = expanded ? items : items.slice(0, 3);

  return (
    <div>
      <div className="font-medium text-gray-900 mb-2">{title}</div>
      <ul className="space-y-2">
        {visibleItems.map((p) => (
          <li key={p.id || p.name + p.address} className="p-2 border rounded">
            <div className="text-gray-900">{p.name}</div>
            <div className="text-gray-600">{p.address || '地址信息暂缺'}</div>
            {typeof p.distance === 'number' && (
              <div className="text-xs text-gray-500">距离：{Math.round(p.distance)} 米</div>
            )}
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          {expanded ? '收起推荐' : `展开更多（${items.length - 3}）`}
        </button>
      )}
    </div>
  );
}

export default TravelDetail;

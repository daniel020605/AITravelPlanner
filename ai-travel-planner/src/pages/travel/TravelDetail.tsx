import { useParams, Link } from 'react-router-dom';
import { openaiService } from '../../services/ai/openaiService';
import { extractPoiQueries } from '../../services/ai/poiExtractor';
import { amapSearchText } from '../../services/maps/amap';
import type { AmapPlace } from '../../services/maps/amap';
import { useTravelStore } from '../../stores/travelStore';
import { useConfigStore } from '../../stores/configStore';
import { useState, useEffect, useMemo } from 'react';
import { MapPinIcon, CalendarIcon, CurrencyDollarIcon, UserGroupIcon, ArrowLeftIcon, ArrowPathIcon, MicrophoneIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import AMap from '../../components/features/AMap';
import { env } from '../../utils/env';

const DEFAULT_CENTER = {
  name: '北京',
  address: '北京市',
  latitude: 39.9042,
  longitude: 116.4074,
};

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

const TravelDetail = () => {
  const { id } = useParams();
  const { plans, generateItinerary, updatePlan, addExpense, updateExpense, removeExpense } = useTravelStore();
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

  const plan = plans.find(p => p.id === id);

  if (!plan) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500 mr-2" />
          <Link to="/travel" className="text-blue-600 hover:underline">返回我的行程</Link>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">未找到行程</h1>
        <p className="text-gray-600">可能是页面刷新后内存数据丢失，请返回列表或重新生成行程。</p>
      </div>
    );
  }

  const totalExpenses = plan.expenses.reduce((sum, e) => sum + e.amount, 0);

  const itineraryMarkers = useMemo(() => {
    return plan.itinerary
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
  }, [plan, resolvedAmapKey]);

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
      name: plan.destination,
      address: plan.destination,
      latitude: DEFAULT_CENTER.latitude,
      longitude: DEFAULT_CENTER.longitude,
    };
  }, [mapMarkers, plan.destination]);

  // 自动触发：先读缓存 poi-reco:<plan.id>，否则抽取+检索并写入缓存
  useEffect(() => {
    if (!plan) return;
    let canceled = false;

    const cacheKey = `poi-reco:${plan.id}`;
    const cached = (() => {
      try { return localStorage.getItem(cacheKey); } catch { return null; }
    })();
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setPoi(parsed);
        return; // 已有结果，直接显示
      } catch {}
    }

    // 无缓存则调用提取+检索
    const run = async () => {
      setPoiLoading(true);
      setPoiError(null);
      try {
        // 用大模型抽取查询词
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

        const refLoc = plan.itinerary.find(i => i.location?.address || i.location?.name)?.location;
        const key = resolvedAmapKey;

        if (!key) {
          setPoiError('未配置高德地图 Key，已跳过附近推荐检索');
          setPoiLoading(false);
          return;
        }

        const take = (arr: string[]) => (Array.isArray(arr) ? arr.slice(0, 3) : []);
        const [tq, hq, rq] = [take(queries.transport), take(queries.hotels), take(queries.restaurants)];

        const searchOne = (kw: string) => amapSearchText({
          key,
          keywords: `${plan.destination} ${kw}`,
          location: refLoc as any,
          sortrule: refLoc ? 'distance' : 'weight',
          page: 1,
          offset: 10,
        }).catch(() => [] as AmapPlace[]);

        const [tRes, hRes, rRes] = await Promise.all([
          Promise.all(tq.map(searchOne)).then(list => list.flat()),
          Promise.all(hq.map(searchOne)).then(list => list.flat()),
          Promise.all(rq.map(searchOne)).then(list => list.flat()),
        ]);

        if (canceled) return;
        const next = {
          transport: dedupeById(tRes).slice(0, 12),
          hotels: dedupeById(hRes).slice(0, 12),
          restaurants: dedupeById(rRes).slice(0, 12),
        };
        setPoi(next);
        try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
      } catch (e: any) {
        if (!canceled) setPoiError(e?.message || '附近推荐检索失败，请稍后重试');
      } finally {
        if (!canceled) setPoiLoading(false);
      }
    };

    run();
    return () => { canceled = true; };
  }, [plan, resolvedAmapKey]);

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500 mr-2" />
          <Link to="/travel" className="text-blue-600 hover:underline">返回我的行程</Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{plan.title}</h1>
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
            <span>{plan.destination}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <CalendarIcon className="h-5 w-5 mr-2" />
            <span>{new Date(plan.start_date).toLocaleDateString('zh-CN')} - {new Date(plan.end_date).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            <span>{plan.travelers} 人</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center text-gray-700">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            <span>预算：¥{plan.budget.toLocaleString()}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            <span>已花费：¥{totalExpenses.toLocaleString()}</span>
          </div>
          <div className="text-gray-700">
            偏好：{plan.preferences.join('、')}
          </div>
        </div>

        <div className="mb-6 border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">行程地图</h2>
          </div>
          <AMap
            center={mapCenter}
            markers={mapMarkers}
            height="360px"
            className="w-full"
            apiKey={resolvedAmapKey || undefined}
          />
        </div>

        {/* 费用管理 */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">费用管理</h2>
        <div className="mb-6 border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-700">
              <MicrophoneIcon className="h-5 w-5" />
              <span className="text-sm">语音记账</span>
            </div>
            <button
              type="button"
              disabled={isListening}
              onClick={startVoiceExpense}
              className={`px-3 py-1.5 rounded-md text-sm ${isListening ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {isListening ? '正在听...' : '开始录音'}
            </button>
          </div>
          {voiceExpense && (
            <div className="mt-3 text-sm text-gray-700">
              识别结果：<span className="font-medium">{voiceExpense}</span>
            </div>
          )}

          <div className="mt-4">
            {plan.expenses.length === 0 ? (
              <div className="text-gray-500 text-sm">暂无开销记录</div>
            ) : (
              <ul className="space-y-2">
                {plan.expenses.map(exp => (
                  <li key={exp.id} className="p-3 border rounded-md">
                    {editId === exp.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                        <input
                          type="number"
                          value={editForm.amount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseInt(e.target.value || '0',10) }))}
                          className="px-2 py-1 border rounded"
                          placeholder="金额"
                        />
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="transportation">交通</option>
                          <option value="accommodation">住宿</option>
                          <option value="food">餐饮</option>
                          <option value="attraction">景点</option>
                          <option value="shopping">购物</option>
                          <option value="activities">活动</option>
                          <option value="other">其他</option>
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
                          <button className="px-2 py-1 text-sm border rounded" onClick={() => setEditId(null)}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          <div>¥{exp.amount.toLocaleString()} · {exp.category} · {exp.description}</div>
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
                            onClick={async () => { if (confirm('确认删除该开销？')) await removeExpense(exp.id); }}
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
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded">第{i + 1}天：¥{Number(v).toLocaleString()}</span>
                ))}
              </div>
            </div>
            {analysis.tips.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-900 mb-1">建议</div>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {analysis.tips.map((t, i) => (<li key={i}>{t}</li>))}
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
  if (!items || items.length === 0) {
    return (
      <div>
        <div className="font-medium text-gray-900 mb-2">{title}</div>
        <div className="text-gray-500">暂无推荐</div>
      </div>
    );
  }
  return (
    <div>
      <div className="font-medium text-gray-900 mb-2">{title}</div>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id || p.name + p.address} className="p-2 border rounded">
            <div className="text-gray-900">{p.name}</div>
            <div className="text-gray-600">{p.address}</div>
            {typeof p.distance === 'number' && (
              <div className="text-xs text-gray-500">距离：{Math.round(p.distance)} 米</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TravelDetail;

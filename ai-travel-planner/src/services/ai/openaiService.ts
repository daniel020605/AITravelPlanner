import { aiClient } from '../api/client';
import type { GenerateItineraryRequest, GenerateItineraryResponse } from '../../types';
import { env } from '../../utils/env';
import { useConfigStore } from '../../stores/configStore';

// 根据 aiClient 的 baseURL 智能拼接端点（避免 /v1 重复或缺失）
function buildEndpoint(path: string): string {
  try {
    const base = (aiClient as any)?.defaults?.baseURL || '';
    const hasV1 = /\/v1\/?$/.test(base);
    const p = path.replace(/^\/+/, ''); // 去掉前导斜杠
    if (p.startsWith('v1/')) {
      return hasV1 ? `/${p.replace(/^v1\//, '')}` : `/${p}`;
    }
    return hasV1 ? `/${p}` : `/v1/${p}`;
  } catch {
    return `/v1/${path.replace(/^\/+/, '')}`;
  }
}

 // 连接测试结果类型
export type ConnectionTestResult = { ok: boolean; message: string; models?: string[] };

export const openaiService = {
  // 生成旅行行程
  async generateItinerary(request: GenerateItineraryRequest): Promise<GenerateItineraryResponse> {
    const cfg = useConfigStore.getState().config || {};
    const hasKey = !!(cfg.openai_api_key || env.openaiApiKey);
    if (!hasKey) {
      // 返回模拟数据，当没有配置API Key时
      return {
        itinerary: [
          {
            id: '1',
            day: 1,
            time: '09:00',
            title: '抵达目的地',
            description: `欢迎来到${request.destination}！建议先前往酒店办理入住，然后开始您的旅程。`,
            location: {
              name: `${request.destination}国际机场`,
              address: `${request.destination}`,
              latitude: 39.9042,
              longitude: 116.4074
            },
            category: 'transportation',
            estimated_cost: 100
          },
          {
            id: '2',
            day: 1,
            time: '14:00',
            title: '城市观光',
            description: `探索${request.destination}的著名景点，感受当地文化。`,
            location: {
              name: `${request.destination}市中心`,
              address: `${request.destination}市中心区域`,
              latitude: 39.9042,
              longitude: 116.4074
            },
            category: 'attraction',
            estimated_cost: 200
          },
          {
            id: '3',
            day: 1,
            time: '18:00',
            title: '品尝当地美食',
            description: `体验${request.destination}的地道美食，满足您的味蕾。`,
            location: {
              name: '特色餐厅',
              address: `${request.destination}美食街`,
              latitude: 39.9042,
              longitude: 116.4074
            },
            category: 'restaurant',
            estimated_cost: 150
          }
        ],
        estimated_total_cost: request.budget,
        recommendations: [
          '建议提前预订景点门票',
          '尝试当地特色小吃',
          '注意当地天气变化',
          '随身携带防晒用品'
        ]
      };
    }

    try {
      const prompt = `请为以下旅行需求生成详细的行程安排：

目的地：${request.destination}
天数：${request.days}天
预算：¥${request.budget}
人数：${request.travelers}人
偏好：${request.preferences.join('、')}
开始日期：${request.start_date}
备注：${(request.remarks || '无').slice(0, 300)}

请严格按照以下 JSON 模板输出，必须是单个有效 JSON 对象，不要任何多余文字或注释（所有键使用双引号，禁止尾随逗号）：
{
  "itinerary": [
    {
      "id": "字符串，唯一，例如 \\"day1-0900\\"",
      "day": 1,
      "time": "HH:MM",
      "title": "简短标题",
      "description": "简要描述（不超过60字）",
      "location": {
        "name": "地点名称",
        "address": "地点地址",
        "latitude": 0,
        "longitude": 0
      },
      "category": "transportation|accommodation|attraction|restaurant|activity|other",
      "estimated_cost": 0
    }
  ],
  "estimated_total_cost": 0,
  "recommendations": ["建议1","建议2","建议3"]
}
生成规则：
- 每天不超过3个行程项；字段内容尽量精简；
- itinerary 中的 time 使用 24 小时制 \\"HH:MM\\";
- 所有数字字段必须是数字类型；
- 仅输出上述 JSON 对象，不能包含任何解释性文本。`;

      const response = await aiClient.request({
        method: 'POST',
        url: buildEndpoint('/chat/completions'),
        headers: { 'Content-Type': 'application/json' },
        data: {
          model: ((useConfigStore.getState().config?.openai_model || '').trim()) || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的旅行规划师，擅长根据用户需求制定个性化的旅行行程。请用中文回复，并以JSON格式提供结构化的行程安排。严格要求：仅输出一个有效 JSON 对象，不要任何额外解释或文本；每天不超过3个行程项；字段内容尽量精简以避免过长输出。请充分考虑用户的备注信息以提升个性化程度。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
        }
      });

      const aiResponse = response.data.choices[0].message.content as string;

      // 尝试解析AI返回的JSON
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch {
        // 二次尝试：提取最大花括号包裹的 JSON 片段再解析，仍失败则抛错
        const start = aiResponse.indexOf('{');
        const end = aiResponse.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const maybeJson = aiResponse.slice(start, end + 1);
          try {
            parsedResponse = JSON.parse(maybeJson);
          } catch {
            throw new Error('AI返回格式无效，可能因输出被截断或包含多余文本；请减少天数/偏好或选择更简洁的模型后重试');
          }
        } else {
          throw new Error('AI返回格式无效，未找到有效的JSON对象；请调整参数或模型后重试');
        }
      }

      // 规范化解析结果，填补缺省字段并纠正类型
      const rawList = Array.isArray(parsedResponse.itinerary) ? parsedResponse.itinerary : [];
      const itinerary = rawList.map((raw: any, idx: number) => {
        const loc = raw?.location || {};
        const id = String(raw?.id ?? `item-${idx + 1}`);
        const day = Number(raw?.day ?? 1) || 1;
        const time = String(raw?.time ?? '09:00');
        const title = String(raw?.title ?? '行程项');
        const description = String(raw?.description ?? '');
        const category = String(raw?.category ?? 'other');
        const estimated_cost = Number(raw?.estimated_cost ?? 0) || 0;
        const location = {
          name: String(loc?.name ?? ''),
          address: String(loc?.address ?? ''),
          latitude: Number(loc?.latitude ?? 0) || 0,
          longitude: Number(loc?.longitude ?? 0) || 0
        };
        return { id, day, time, title, description, location, category, estimated_cost };
      });

      const recommendations = Array.isArray(parsedResponse.recommendations)
        ? parsedResponse.recommendations.map((s: any) => String(s)).filter((s: string) => s.trim().length > 0)
        : [];

      const estimated_total_cost = Number(parsedResponse.estimated_total_cost ?? request.budget) || request.budget;

      return { itinerary, estimated_total_cost, recommendations };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('生成行程失败，可能因输出被截断或模型/配额限制。请减少天数/偏好、选择更简洁的模型，或调整 Base URL/API Key 后重试');
    }
  },

  // 获取旅行建议
  async getTravelRecommendations(destination: string, preferences: string[]): Promise<string[]> {
    const cfg = useConfigStore.getState().config || {};
    const hasKey = !!(cfg.openai_api_key || env.openaiApiKey);
    if (!hasKey) {
      return [
        '建议提前了解当地文化习俗',
        '准备合适的服装和用品',
        '尝试当地特色美食',
        '注意安全和健康防护'
      ];
    }

    try {
      const response = await aiClient.request({
        method: 'POST',
        url: buildEndpoint('/chat/completions'),
        headers: { 'Content-Type': 'application/json' },
        data: {
          model: ((useConfigStore.getState().config?.openai_model || '').trim()) || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的旅行顾问，请根据目的地和偏好提供实用的旅行建议。'
            },
            {
              role: 'user',
              content: `请为去${destination}旅行的人提供5个实用的建议，他们的偏好是：${preferences.join('、')}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        }
      });

      const aiResponse = response.data.choices[0].message.content as string;

      // 解析建议列表
      const suggestions = aiResponse
        .split('\n')
        .filter((line: string) => line.trim() && !/^\d+\./.test(line))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((line: string) => line.length > 0);

      return suggestions.length > 0 ? suggestions : ['请根据当地情况做好旅行准备'];
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      throw new Error('获取建议失败，请检查模型/参数或稍后重试');
    }
  },

  // 预算分析
  async analyzeBudget(input: {
    destination: string;
    days: number;
    budget: number;
    travelers: number;
    preferences: string[];
    start_date?: string;
  }): Promise<{
    breakdown: {
      transportation: number;
      accommodation: number;
      dining: number;
      attractions: number;
      activities: number;
      shopping: number;
      other: number;
    };
    daily_budget: number[];
    tips: string[];
  }> {
    const cfg = useConfigStore.getState().config || {};
    const hasKey = !!(cfg.openai_api_key || env.openaiApiKey);
    if (!hasKey) {
      // 无 Key 时直接提示使用者配置，保持一致的“失败即抛错”策略
      throw new Error('未配置 API Key，无法进行预算分析');
    }

    const prompt = `请根据以下旅行信息给出预算分析，严格输出单个 JSON：
目的地：${input.destination}
天数：${input.days}天
总预算：¥${input.budget}
人数：${input.travelers}人
偏好：${input.preferences.join('、')}

必须输出以下严格 JSON（仅一个对象、双引号、无尾逗号、所有数值为数字）：
{
  "breakdown": {
    "transportation": 0,
    "accommodation": 0,
    "dining": 0,
    "attractions": 0,
    "activities": 0,
    "shopping": 0,
    "other": 0
  },
  "daily_budget": [0],
  "tips": ["不超过5条简短建议"]
}
规则要求：
- breakdown 各项为对总预算的合理分配（单位为金额，数值相加不必完全等于总预算，可接近）。
- daily_budget 长度必须等于 ${input.days}，元素为每天建议花费金额（数字）。
- tips 最多 5 条，中文简短句子，不要解释性长文。`;

    try {
      const resp = await aiClient.request({
        method: 'POST',
        url: buildEndpoint('/chat/completions'),
        headers: { 'Content-Type': 'application/json' },
        data: {
          model: ((useConfigStore.getState().config?.openai_model || '').trim()) || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个理性的旅行预算分析师，只输出严格的 JSON，字段简洁，不要额外解释。'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        }
      });

      const text = String(resp?.data?.choices?.[0]?.message?.content || '');

      // 解析 JSON（先直接 parse，失败则提取最大花括号片段）
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const s = text.indexOf('{');
        const e = text.lastIndexOf('}');
        if (s !== -1 && e !== -1 && e > s) {
          parsed = JSON.parse(text.slice(s, e + 1));
        } else {
          throw new Error('AI返回格式无效（未找到合法JSON）');
        }
      }

      // 规范化
      const bd = parsed?.breakdown || {};
      const breakdown = {
        transportation: Number(bd?.transportation ?? 0) || 0,
        accommodation: Number(bd?.accommodation ?? 0) || 0,
        dining: Number(bd?.dining ?? 0) || 0,
        attractions: Number(bd?.attractions ?? 0) || 0,
        activities: Number(bd?.activities ?? 0) || 0,
        shopping: Number(bd?.shopping ?? 0) || 0,
        other: Number(bd?.other ?? 0) || 0
      };

      const days = Math.max(1, Number(input.days) || 1);
      const daily_raw = Array.isArray(parsed?.daily_budget) ? parsed.daily_budget : [];
      const daily_budget: number[] = Array.from({ length: days }, (_, i) => {
        const v = Number(daily_raw[i] ?? 0);
        return Number.isFinite(v) ? v : 0;
      });

      const tips = Array.isArray(parsed?.tips)
        ? parsed.tips.map((t: any) => String(t)).filter((s: string) => s.trim().length > 0).slice(0, 5)
        : [];

      return { breakdown, daily_budget, tips };
    } catch (err: any) {
      console.error('AI Budget Analysis Error:', err);
      throw new Error(err?.message || '预算分析失败，请稍后重试或调整参数/模型');
    }
  },

  // 基于行程抽取 POI 查询词（强约束结构化 JSON）
  async extractPoiQueriesStructured(input: {
    destination: string;
    itinerary: Array<{
      day: number;
      time?: string;
      title: string;
      description?: string;
      location?: { name?: string; address?: string; latitude?: number; longitude?: number };
      category?: string;
    }>;
  }): Promise<{ transport: string[]; hotels: string[]; restaurants: string[] }> {
    const cfg = useConfigStore.getState().config || {};
    const hasKey = !!(cfg.openai_api_key || env.openaiApiKey);
    if (!hasKey) {
      // 无 Key 时返回空，避免阻塞
      return { transport: [], hotels: [], restaurants: [] };
    }

    const system = '你是一个旅行助理。严格输出 JSON（json_object），不得包含任何解释。';
    const user = `根据目的地与行程，提取在地图搜索中使用的关键词，字段与要求：
- transport：到达/离开/市内换乘相关（如 机场至酒店 交通、地铁线路、机场快线、火车站、长途客运、出租车、公交换乘等）
- hotels：住宿相关（如 “${input.destination} 酒店”、“${input.destination} 市中心 酒店”、“{景点 附近 酒店/民宿}”）
- restaurants：餐饮相关（如 “${input.destination} 美食”、“{景点 附近 餐厅}”、“{菜系 特产}”）
严格返回：
{"transport":[],"hotels":[],"restaurants":[]}
每个数组不超过10项，元素为不超过8个汉字或词组。目的地：${input.destination}；行程：${JSON.stringify(input.itinerary).slice(0, 6000)}`;

    try {
      const resp = await aiClient.request({
        method: 'POST',
        url: buildEndpoint('/chat/completions'),
        headers: { 'Content-Type': 'application/json' },
        data: {
          model: ((useConfigStore.getState().config?.openai_model || '').trim()) || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          // 强制 JSON 输出（OpenAI 兼容，供应商不支持时会忽略）
          response_format: { type: 'json_object' },
          temperature: 0.2
        }
      });

      const text = String(resp?.data?.choices?.[0]?.message?.content || '{}');
      // 直接 JSON.parse，失败则尝试提取最大花括号
      let obj: any;
      try {
        obj = JSON.parse(text);
      } catch {
        const s = text.indexOf('{');
        const e = text.lastIndexOf('}');
        if (s !== -1 && e !== -1 && e > s) {
          obj = JSON.parse(text.slice(s, e + 1));
        } else {
          obj = {};
        }
      }

      const out = {
        transport: Array.isArray(obj.transport) ? obj.transport.map((x: any) => String(x)).slice(0, 10) : [],
        hotels: Array.isArray(obj.hotels) ? obj.hotels.map((x: any) => String(x)).slice(0, 10) : [],
        restaurants: Array.isArray(obj.restaurants) ? obj.restaurants.map((x: any) => String(x)).slice(0, 10) : []
      };
      return out;
    } catch (e) {
      console.error('extractPoiQueriesStructured error:', e);
      return { transport: [], hotels: [], restaurants: [] };
    }
  },

  // 解析语音识别文本为结构化表单字段
  async parseVoiceInput(text: string): Promise<{
    destination?: string;
    budget?: number;
    travelers?: number;
    preferences?: string[];
    start_date?: string;
    end_date?: string;
    remarks?: string;
  }> {
    const cfg = useConfigStore.getState().config || {};
    const hasKey = !!(cfg.openai_api_key || env.openaiApiKey);
    if (!hasKey) {
      // 无 Key 时提示调用方走本地规则回退
      throw new Error('NO_API_KEY');
    }

    const allowedPrefs = ['food','culture','nature','shopping','adventure','relaxation','photography','nightlife','anime','history'];
    const now = new Date();
    const currentLocal = now.toLocaleString('zh-CN', { hour12: false });
    const currentISODate = now.toISOString().slice(0, 10);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const system = '你是一个旅行需求抽取助手，从中文口语文本中稳健提取结构化字段。严格：仅输出 JSON（json_object），无任何解释或多余文本。遇到模糊表达需做合理推断与规范化。';
    const user = `当前本地时间：${currentLocal}（时区：${timeZone}，ISO日期：${currentISODate}）。请据此解析相对日期表达（如“下周五”“本月二十号”“五一假期”等）。\n请从下文口语文本中抽取以下字段，并统一规范：
- destination：目的地（字符串），例如 北京/东京/上海/成都；若出现“我想去/去某地”，提取该地名；若多个目的地，仅选择最主要的一个
- budget：预算（数字，人民币元），支持中文数量词与单位归一：如“一万/1万/约一万/一万块/预算一万”→10000；“两千/约两千”→2000；若为“预算不确定/随意”，则不填该键
- travelers：人数（数字），如“我们三个人/3人/一家四口”→3 或 4；若未提及则不填该键
- preferences：枚举 ${JSON.stringify(allowedPrefs)}，数组；从口语偏好关键词中映射（如 美食→food，博物馆/文化→culture 等），不在枚举内的忽略；不超过5项
- start_date：开始日期（YYYY-MM-DD），支持口语日期推断，如“下周五”“本月二十号”“五一假期”；若语境明确但无法确定具体日期则不填该键
- end_date：结束日期（YYYY-MM-DD）；若仅说“去三天”，可不填 end_date（由页面后续计算），或在 remarks 说明
- remarks：不超过80字的简短摘要，含未能结构化的关键信息（如“带孩子”“自由行”“低预算”）
输出要求：严格返回单个 JSON 对象（json_object），仅包含上述键。可省略无法确定的键。示例：
{"destination":"北京","budget":10000,"travelers":2,"preferences":["food","culture"],"start_date":"2025-06-10","end_date":"2025-06-13","remarks":"自由行，想拍照打卡"}
文本：${text}`;

    try {
      const resp = await aiClient.request({
        method: 'POST',
        url: buildEndpoint('/chat/completions'),
        headers: { 'Content-Type': 'application/json' },
        data: {
          model: ((useConfigStore.getState().config?.openai_model || '').trim()) || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        }
      });

      const textOut = String(resp?.data?.choices?.[0]?.message?.content || '{}');
      let obj: any;
      try {
        obj = JSON.parse(textOut);
      } catch {
        const s = textOut.indexOf('{');
        const e = textOut.lastIndexOf('}');
        if (s !== -1 && e !== -1 && e > s) {
          obj = JSON.parse(textOut.slice(s, e + 1));
        } else {
          obj = {};
        }
      }

      const out = {
        destination: obj.destination ? String(obj.destination).trim() : undefined,
        budget: Number(obj.budget),
        travelers: Number(obj.travelers),
        preferences: Array.isArray(obj.preferences) ? obj.preferences.map((x: any) => String(x)).filter((x: string) => allowedPrefs.includes(x)) : [],
        start_date: obj.start_date ? String(obj.start_date).slice(0, 10) : undefined,
        end_date: obj.end_date ? String(obj.end_date).slice(0, 10) : undefined,
        remarks: obj.remarks ? String(obj.remarks).slice(0, 80) : undefined,
      };

      // 清洗数字与空串
      if (!Number.isFinite(out.budget as number)) delete (out as any).budget;
      if (!Number.isFinite(out.travelers as number)) delete (out as any).travelers;
      if (!out.destination) delete (out as any).destination;
      if (!out.start_date) delete (out as any).start_date;
      if (!out.end_date) delete (out as any).end_date;
      if (!out.remarks) delete (out as any).remarks;

      return out;
    } catch (e) {
      // 将错误上抛，调用方执行回退
      throw e;
    }
  },

  // 测试 AI 服务连接（兼容不支持 GET /models 的提供方）
  async testConnection(): Promise<ConnectionTestResult> {
    const cfg = useConfigStore.getState().config || {};
    const key = (cfg.openai_api_key || env.openaiApiKey || '').trim();
    if (!key) {
      return { ok: false, message: '未配置 API Key' };
    }

    // 1) 首先尝试 GET /models（OpenAI 兼容端点）
    try {
      const resp = await aiClient.get(buildEndpoint('/models'));
      const list = Array.isArray(resp?.data?.data) ? resp.data.data : [];
      const models: string[] = list.map((m: any) => m.id).filter((id: any) => typeof id === 'string');
      const current = (useConfigStore.getState().config?.openai_model || '').trim();
      if (!current && models.length > 0) {
        useConfigStore.getState().updateConfig({ openai_model: models[0] });
      }
      const modelCount = models.length;
      return { ok: true, message: modelCount > 0 ? `连接成功，检测到 ${modelCount} 个模型` : '连接成功', models };
    } catch (e: any) {
      const text =
        e?.response?.data?.error?.message?.toString().toLowerCase?.() ||
        e?.message?.toString().toLowerCase?.() ||
        '';
      const status = e?.response?.status;

      // 2) 若不支持 GET /models（405/方法不支持/InvalidParameter 等），则改用最小化 POST 探活
      const methodNotSupported =
        status === 405 ||
        text.includes('not supported') ||
        text.includes('invalidparameter') ||
        text.includes('request method') ||
        text.includes('method');

      if (!methodNotSupported) {
        // 其他错误直接返回
        const msg =
          e?.response?.data?.error?.message ||
          e?.message ||
          '连接失败，请检查 Base URL 与 API Key';
        return { ok: false, message: msg };
      }

      try {
        // 选择模型：优先用户配置，否则尝试常见默认名
        const candidate =
          (useConfigStore.getState().config?.openai_model || '').trim() ||
          'gpt-3.5-turbo';

        // 最小化 chat 探活，消耗极低
        const resp = await aiClient.request({
          method: 'POST',
          url: buildEndpoint('/chat/completions'),
          headers: { 'Content-Type': 'application/json' },
          data: {
            model: candidate,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
            temperature: 0
          }
        });

        // 只要返回 200 即认为连通
        if (resp && resp.status >= 200 && resp.status < 300) {
          return { ok: true, message: `连接成功（通过 chat 探活）` };
        }
        return { ok: false, message: '连接失败（chat 探活未通过）' };
      } catch (ee: any) {
        const msg =
          ee?.response?.data?.error?.message ||
          ee?.message ||
          '连接失败（chat 探活错误），请检查 Base URL、API Key 与模型';
        return { ok: false, message: msg };
      }
    }
  }
};
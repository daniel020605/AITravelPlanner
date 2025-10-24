// 用户相关类型
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  created_at: string;
}

// 旅行计划类型
export interface TravelPlan {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  travelers: number;
  preferences: string[];
  itinerary: ItineraryItem[];
  expenses: Expense[];
  created_at: string;
  updated_at: string;
}

// 行程项目
export interface ItineraryItem {
  id: string;
  day: number;
  time: string;
  title: string;
  description: string;
  location: Location;
  category: 'transportation' | 'accommodation' | 'attraction' | 'restaurant' | 'activity';
  estimated_cost?: number;
}

// 地理位置信息
export interface Location {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// 费用记录
export interface Expense {
  id: string;
  travel_plan_id: string;
  category: 'transportation' | 'accommodation' | 'food' | 'attraction' | 'shopping' | 'other';
  amount: number;
  description: string;
  date: string;
  location?: Location;
}

// API配置
export interface APIConfig {
  openai_base_url?: string;
  openai_api_key?: string;
  openai_model?: string;
  xunfei_app_id?: string;
  xunfei_api_key?: string;
  xunfei_api_secret?: string;
  amap_key?: string;

  // 云端同步（Supabase）配置
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_role_key?: string;

  // 同步服务地址（后端直连 Postgres 的代理）
  sync_api_base?: string;

  // 同步服务 API Key（将随请求以 X-API-KEY 发送）
  sync_api_key?: string;
}

// 语音识别结果
export interface VoiceRecognitionResult {
  text: string;
  confidence: number;
  is_final: boolean;
}

// AI生成行程请求
export interface GenerateItineraryRequest {
  destination: string;
  days: number;
  budget: number;
  travelers: number;
  preferences: string[];
  start_date: string;
  // 备注（可选，用于提升模型理解，不持久化）
  remarks?: string;
}

// AI生成行程响应
export interface GenerateItineraryResponse {
  itinerary: ItineraryItem[];
  estimated_total_cost: number;
  recommendations: string[];
}

// 预算分析结果
export interface BudgetAnalysisResult {
  breakdown: {
    transportation: number;
    accommodation: number;
    dining: number;
    attractions: number;
    activities: number;
    shopping: number;
    other: number;
  };
  daily_budget: number[]; // 长度等于天数
  tips: string[];         // 不超过5条
}

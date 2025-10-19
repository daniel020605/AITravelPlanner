import { openaiService } from '../ai/openaiService';

export interface PoiQueries {
  transport: string[];
  hotels: string[];
  restaurants: string[];
}

export interface ExtractPoiInput {
  destination: string;
  itinerary: Array<{
    day: number;
    time?: string;
    title: string;
    description?: string;
    location?: { name?: string; address?: string };
    category?: string;
  }>;
}

/**
 * 使用大模型从行程中抽取需要检索的查询词（强约束结构化），优先使用 openaiService.extractPoiQueriesStructured。
 */
export async function extractPoiQueries(input: ExtractPoiInput): Promise<PoiQueries> {
  try {
    const res = await openaiService.extractPoiQueriesStructured({
      destination: input.destination,
      itinerary: input.itinerary || []
    });
    return {
      transport: Array.isArray(res.transport) ? res.transport : [],
      hotels: Array.isArray(res.hotels) ? res.hotels : [],
      restaurants: Array.isArray(res.restaurants) ? res.restaurants : [],
    };
  } catch {
    return { transport: [], hotels: [], restaurants: [] };
  }
}
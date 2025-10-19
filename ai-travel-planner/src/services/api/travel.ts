import { apiClient } from './client';
import type { GenerateItineraryRequest, GenerateItineraryResponse } from '../../types';

export const travelService = {
  // 生成AI行程
  async generateItinerary(request: GenerateItineraryRequest): Promise<GenerateItineraryResponse> {
    return apiClient.post('/ai/generate-itinerary', request);
  },

  // 获取旅行建议
  async getTravelRecommendations(destination: string, preferences: string[]) {
    return apiClient.post('/ai/recommendations', {
      destination,
      preferences,
    });
  },

  // 获取目的地信息
  async getDestinationInfo(destination: string) {
    return apiClient.get(`/destinations/${encodeURIComponent(destination)}`);
  },

  // 天气查询
  async getWeather(destination: string, startDate: string, endDate: string) {
    return apiClient.get('/weather', {
      params: {
        destination,
        start_date: startDate,
        end_date: endDate,
      },
    });
  },
};
export interface AmapPlace {
  id: string;
  name: string;
  address: string;
  location?: string; // "lng,lat"
  distance?: number; // in meters
  type?: string;
  cityname?: string;
}

export interface AmapSearchParams {
  key: string;
  keywords: string;
  city?: string; // 城市名/编码，可选
  location?: string; // "lng,lat"，用于按距离排序
  sortrule?: 'distance' | 'weight';
  page?: number;
  offset?: number; // 每页数量，默认10，最大25
}

/**
 * 简单封装高德 WebService v5/place/text 文本搜索
 * 文档：https://lbs.amap.com/api/webservice/guide/api-advanced/search
 */
export async function amapSearchText(params: AmapSearchParams): Promise<AmapPlace[]> {
  const {
    key, keywords, city, location, sortrule = 'distance', page = 1, offset = 10,
  } = params;

  const url = new URL('https://restapi.amap.com/v5/place/text');
  url.searchParams.set('key', key);
  url.searchParams.set('keywords', keywords);
  if (city) url.searchParams.set('city', city);
  if (location) url.searchParams.set('location', location);
  if (sortrule) url.searchParams.set('sortrule', sortrule);
  url.searchParams.set('page', String(page));
  url.searchParams.set('offset', String(offset));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`AMap HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== '1') {
    throw new Error(`AMap error: ${data.info || 'unknown'}`);
  }
  const pois = data.pois || [];
  return pois.map((p: any) => ({
    id: p.id,
    name: p.name,
    address: p.address || p.adname || '',
    location: p.location,
    distance: p.distance ? Number(p.distance) : undefined,
    type: p.type,
    cityname: p.cityname,
  }));
}
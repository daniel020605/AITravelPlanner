import { useEffect, useRef, useState } from 'react';
import type { Location } from '../../types';

interface AMapProps {
  center?: Location;
  zoom?: number;
  markers?: Location[];
  onMarkerClick?: (location: Location) => void;
  height?: string;
  className?: string;
  apiKey?: string;
}

declare global {
  interface Window {
    AMap: {
      Map: new (element: HTMLElement | string, options: Record<string, unknown>) => {
        addControl: (control: unknown) => void;
        add: (marker: unknown) => void;
        setBounds: (bounds: unknown) => void;
        destroy: () => void;
        setFitView?: (overlays?: unknown[]) => void;
        setZoomAndCenter?: (zoom: number, center: [number, number]) => void;
        setCenter?: (center: [number, number]) => void;
        setZoom?: (zoom: number) => void;
        getZoom?: () => number;
      };
      Marker: new (options: Record<string, unknown>) => {
        on: (event: string, callback: () => void) => void;
      };
      Scale: new () => unknown;
      ToolBar: new (options: Record<string, unknown>) => unknown;
      Bounds?: new (southWest: [number, number], northEast: [number, number]) => unknown;
    };
    AMapUI?: Record<string, unknown>;
  }
}

const DEFAULT_CENTER: Location = {
  name: '北京',
  address: '北京市',
  latitude: 39.9042,
  longitude: 116.4074
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const AMap = ({
  center = DEFAULT_CENTER,
  zoom = 10,
  markers = [],
  onMarkerClick,
  height = '400px',
  className = '',
  apiKey,
}: AMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const message = event?.message || '';
      if (typeof message === 'string' && message.includes('Invalid Object: Pixel')) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        console.error('AMap Pixel error captured:', event.error || message);
        setError('地图坐标数据异常，已切换到默认视图');
        setIsLoaded(false);
      }
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  useEffect(() => {
    const loadAMap = () => {
      const amapKey = (apiKey || import.meta.env.VITE_AMAP_KEY || '').trim();

      if (window.AMap) {
        setIsLoaded(true);
        setError(null);
        return;
      }

      if (!amapKey) {
        setError('缺少高德地图API Key，请在设置中配置');
        setIsLoaded(false);
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>('script[data-amap-sdk="true"]');
      if (existing) {
        const existingKey = existing.getAttribute('data-amap-key') || '';
        if (existingKey === amapKey) {
          if (!window.AMap) {
            existing.addEventListener('load', () => {
              setIsLoaded(true);
              setError(null);
            }, { once: true });
            existing.addEventListener('error', () => {
              setError('加载高德地图失败');
              setIsLoaded(false);
            }, { once: true });
          } else {
            setIsLoaded(true);
            setError(null);
          }
          return;
        }
        existing.remove();
        try {
          delete (window as any).AMap;
        } catch {
          (window as any).AMap = undefined;
        }
      }

      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.Geolocation`;
      script.async = true;
      script.dataset.amapSdk = 'true';
      script.setAttribute('data-amap-key', amapKey);

      script.onload = () => {
        setIsLoaded(true);
        setError(null);
      };
      script.onerror = () => {
        setError('加载高德地图失败');
        setIsLoaded(false);
      };

      document.head.appendChild(script);
    };

    loadAMap();

    // 组件卸载时不再删除脚本，避免全局脚本缺失导致的异常
    return () => {
      setIsLoaded(false);
    };
  }, [apiKey]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.AMap) return;

    const safeLng = toFiniteNumber(center.longitude) ?? DEFAULT_CENTER.longitude;
    const safeLat = toFiniteNumber(center.latitude) ?? DEFAULT_CENTER.latitude;

    const validMarkers = (markers || [])
      .map((marker) => {
        const lng = toFiniteNumber(marker?.longitude);
        const lat = toFiniteNumber(marker?.latitude);
        if (lng === null || lat === null) return null;
        if (lng === 0 && lat === 0) return null;
        return { ...marker, longitude: lng, latitude: lat };
      })
      .filter(Boolean) as Location[];

    try {
      const map = new window.AMap.Map(mapRef.current, {
        zoom,
        center: [safeLng, safeLat],
        viewMode: '2D',
        pitch: 0,
      });

      map.addControl(new window.AMap.Scale());
      map.addControl(new window.AMap.ToolBar({ position: 'RB' }));

      const overlays: unknown[] = [];
      if (validMarkers.length > 0) {
        validMarkers.forEach((marker) => {
          const markerInstance = new window.AMap.Marker({
            position: [marker.longitude, marker.latitude],
            title: marker.name,
            animation: 'AMAP_ANIMATION_DROP',
          });

          markerInstance.on('click', () => onMarkerClick?.(marker));
          map.add(markerInstance);
          overlays.push(markerInstance);
        });
      }

      if (validMarkers.length > 1) {
        const lngs = validMarkers.map(marker => marker.longitude);
        const lats = validMarkers.map(marker => marker.latitude);
        const southWest: [number, number] = [Math.min(...lngs), Math.min(...lats)];
        const northEast: [number, number] = [Math.max(...lngs), Math.max(...lats)];
        const midPoint: [number, number] = [
          (southWest[0] + northEast[0]) / 2,
          (southWest[1] + northEast[1]) / 2,
        ];

        if (typeof map.setFitView === 'function') {
          map.setFitView(overlays);
        } else if (typeof window.AMap?.Bounds === 'function') {
          try {
            const bounds = new window.AMap.Bounds(southWest, northEast);
            map.setBounds(bounds);
          } catch (err) {
            console.warn('AMap Bounds fallback triggered:', err);
            map.setCenter?.(midPoint);
          }
        } else {
          map.setCenter?.(midPoint);
        }

        if (typeof map.setZoom === 'function') {
          const spanLng = Math.abs(northEast[0] - southWest[0]);
          const spanLat = Math.abs(northEast[1] - southWest[1]);
          const span = Math.max(spanLng, spanLat);
          const targetZoom = span > 20 ? 7 : span > 10 ? 8 : span > 5 ? 10 : span > 1 ? 11 : zoom;
          map.setZoom(targetZoom);
        } else if (typeof map.setZoomAndCenter === 'function') {
          map.setZoomAndCenter(zoom, midPoint);
        }
      } else if (validMarkers.length === 1) {
        const onlyMarker = validMarkers[0];
        map.setCenter?.([onlyMarker.longitude, onlyMarker.latitude]);
      }

      return () => {
        try {
          map.destroy();
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.error('Failed to initialize AMap:', err);
      setError('初始化地图失败');
    }
  }, [isLoaded, center, zoom, markers, onMarkerClick]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-1">请在设置中配置高德地图API Key 并刷新页面</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">加载地图中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default AMap;

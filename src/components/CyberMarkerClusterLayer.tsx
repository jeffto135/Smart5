import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

if (typeof window !== 'undefined') {
  (window as any).L = L;
}

export interface ClusterMarkerItem {
  id: string;
  lat: number;
  lng: number;
  icon: L.DivIcon;
  onClick?: () => void;
  region?: string;
}

interface CyberMarkerClusterLayerProps {
  items: ClusterMarkerItem[];
  mode: 'meter' | 'cctv' | 'parking';
  maxClusterRadius?: number;
}

export const CyberMarkerClusterLayer: React.FC<CyberMarkerClusterLayerProps> = ({
  items,
  mode,
  maxClusterRadius = 38 // 依據需求調低至 38 像素，杜絕跨越海域把港島與九龍強行合併在海中心
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // 自定義 MarkerCluster 科技感聚合泡泡圖標 (縮小時顯示數字泡泡如 [24]、[50+]，放大平滑展開)
    const createClusterIcon = (cluster: any) => {
      const count = cluster.getChildCount();
      const countStr = count > 999 ? '999+' : count;
      const isCctv = mode === 'cctv';
      const isParking = mode === 'parking';
      const borderCol = isCctv ? '#ef4444' : isParking ? '#007aff' : '#d4ff00';
      const glowCol = isCctv ? 'rgba(239, 68, 68, 0.45)' : isParking ? 'rgba(0, 122, 255, 0.45)' : 'rgba(212, 255, 0, 0.45)';
      const bgInner = isCctv ? 'rgba(239, 68, 68, 0.25)' : isParking ? 'rgba(0, 122, 255, 0.25)' : 'rgba(212, 255, 0, 0.2)';
      const textCol = isCctv ? '#ffffff' : isParking ? '#ffffff' : '#d4ff00';

      return L.divIcon({
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(10, 10, 10, 0.92);
            border: 2px solid ${borderCol};
            box-shadow: 0 0 16px ${glowCol};
            cursor: pointer;
            backdrop-filter: blur(4px);
          ">
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: ${bgInner};
              color: ${textCol};
              font-family: 'JetBrains Mono', monospace;
              font-weight: 800;
              font-size: 11px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${countStr}
            </div>
          </div>
        `,
        className: 'custom-cyber-cluster-icon',
        iconSize: L.point(38, 38, true),
        iconAnchor: [19, 19]
      });
    };

    const createGroup = () => {
      const markerClusterFn = (L as any).markerClusterGroup || (L as any).MarkerClusterGroup;
      const clusterOptions = {
        chunkedLoading: true,
        chunkInterval: 100,
        chunkDelay: 20,
        maxClusterRadius,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 16, // 放大至路段等級時完全展開各點位
        iconCreateFunction: createClusterIcon
      };

      if (typeof (L as any).markerClusterGroup === 'function') {
        return (L as any).markerClusterGroup(clusterOptions);
      } else if (typeof (L as any).MarkerClusterGroup === 'function') {
        return new (L as any).MarkerClusterGroup(clusterOptions);
      } else {
        return L.featureGroup();
      }
    };

    // 🌟 核心防護：將點位按維港地理分區 (港島岸 vs 九龍/新界岸) 分開聚合
    // 徹底杜絕跨越維多利亞港海峽將南北兩岸點位平均至海面中心的問題！
    const islandGroup = createGroup();
    const kowloonNtGroup = createGroup();

    items.forEach(item => {
      // 坐標防呆過濾
      let lat = item.lat;
      let lng = item.lng;
      if (lat > 100 && lng < 30) {
        const temp = lat;
        lat = lng;
        lng = temp;
      }

      const marker = L.marker([lat, lng], { icon: item.icon });
      if (item.onClick) {
        marker.on('click', item.onClick);
      }

      // 判斷是否為港島區 (緯度 <= 22.288 或 region 為港島)
      const isIsland = item.region === '港島' || lat < 22.288;
      if (isIsland) {
        islandGroup.addLayer(marker);
      } else {
        kowloonNtGroup.addLayer(marker);
      }
    });

    map.addLayer(islandGroup);
    map.addLayer(kowloonNtGroup);

    return () => {
      try {
        map.removeLayer(islandGroup);
        islandGroup.clearLayers();
      } catch (err) {
        // cleanup safety
      }
      try {
        map.removeLayer(kowloonNtGroup);
        kowloonNtGroup.clearLayers();
      } catch (err) {
        // cleanup safety
      }
    };
  }, [map, items, mode, maxClusterRadius]);

  return null;
};

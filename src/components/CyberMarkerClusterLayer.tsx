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
}

interface CyberMarkerClusterLayerProps {
  items: ClusterMarkerItem[];
  mode: 'meter' | 'cctv' | 'parking';
  maxClusterRadius?: number;
}

export const CyberMarkerClusterLayer: React.FC<CyberMarkerClusterLayerProps> = ({
  items,
  mode,
  maxClusterRadius = 45
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

    // 檢查 leaflet.markercluster 是否已掛載至 L
    const markerClusterFn = (L as any).markerClusterGroup || (L as any).MarkerClusterGroup;
    let clusterGroup: any;

    if (typeof (L as any).markerClusterGroup === 'function') {
      clusterGroup = (L as any).markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 100,
        chunkDelay: 20,
        maxClusterRadius,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: createClusterIcon
      });
    } else if (typeof (L as any).MarkerClusterGroup === 'function') {
      clusterGroup = new (L as any).MarkerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 100,
        chunkDelay: 20,
        maxClusterRadius,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: createClusterIcon
      });
    } else {
      clusterGroup = L.featureGroup();
    }

    // 批次加入點位
    items.forEach(item => {
      const marker = L.marker([item.lat, item.lng], { icon: item.icon });
      if (item.onClick) {
        marker.on('click', item.onClick);
      }
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      try {
        map.removeLayer(clusterGroup);
        clusterGroup.clearLayers();
      } catch (err) {
        // cleanup safety
      }
    };
  }, [map, items, mode, maxClusterRadius]);

  return null;
};

import rawCameras from '../data/cctvCameras.json';

export interface TrafficCamera {
  key: string;
  region: string;
  district: string;
  description: string;
  lat: number;
  lng: number;
  url: string;
}

// 運輸署全港全量交通快拍監控鏡頭 (包含港島、九龍、新界全部 1,000+ 處點位)
export const ALL_CCTV_CAMERAS: TrafficCamera[] = rawCameras as TrafficCamera[];

/**
 * 取得全港交通快拍 CCTV 資料
 * 支援直接讀取香港資料一線通開放數據或本地完整索引
 */
export async function fetchAllTrafficCameras(): Promise<TrafficCamera[]> {
  try {
    const res = await fetch('https://resource.data.one.gov.hk/td/traffic-cctv/cctv-list.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          key: item.key || item.cameraId || item.id,
          region: item.region || '全港',
          district: item.district || '',
          description: item.description || item.location || '交通快拍鏡頭',
          lat: Number(item.lat || item.latitude),
          lng: Number(item.lng || item.longitude),
          url: item.url || `https://tdcctv.data.one.gov.hk/${item.key || item.id}.JPG`
        }));
      }
    }
  } catch (err) {
    // 網路若跨域或伺服器維護，使用本地全量 1,000+ 監控鏡頭索引
  }

  return ALL_CCTV_CAMERAS;
}

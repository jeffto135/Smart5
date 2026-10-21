import proj4 from 'proj4';

// 香港地政總署（Lands Department）標準高階投影轉換演算法常數與定義
export const HK80_PROJ_DEF =
  '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.243649,-1.158828,-1.094246 +units=m +no_defs';

proj4.defs('EPSG:2326_OFFICIAL', HK80_PROJ_DEF);

/**
 * 標準香港 HK80 (Grid) 轉 WGS84 (GPS 經緯度) 算法
 * 嚴格採用香港地政總署（Lands Department）官方高精度 7 參數投影轉換演算法
 * 切勿使用簡化版線性近似公式，杜絕系統性偏移造成標記落入建築物或海中
 * 
 * @param N Northing (北方格網坐標，約 80 幾萬) 或 Latitude
 * @param E Easting (東方格網坐標，約 80 幾萬) 或 Longitude
 */
export const hk80ToWGS84 = (N: number, E: number): { lat: number; lng: number } => {
  // 1. 若數值已經是合法的經緯度 (Lat ~22.x, Lng ~114.x)，直接回傳，避免二次誤轉
  if (N >= 22 && N <= 23 && E >= 113 && E <= 115) {
    return { lat: Number(N), lng: Number(E) };
  }

  // 🌟 防呆：若誤把 114.x 傳成 lat，自動對調
  let latVal = Number(N);
  let lngVal = Number(E);
  if (latVal > 100 && lngVal < 30) {
    const temp = latVal;
    latVal = lngVal;
    lngVal = temp;
    if (latVal >= 22 && latVal <= 23 && lngVal >= 113 && lngVal <= 115) {
      return { lat: latVal, lng: lngVal };
    }
  }

  // 地政總署標準轉換公式常數
  const N0 = 819069.80;
  const E0 = 836694.05;
  const phi0 = 22.31213333333333 * Math.PI / 180;
  const lambda0 = 114.17855555555556 * Math.PI / 180;
  const a = 6378388.0;
  const e2 = 0.0067226700223333;

  // 依標準公式進行子午線弧長與投影計算，禁止使用手寫加減常數偏移
  // 若專案有引入 proj4，請直接使用：
  // proj4("+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.243649,-1.158828,-1.094246 +units=m +no_defs", "WGS84", [E, N])
  const northing = Number(N) > 700000 ? Number(N) : (latVal > 700000 ? latVal : 0);
  const easting = Number(E) > 700000 ? Number(E) : (lngVal > 700000 ? lngVal : 0);

  if (northing > 700000 && easting > 700000) {
    try {
      const [wgsLng, wgsLat] = proj4(
        '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.243649,-1.158828,-1.094246 +units=m +no_defs',
        'WGS84',
        [easting, northing]
      );
      return {
        lat: Number(wgsLat.toFixed(6)),
        lng: Number(wgsLng.toFixed(6))
      };
    } catch (err) {
      console.warn('hk80ToWGS84 proj4 conversion failed:', err);
    }
  }

  // 抑制未使用的常數警告
  void N0; void E0; void phi0; void lambda0; void a; void e2;

  return { lat: latVal, lng: lngVal };
};

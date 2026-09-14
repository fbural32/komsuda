// Harita: Esri raster tile servisi. Anahtar gerektirmiyor.
// Vektör tile yerine düz resim indirildiği için çok daha güvenilir çalışıyor.

const ESRI = {
  sokak: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  topo:  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  uydu:  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  gri:   'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
};

// Değiştirmek istersen tek satır: ESRI.topo, ESRI.uydu, ESRI.gri
const SECILEN = ESRI.sokak;

// MapLibre stili — uzaktan indirilmiyor, doğrudan burada tanımlı.
// Böylece stil dosyasının inememesi diye bir sorun kalmıyor.
export const HARITA_STILI = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: [SECILEN],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Esri, HERE, Garmin, OpenStreetMap katkıda bulunanları',
    },
  },
  layers: [
    {
      id: 'arkaplan',
      type: 'background',
      paint: { 'background-color': '#EDEDE6' },
    },
    {
      id: 'esri-katman',
      type: 'raster',
      source: 'esri',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export const RADIUS_ESYA = 10000;
export const RADIUS_HIZMET = 25000;
export const RADIUS_M = RADIUS_ESYA;

// 11.5 ≈ 10 km dairesi ekrana sığar.
export const VARSAYILAN_ZOOM = 11.5;

// Yarıçap dairesini GeoJSON poligonu olarak üretir.
export function daireGeoJSON(lat, lng, metre, kenar = 64) {
  const koordinatlar = [];
  const dLat = metre / 111320;
  const dLng = metre / (111320 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= kenar; i++) {
    const aci = (i / kenar) * 2 * Math.PI;
    koordinatlar.push([lng + dLng * Math.cos(aci), lat + dLat * Math.sin(aci)]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [koordinatlar] },
    properties: {},
  };
}

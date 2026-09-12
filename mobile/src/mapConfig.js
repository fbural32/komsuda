// Harita stili — anahtar gerektirmeyen ücretsiz sağlayıcılar.
// Biri sorun çıkarırsa STYLE_URL'i değiştirmek yeterli, başka kod değişmez.

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

// Yedek seçenekler (hiçbiri kayıt veya anahtar istemiyor):
// OpenFreeMap liberty  → https://tiles.openfreemap.org/styles/liberty
// Versatiles colorful  → https://tiles.versatiles.org/assets/styles/colorful.json
// Carto voyager        → https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json

export const RADIUS_ESYA = 3000;
export const RADIUS_HIZMET = 10000;
export const RADIUS_M = RADIUS_ESYA;
export const VARSAYILAN_ZOOM = 11.5;

// Yarıçap dairesini GeoJSON poligonu olarak üretir.
// MapLibre'de hazır "circle by meters" yok, elle çizmek gerekiyor.
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

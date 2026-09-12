import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { api } from '../api';
import {
  STYLE_URL, RADIUS_ESYA, RADIUS_HIZMET, VARSAYILAN_ZOOM, daireGeoJSON,
} from '../mapConfig';
import { colors, type, radius, space } from '../theme';

// OpenFreeMap anahtar istemiyor, token null geçilir
MapLibreGL.setAccessToken(null);

const PRICE_STEPS = [
  { label: 'Hepsi', min: 50, max: 2000 },
  { label: '50–200₺', min: 50, max: 200 },
  { label: '200–500₺', min: 200, max: 500 },
  { label: '500₺+', min: 500, max: 2000 },
];

export default function MapScreen({ navigation }) {
  const [coords, setCoords] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('map');
  const [price, setPrice] = useState(PRICE_STEPS[0]);

  const load = useCallback(async (c = coords, p = price) => {
    if (!c) return;
    try {
      const data = await api.nearby({
        lat: c.latitude, lng: c.longitude, min: p.min, max: p.max,
      });
      setRequests(data);
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setLoading(false);
    }
  }, [coords, price]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Konum izni gerekli',
          'Yakınındaki istekleri gösterebilmek için konum iznine ihtiyacımız var.'
        );
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(c);
      load(c, price);
    })();
  }, []);

  const pickPrice = (p) => { setPrice(p); setLoading(true); load(coords, p); };

  if (loading && !requests.length) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.toggle}>
        {['map', 'list'].map((v) => (
          <TouchableOpacity
            key={v}
            style={[s.toggleBtn, view === v && s.toggleActive]}
            onPress={() => setView(v)}
          >
            <Text style={[s.toggleText, view === v && s.toggleTextActive]}>
              {v === 'map' ? 'Harita' : 'Liste'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.filters}>
        {PRICE_STEPS.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={[s.chip, price.label === p.label && s.chipActive]}
            onPress={() => pickPrice(p)}
          >
            <Text style={[s.chipText, price.label === p.label && s.chipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'map' && coords ? (
        <MapLibreGL.MapView
          style={s.map}
          styleURL={STYLE_URL}
          logoEnabled={false}
          attributionPosition={{ bottom: 8, right: 8 }}
        >
          <MapLibreGL.Camera
            defaultSettings={{
              centerCoordinate: [coords.longitude, coords.latitude],
              zoomLevel: VARSAYILAN_ZOOM,
            }}
          />

          <MapLibreGL.ShapeSource
            id="yaricap-hizmet"
            shape={daireGeoJSON(coords.latitude, coords.longitude, RADIUS_HIZMET)}
          >
            <MapLibreGL.LineLayer
              id="yaricap-hizmet-cizgi"
              style={{
                lineColor: colors.primary,
                lineWidth: 1,
                lineOpacity: 0.3,
                lineDasharray: [3, 3],
              }}
            />
          </MapLibreGL.ShapeSource>

          <MapLibreGL.ShapeSource
            id="yaricap-esya"
            shape={daireGeoJSON(coords.latitude, coords.longitude, RADIUS_ESYA)}
          >
            <MapLibreGL.FillLayer
              id="yaricap-esya-dolgu"
              style={{ fillColor: colors.primary, fillOpacity: 0.07 }}
            />
            <MapLibreGL.LineLayer
              id="yaricap-esya-cizgi"
              style={{ lineColor: colors.primary, lineWidth: 1, lineOpacity: 0.5 }}
            />
          </MapLibreGL.ShapeSource>

          <MapLibreGL.UserLocation visible renderMode="normal" />

          {requests.map((r) => (
            <MapLibreGL.PointAnnotation
              key={r.id}
              id={r.id}
              coordinate={[Number(r.lng), Number(r.lat)]}
              onSelected={() => navigation.navigate('RequestDetail', { request: r })}
            >
              <View style={s.pinWrap}>
                <View style={[s.pin, r.is_urgent && s.pinUrgent]}>
                  <Text style={[s.pinText, r.is_urgent && s.pinTextUrgent]}>
                    {r.price}₺
                  </Text>
                </View>
                <View style={[s.pinTail, r.is_urgent && s.pinTailUrgent]} />
              </View>
            </MapLibreGL.PointAnnotation>
          ))}
        </MapLibreGL.MapView>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: space.lg }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => load()} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={type.h2}>Yakınında açık istek yok</Text>
              <Text style={[type.small, { marginTop: 6, textAlign: 'center' }]}>
                Kendi isteğini oluşturarak başlayabilirsin.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('RequestDetail', { request: item })}
            >
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.cardTitle}>{item.category}</Text>
                  {item.is_urgent && (
                    <View style={s.urgentTag}>
                      <Text style={s.urgentTagText}>Hızlı getir</Text>
                    </View>
                  )}
                </View>
                <Text style={type.small}>
                  {item.distance_m} m · {item.display_name}
                  {item.rating_count > 0
                    ? ` · ${Number(item.rating_avg).toFixed(1)}★`
                    : ' · yeni üye'}
                </Text>
              </View>
              <Text style={s.price}>{item.price}₺{item.fiyat_tipi === 'saatlik' ? '/sa' : ''}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {view === 'map' && (
        <View style={s.yaricapNot}>
          <Text style={s.yaricapText}>Eşya 3 km · Hizmet 10 km</Text>
        </View>
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreateRequest', { coords })}
      >
        <Text style={s.fabText}>İstek oluştur</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },

  toggle: {
    flexDirection: 'row', margin: space.lg, marginBottom: space.sm,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { ...type.small, fontWeight: '500' },
  toggleTextActive: { color: colors.text },

  filters: { flexDirection: 'row', paddingHorizontal: space.lg, gap: 6, marginBottom: space.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...type.small },
  chipTextActive: { color: colors.primary, fontWeight: '500' },

  pinWrap: { alignItems: 'center' },
  pin: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  pinUrgent: { borderColor: colors.urgent, backgroundColor: colors.urgentSoft },
  pinText: { ...type.small, fontWeight: '700', color: colors.primary },
  pinTextUrgent: { color: colors.urgent },
  pinTail: {
    width: 2, height: 9, backgroundColor: colors.primary, marginTop: -1,
  },
  pinTailUrgent: { backgroundColor: colors.urgent },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: space.md, marginBottom: space.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardTitle: { ...type.body, fontWeight: '600' },
  urgentTag: {
    backgroundColor: colors.urgentSoft, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  urgentTagText: { ...type.tiny, color: colors.urgent, fontWeight: '600' },
  price: { ...type.h2, color: colors.primary },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: space.xl },

  yaricapNot: {
    position: 'absolute', bottom: 76, alignSelf: 'center',
    backgroundColor: colors.surface, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  yaricapText: { ...type.tiny, color: colors.textMuted },

  fab: {
    position: 'absolute', left: space.lg, right: space.lg, bottom: space.xl,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

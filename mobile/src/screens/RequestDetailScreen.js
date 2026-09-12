import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../api';
import { colors, type, radius, space } from '../theme';

export default function RequestDetailScreen({ route, navigation }) {
  const { request } = route.params;
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const respond = async () => {
    if (!confirmed) return setError('Ürünün elinde ve kullanılabilir olduğunu onayla.');
    setError('');
    setBusy(true);
    try {
      await api.respond(request.id);
      navigation.replace('MyOffer', { requestId: request.id });
    } catch (e) {
      if (e.status === 409 || e.status === 403) {
        Alert.alert('Teklif verilemedi', e.message, [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.card}>
        <Text style={s.category}>{request.category}</Text>
        <Text style={s.price}>{request.price}₺{request.fiyat_tipi === 'saatlik' ? '/saat' : ''}</Text>
        <Text style={s.offerCount}>
          {request.offer_count ?? 0} / 3 teklif verildi
        </Text>
        <Text style={type.small}>
          {request.distance_m} m uzaklıkta · {request.display_name}
          {request.rating_count > 0
            ? ` · ${Number(request.rating_avg).toFixed(1)}★ (${request.rating_count})`
            : ' · yeni üye'}
        </Text>
      </View>

      <TouchableOpacity style={s.check} onPress={() => { setConfirmed(!confirmed); setError(''); }}>
        <View style={[s.box, confirmed && s.boxOn]}>
          {confirmed && <Text style={s.tick}>✓</Text>}
        </View>
        <Text style={s.checkText}>
          Ürün elimde ve kullanılabilir durumda. Seçilirsem anlaşılan sürede teslim edeceğim.
        </Text>
      </TouchableOpacity>

      <Text style={s.note}>
        Bir isteğe en fazla 3 teklif verilebilir. İstek sahibi teklifler arasından
        birini seçer. Ödeme aranızda yapılır, uygulama aracı değildir.
      </Text>

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={respond} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Teklif ver</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: space.lg },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: space.lg,
  },
  category: { ...type.h2 },
  price: { fontSize: 32, fontWeight: '700', color: colors.primary, marginVertical: 6 },
  offerCount: { ...type.tiny, color: colors.urgent, fontWeight: '600', marginBottom: 4 },
  check: { flexDirection: 'row', gap: 10, marginTop: space.xl, alignItems: 'flex-start' },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkText: { ...type.small, flex: 1, lineHeight: 19 },
  note: { ...type.tiny, marginTop: space.lg, lineHeight: 17 },
  error: { color: colors.danger, ...type.small, marginTop: space.md },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: 'auto', marginBottom: space.lg,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../api';
import { colors, type, radius, space } from '../theme';

export default function MyOfferScreen({ route, navigation }) {
  const { requestId } = route.params;
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const poll = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.myOffer(requestId);
      setOffer(data);

      if (data.status === 'selected' && data.deal_id) {
        clearInterval(poll.current);
        navigation.replace('Deal', { dealId: data.deal_id });
        return;
      }
      if (data.status !== 'pending') clearInterval(poll.current);
    } catch (e) {
      setError(e.message);
      clearInterval(poll.current);
    }
  }, [requestId, navigation]);

  useEffect(() => {
    load();
    poll.current = setInterval(load, 4000);
    return () => clearInterval(poll.current);
  }, [load]);

  const withdraw = () => {
    Alert.alert('Teklifi geri çek', 'Bu isteğe verdiğin teklif kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Geri çek',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.withdrawOffer(requestId);
            navigation.replace('Map');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (!offer) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const rejected = offer.status === 'rejected';
  const gone = offer.request_status !== 'open' && offer.status === 'pending';

  return (
    <View style={s.root}>
      <View style={s.card}>
        <View style={[s.badge, (rejected || gone) && s.badgeOff]}>
          <Text style={[s.badgeText, (rejected || gone) && { color: colors.textMuted }]}>
            {rejected ? 'Başka teklif seçildi' : gone ? 'İstek kapandı' : 'Teklifin gönderildi'}
          </Text>
        </View>
        <Text style={s.category}>{offer.category}</Text>
        <Text style={s.price}>{offer.price}₺</Text>
      </View>

      <View style={s.info}>
        {rejected ? (
          <>
            <Text style={s.infoTitle}>Bu sefer olmadı</Text>
            <Text style={type.small}>
              İstek sahibi başka bir komşuyu seçti. Haritada başka istekler olabilir.
            </Text>
          </>
        ) : gone ? (
          <>
            <Text style={s.infoTitle}>İstek artık açık değil</Text>
            <Text style={type.small}>
              İstek sahibi isteği kaldırmış olabilir.
            </Text>
          </>
        ) : (
          <>
            <Text style={s.infoTitle}>Seçim bekleniyor</Text>
            <Text style={type.small}>
              Bu isteğe şu an {offer.offer_count} / {offer.max_offers} teklif var.
              İstek sahibi seni seçerse anlaşma ekranı otomatik açılacak.
              Fiyat ve süre orada konuşulur.
            </Text>
          </>
        )}
      </View>

      {!!error && <Text style={s.error}>{error}</Text>}

      <View style={{ flex: 1 }} />

      {rejected || gone ? (
        <TouchableOpacity style={s.primary} onPress={() => navigation.replace('Map')}>
          <Text style={s.primaryText}>Haritaya dön</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.textBtn} onPress={withdraw} disabled={busy}>
          <Text style={s.textBtnLabel}>Teklifi geri çek</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: space.lg, alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill,
    backgroundColor: colors.primarySoft, marginBottom: space.md,
  },
  badgeOff: { backgroundColor: colors.surfaceAlt },
  badgeText: { ...type.tiny, color: colors.primary, fontWeight: '600' },
  category: { ...type.h2 },
  price: { fontSize: 34, fontWeight: '700', color: colors.primary, marginVertical: 4 },

  info: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: space.md, marginTop: space.lg,
  },
  infoTitle: { ...type.body, fontWeight: '600', marginBottom: 4 },

  error: { color: colors.danger, ...type.small, marginTop: space.md, textAlign: 'center' },

  primary: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center', marginBottom: space.lg,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textBtn: { alignItems: 'center', paddingVertical: space.lg, marginBottom: space.sm },
  textBtnLabel: { ...type.body, color: colors.danger, fontWeight: '500' },
});

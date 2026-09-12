import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { api } from '../api';
import { colors, type, radius, space } from '../theme';

const NOTIFY_COOLDOWN_S = 15 * 60;

export default function MyRequestScreen({ route, navigation }) {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [cooldown, setCooldown] = useState(NOTIFY_COOLDOWN_S);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const poll = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.myRequest(requestId);
      setRequest(data);

      if (data.deal_id) {
        clearInterval(poll.current);
        navigation.replace('Deal', { dealId: data.deal_id });
        return;
      }
      if (data.status !== 'open') clearInterval(poll.current);

      const elapsed = (Date.now() - new Date(data.last_notified_at)) / 1000;
      setCooldown(Math.max(0, Math.ceil(NOTIFY_COOLDOWN_S - elapsed)));
    } catch (e) {
      setError(e.message);
    }
  }, [requestId, navigation]);

  useEffect(() => {
    load();
    poll.current = setInterval(load, 4000);
    return () => clearInterval(poll.current);
  }, [load]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]);

  const select = (offer) => {
    Alert.alert(
      `${offer.display_name} seçilsin mi?`,
      'Seçtiğin anda diğer teklifler kapanır ve sadece bu kişiyle anlaşma açılır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Seç',
          onPress: async () => {
            setBusy(true);
            try {
              const { deal_id } = await api.selectOffer(requestId, offer.id);
              clearInterval(poll.current);
              navigation.replace('Deal', { dealId: deal_id });
            } catch (e) {
              setError(e.message);
              load();
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const renotify = async () => {
    setError('');
    setBusy(true);
    try {
      await api.renotify(requestId);
      setCooldown(NOTIFY_COOLDOWN_S);
      Alert.alert('Gönderildi', 'Yakındaki komşulara tekrar bildirim gitti.');
    } catch (e) {
      setError(e.message);
      if (e.retry_in_seconds) setCooldown(e.retry_in_seconds);
    } finally {
      setBusy(false);
    }
  };

  const repost = async () => {
    setBusy(true);
    try {
      const fresh = await api.repost(requestId);
      navigation.replace('MyRequest', { requestId: fresh.id });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    Alert.alert('İsteği iptal et', 'Bu isteği kaldırmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.cancelRequest(requestId);
            navigation.replace('Map');
          } catch (e) {
            setError(e.message);
          }
        },
      },
    ]);
  };

  if (!request) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const mmss = `${String(Math.floor(cooldown / 60)).padStart(2, '0')}:${String(cooldown % 60).padStart(2, '0')}`;
  const closed = request.status !== 'open';
  const offers = request.offers || [];

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <View style={s.card}>
          <View style={s.pulse}>
            <Text style={s.pulseText}>{closed ? 'Kapandı' : 'Yayında'}</Text>
          </View>
          <Text style={s.category}>{request.category}</Text>
          <Text style={s.price}>{request.price}₺</Text>
          <Text style={type.small}>
            {closed
              ? 'Bu istek artık aktif değil.'
              : `${request.notified_count} komşuya bildirim gönderildi`}
          </Text>
        </View>

        {!closed && (
          <>
            <View style={s.rowBetween}>
              <Text style={s.sectionLabel}>Gelen teklifler</Text>
              <Text style={type.tiny}>
                {offers.length} / {request.max_offers}
              </Text>
            </View>

            {offers.length === 0 ? (
              <View style={s.info}>
                <Text style={s.infoTitle}>Henüz teklif yok</Text>
                <Text style={type.small}>
                  Komşular teklif verdikçe burada listelenecek. Aralarından
                  birini sen seçeceksin.
                </Text>
              </View>
            ) : (
              offers.map((o) => (
                <View key={o.id} style={s.offer}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {o.display_name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.offerName}>{o.display_name}</Text>
                    <Text style={type.tiny}>
                      {o.rating_count > 0
                        ? `${Number(o.rating_avg).toFixed(1)} ★ · ${o.rating_count} değerlendirme`
                        : 'Yeni üye'}
                      {o.deal_count > 0 ? ` · ${o.deal_count} işlem` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.selectBtn, busy && { opacity: 0.5 }]}
                    onPress={() => select(o)}
                    disabled={busy}
                  >
                    <Text style={s.selectText}>Seç</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <TouchableOpacity
              style={[s.outline, (cooldown > 0 || busy) && s.disabled]}
              onPress={renotify}
              disabled={cooldown > 0 || busy}
            >
              <Text style={s.outlineText}>
                {cooldown > 0 ? `Tekrar bildirim: ${mmss}` : 'Tekrar bildirim gönder'}
              </Text>
            </TouchableOpacity>
            <Text style={s.hint}>
              Aynı istek için 15 dakikada bir bildirim gönderilebilir.
            </Text>
          </>
        )}

        {closed && (
          <View style={s.info}>
            <Text style={s.infoTitle}>İstek kapandı</Text>
            <Text style={type.small}>
              Tekrar yayınlarsan yeni bir istek olarak açılır ve bildirim yeniden
              gider. Anlaşmadan vazgeçen kişi bu isteğe bir daha teklif veremez.
            </Text>
          </View>
        )}

        {!!error && <Text style={s.error}>{error}</Text>}
      </ScrollView>

      <View style={s.footer}>
        {closed ? (
          <>
            <TouchableOpacity
              style={[s.primary, busy && { opacity: 0.6 }]}
              onPress={repost}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" />
                    : <Text style={s.primaryText}>Tekrar yayınla</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.textBtn} onPress={() => navigation.replace('Map')}>
              <Text style={s.textBtnLabel}>Haritaya dön</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.textBtn} onPress={cancel}>
            <Text style={[s.textBtnLabel, { color: colors.danger }]}>
              İsteği iptal et
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: space.lg, alignItems: 'center',
  },
  pulse: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill,
    backgroundColor: colors.primarySoft, marginBottom: space.md,
  },
  pulseText: { ...type.tiny, color: colors.primary, fontWeight: '600' },
  category: { ...type.h2 },
  price: { fontSize: 34, fontWeight: '700', color: colors.primary, marginVertical: 4 },

  rowBetween: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: space.xl, marginBottom: space.sm,
  },
  sectionLabel: { ...type.small, fontWeight: '600', color: colors.text },

  offer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: space.md, marginBottom: space.sm,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  offerName: { ...type.body, fontWeight: '600' },
  selectBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  selectText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  info: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: space.md, marginTop: space.sm,
  },
  infoTitle: { ...type.body, fontWeight: '600', marginBottom: 4 },

  outline: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: space.lg,
    backgroundColor: colors.surface,
  },
  outlineText: { ...type.body, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  hint: { ...type.tiny, textAlign: 'center', marginTop: space.sm },

  error: { color: colors.danger, ...type.small, marginTop: space.md, textAlign: 'center' },

  footer: {
    padding: space.lg, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  primary: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textBtn: { alignItems: 'center', paddingVertical: space.md },
  textBtnLabel: { ...type.body, fontWeight: '500' },
});

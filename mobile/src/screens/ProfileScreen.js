import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { api, clearToken } from '../api';
import { colors, type, radius, space } from '../theme';

export default function ProfileScreen({ navigation }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.me().then(setMe).catch((e) => Alert.alert('Hata', e.message));
  }, []);

  if (!me) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  const initials = me.display_name
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const logout = async () => {
    await clearToken();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: space.lg }}>
      <View style={s.head}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        <Text style={s.name}>{me.display_name}</Text>
        <Text style={s.rating}>
          {me.rating_count > 0
            ? `${Number(me.rating_avg).toFixed(1)} ★ · ${me.rating_count} değerlendirme`
            : 'Henüz değerlendirme yok'}
        </Text>

        <View style={s.badges}>
          <Badge on={!!me.email_verified_at} text="Mail doğrulandı" />
          <Badge on={!!me.photo_verified_at} text="Fotoğraf doğrulandı" />
        </View>
      </View>

      {me.status === 'warned' && (
        <View style={s.warning}>
          <Text style={s.warningText}>
            Hesabın uyarı aldı. Düşük puan ve şikayetler devam ederse hesabın askıya alınır.
          </Text>
        </View>
      )}

      <View style={s.stats}>
        <Stat label="Tamamlanan" value={me.deal_count} />
        <Stat label="Puan" value={Number(me.rating_avg).toFixed(1)} />
        <Stat label="Değerlendirme" value={me.rating_count} />
      </View>

      {me.recent_ratings?.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Son yorumlar</Text>
          {me.recent_ratings.map((r, i) => (
            <View key={i} style={s.review}>
              <Text style={s.reviewStars}>{'★'.repeat(r.stars)}</Text>
              {!!r.comment && <Text style={type.small}>{r.comment}</Text>}
            </View>
          ))}
        </>
      )}

      <TouchableOpacity style={s.logout} onPress={logout}>
        <Text style={s.logoutText}>Çıkış yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const Badge = ({ on, text }) => (
  <View style={[s.badge, on ? s.badgeOn : s.badgeOff]}>
    <Text style={[s.badgeText, on && { color: colors.primary }]}>
      {on ? '✓ ' : '○ '}{text}
    </Text>
  </View>
);

const Stat = ({ label, value }) => (
  <View style={s.stat}>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={s.statValue}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { alignItems: 'center', paddingVertical: space.lg },
  avatar: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.md,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.primary },
  name: { ...type.h1 },
  rating: { ...type.small, marginTop: 4 },
  badges: { flexDirection: 'row', gap: 6, marginTop: space.md, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  badgeOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  badgeOff: { backgroundColor: colors.surface, borderColor: colors.border },
  badgeText: { ...type.tiny },

  warning: {
    backgroundColor: colors.warnSoft, borderRadius: radius.md,
    padding: space.md, marginBottom: space.lg,
  },
  warningText: { ...type.small, color: '#7A5A00', lineHeight: 19 },

  stats: { flexDirection: 'row', gap: 8, marginBottom: space.xl },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, alignItems: 'center' },
  statLabel: { ...type.tiny },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 },

  sectionLabel: { ...type.small, fontWeight: '600', marginBottom: space.sm },
  review: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: space.md, marginBottom: space.sm,
  },
  reviewStars: { color: '#E9A81C', marginBottom: 4 },

  logout: { alignItems: 'center', paddingVertical: space.xl },
  logoutText: { ...type.body, color: colors.danger },
});

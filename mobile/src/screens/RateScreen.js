import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { api } from '../api';
import { colors, type, radius, space } from '../theme';

const TAGS = ['Hızlıydı', 'Ürün doluydu', 'Kibar', 'Geç kaldı'];

export default function RateScreen({ route, navigation }) {
  const { dealId } = route.params;
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleTag = (t) =>
    setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);

  const submit = async () => {
    if (!stars) return setError('Önce bir yıldız puanı seç.');
    setError('');
    setBusy(true);
    try {
      await api.rate({ deal_id: dealId, stars, tags, comment: comment || null });
      navigation.popToTop();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <Text style={s.title}>İşlem tamamlandı</Text>
      <Text style={s.sub}>Karşı tarafla alışverişin nasıldı?</Text>

      <View style={s.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => { setStars(n); setError(''); }}>
            <Text style={[s.star, n <= stars && s.starOn]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.wrap}>
        {TAGS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.chip, tags.includes(t) && s.chipOn]}
            onPress={() => toggleTag(t)}
          >
            <Text style={[s.chipText, tags.includes(t) && s.chipTextOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={s.input}
        placeholder="Kısa yorum (opsiyonel)"
        placeholderTextColor={colors.textFaint}
        value={comment}
        onChangeText={setComment}
        maxLength={120}
        multiline
      />

      <Text style={s.note}>
        Puanın, karşı taraf da puan verene kadar gizli kalır.
      </Text>

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Puanı gönder</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.report}
        onPress={() => navigation.navigate('Report', { dealId })}
      >
        <Text style={s.reportText}>Kullanıcıyı şikayet et</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: space.xl },
  title: { ...type.h1, textAlign: 'center' },
  sub: { ...type.small, textAlign: 'center', marginTop: 6 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: space.xl },
  star: { fontSize: 40, color: colors.border },
  starOn: { color: '#E9A81C' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...type.small },
  chipTextOn: { color: colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: space.md, marginTop: space.lg,
    minHeight: 70, textAlignVertical: 'top', color: colors.text,
  },
  note: { ...type.tiny, textAlign: 'center', marginTop: space.md },
  error: { color: colors.danger, ...type.small, textAlign: 'center', marginTop: space.md },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: space.lg,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  report: { alignItems: 'center', paddingVertical: space.md },
  reportText: { ...type.small, color: colors.danger },
});

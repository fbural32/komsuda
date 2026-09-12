import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { api } from '../api';
import { colors, type, radius, space } from '../theme';

const REASONS = [
  { key: 'no_show', label: 'Gelmedi / teslim etmedi' },
  { key: 'wrong_item', label: 'Ürün anlaşıldığı gibi değildi' },
  { key: 'price_change', label: 'Fiyatı sonradan değiştirdi' },
  { key: 'banned_item', label: 'Yasaklı ürün (gıda, alkol, sigara, ilaç)' },
  { key: 'harassment', label: 'Rahatsız edici davranış' },
  { key: 'fake_profile', label: 'Sahte profil veya fotoğraf' },
  { key: 'other', label: 'Diğer' },
];

export default function ReportScreen({ route, navigation }) {
  const { dealId, reportedId } = route.params || {};
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) return setError('Bir sebep seç.');
    if (reason === 'other' && detail.trim().length < 10)
      return setError('Diğer seçeneği için kısa bir açıklama yaz.');

    setError('');
    setBusy(true);
    try {
      await api.report({
        deal_id: dealId,
        reported_id: reportedId,
        reason: detail.trim() ? `${reason}: ${detail.trim()}` : reason,
      });
      Alert.alert(
        'Şikayetin alındı',
        'İnceleyip gerekli işlemi yapacağız. Teşekkürler.',
        [{ text: 'Tamam', onPress: () => navigation.popToTop() }]
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: space.lg }}>
      <Text style={s.label}>Ne oldu?</Text>

      {REASONS.map((r) => (
        <TouchableOpacity
          key={r.key}
          style={[s.option, reason === r.key && s.optionOn]}
          onPress={() => { setReason(r.key); setError(''); }}
        >
          <View style={[s.radio, reason === r.key && s.radioOn]}>
            {reason === r.key && <View style={s.dot} />}
          </View>
          <Text style={[s.optionText, reason === r.key && { fontWeight: '600' }]}>
            {r.label}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={[s.label, { marginTop: space.lg }]}>
        Açıklama {reason === 'other' ? '(zorunlu)' : '(opsiyonel)'}
      </Text>
      <TextInput
        style={s.input}
        placeholder="Kısaca ne yaşandığını anlat"
        placeholderTextColor={colors.textFaint}
        value={detail}
        onChangeText={(t) => { setDetail(t); setError(''); }}
        maxLength={300}
        multiline
      />

      <Text style={s.note}>
        Şikayetler moderasyon ekibince incelenir. Asılsız şikayet göndermek
        kendi hesabının da uyarı almasına yol açabilir.
      </Text>

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Şikayeti gönder</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  label: { ...type.small, fontWeight: '600', marginBottom: space.sm, color: colors.text },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 13, paddingHorizontal: space.md, marginBottom: 6,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionText: { ...type.body, flex: 1 },

  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: space.md,
    minHeight: 90, textAlignVertical: 'top', color: colors.text,
  },
  note: { ...type.tiny, marginTop: space.md, lineHeight: 17 },
  error: { color: colors.danger, ...type.small, marginTop: space.md },

  btn: {
    backgroundColor: colors.danger, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: space.lg, marginBottom: 40,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

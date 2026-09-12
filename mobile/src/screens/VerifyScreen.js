import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../api';
import { colors, type, radius, space } from '../theme';

export default function VerifyScreen({ route, navigation }) {
  const { email } = route.params || {};
  const [busy, setBusy] = useState(false);
  const [bekle, setBekle] = useState(0);
  const [error, setError] = useState('');
  const poll = useRef(null);

  // Kullanıcı maildeki linke basınca burası otomatik ilerlesin
  useEffect(() => {
    poll.current = setInterval(async () => {
      try {
        const me = await api.me();
        if (me.email_verified_at) {
          clearInterval(poll.current);
          navigation.reset({ index: 0, routes: [{ name: 'Permissions' }] });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll.current);
  }, [navigation]);

  useEffect(() => {
    if (bekle <= 0) return;
    const t = setInterval(() => setBekle((b) => Math.max(0, b - 1)), 1000);
    return () => clearInterval(t);
  }, [bekle > 0]);

  const tekrarGonder = async () => {
    setError('');
    setBusy(true);
    try {
      await api.resendVerification();
      setBekle(120);
      Alert.alert('Gönderildi', 'Doğrulama maili tekrar gönderildi.');
    } catch (e) {
      setError(e.message);
      if (e.status === 429) setBekle(120);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.ikon}><Text style={s.ikonText}>✉</Text></View>

      <Text style={s.baslik}>E-postanı doğrula</Text>
      <Text style={s.metin}>
        {email ? `${email} adresine` : 'E-posta adresine'} bir doğrulama linki
        gönderdik. Linke bastığında bu ekran otomatik olarak devam edecek.
      </Text>

      <View style={s.kutu}>
        <Text style={type.small}>
          Mail gelmediyse spam veya "Öne çıkanlar" klasörüne bak. Link 24 saat
          geçerli.
        </Text>
      </View>

      {!!error && <Text style={s.hata}>{error}</Text>}

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[s.buton, (bekle > 0 || busy) && { opacity: 0.5 }]}
        onPress={tekrarGonder}
        disabled={bekle > 0 || busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : (
          <Text style={s.butonText}>
            {bekle > 0 ? `Tekrar gönder (${bekle} sn)` : 'Maili tekrar gönder'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.cikis}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
      >
        <Text style={s.cikisText}>Başka hesapla giriş yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: space.xl, paddingTop: 48 },
  ikon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginBottom: space.lg,
  },
  ikonText: { fontSize: 28, color: colors.primary },
  baslik: { ...type.h1, textAlign: 'center' },
  metin: {
    ...type.body, color: colors.textMuted, textAlign: 'center',
    marginTop: space.md, lineHeight: 22,
  },
  kutu: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: space.md, marginTop: space.xl,
  },
  hata: { color: colors.danger, ...type.small, marginTop: space.md, textAlign: 'center' },
  buton: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  butonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cikis: { alignItems: 'center', paddingVertical: space.lg },
  cikisText: { ...type.small, color: colors.textMuted },
});

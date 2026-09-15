import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { api, setToken } from '../api';
import { colors, type, radius, space } from '../theme';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [onay, setOnay] = useState({ sartlar: false, konum: false, yurtdisi: false, bildirim: false });

  const tikla = (k) => { setOnay({ ...onay, [k]: !onay[k] }); setError(''); };

  const sifremiUnuttum = async () => {
    if (!email.includes('@')) {
      setError('Önce e-posta adresini yaz, sonra bu bağlantıya bas.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api.sifremiUnuttum(email.trim());
      Alert.alert(
        'Bağlantı gönderildi',
        'Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Bağlantı 1 saat geçerli.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!email.includes('@')) return setError('Geçerli bir e-posta gir.');
    if (password.length < 8) return setError('Şifre en az 8 karakter olmalı.');
    if (mode === 'register') {
      if (name.trim().length < 2) return setError('Adını gir.');
      if (!onay.sartlar)
        return setError('Kullanım şartları ve gizlilik politikasını onaylaman gerekiyor.');
      if (!onay.konum)
        return setError('Konum izni olmadan uygulama çalışmaz.');
      if (!onay.yurtdisi)
        return setError('Yurt dışına aktarım onayı olmadan hesap açılamaz.');
    }

    setError('');
    setBusy(true);
    try {
      const res = mode === 'login'
        ? await api.login({ email, password })
        : await api.register({ email, password, display_name: name.trim() });
      await setToken(res.token);
      if (mode === 'register') {
        navigation.reset({ index: 0, routes: [{ name: 'Verify', params: { email } }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Permissions' }] });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <Text style={s.brand}>Komşuda</Text>
      <Text style={s.tagline}>İhtiyacın olan şey, sokağın öbür ucunda.</Text>

      {mode === 'register' && (
        <TextInput
          style={s.input} placeholder="Adın" placeholderTextColor={colors.textFaint}
          value={name} onChangeText={setName}
        />
      )}
      <TextInput
        style={s.input} placeholder="E-posta" placeholderTextColor={colors.textFaint}
        value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address"
      />
      <TextInput
        style={s.input} placeholder="Şifre" placeholderTextColor={colors.textFaint}
        value={password} onChangeText={setPassword} secureTextEntry
      />

      {mode === 'register' && (
        <View style={s.onaylar}>
          <Onay
            on={onay.sartlar}
            bas={() => tikla('sartlar')}
            metin="Kullanım Şartları ve Gizlilik Politikası'nı okudum, kabul ediyorum. 18 yaşından büyüğüm."
          />
          <Onay
            on={onay.konum}
            bas={() => tikla('konum')}
            metin="Konum verimin işlenmesine izin veriyorum. Haritada yaklaşık konumum görünür, kesin konumum yalnızca anlaştığım kişiyle paylaşılır."
          />
          <Onay
            on={onay.yurtdisi}
            bas={() => tikla('yurtdisi')}
            metin="Sunucu ve bildirim altyapısı yurt dışında olduğu için verilerimin yurt dışına aktarılmasına izin veriyorum."
          />
          <Onay
            on={onay.bildirim}
            bas={() => tikla('bildirim')}
            metin="Yakınımda yeni istek olduğunda bildirim almak istiyorum. (İsteğe bağlı)"
          />
        </View>
      )}

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</Text>}
      </TouchableOpacity>

      {mode === 'login' && (
        <TouchableOpacity onPress={sifremiUnuttum} disabled={busy}>
          <Text style={s.unuttum}>Şifremi unuttum</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
        <Text style={s.switch}>
          {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const Onay = ({ on, bas, metin }) => (
  <TouchableOpacity style={s.onaySatir} onPress={bas} activeOpacity={0.7}>
    <View style={[s.kutu, on && s.kutuOn]}>
      {on && <Text style={s.tik}>✓</Text>}
    </View>
    <Text style={s.onayMetin}>{metin}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: space.xl, justifyContent: 'center' },
  brand: { fontSize: 34, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  tagline: { ...type.small, textAlign: 'center', marginTop: 6, marginBottom: space.xl },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 13,
    marginBottom: space.sm, fontSize: 15, color: colors.text,
  },
  onaylar: { marginTop: space.lg, gap: space.md },
  onaySatir: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  kutu: {
    width: 21, height: 21, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  kutuOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tik: { color: '#fff', fontSize: 13, fontWeight: '700' },
  onayMetin: { ...type.tiny, flex: 1, lineHeight: 17 },

  error: { color: colors.danger, ...type.small, marginTop: space.sm },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: space.md,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  unuttum: {
    ...type.small, textAlign: 'center', marginTop: space.lg,
    color: colors.textMuted,
  },
  switch: { ...type.small, textAlign: 'center', marginTop: space.md, color: colors.primary },
});

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { arkaPlanKonumuBaslat } from '../location';
import { colors, type, radius, space } from '../theme';

// Sıralı izin akışı. Her adım bir öncekine bağlı.
const ADIMLAR = [
  {
    anahtar: 'sozlesme',
    baslik: 'Kullanım koşulları',
    metin:
      'Komşuda bir eşleştirme platformudur. Alışveriş ve hizmet, kullanıcılar arasında yapılır. Devam etmeden önce kullanım şartlarını ve KVKK aydınlatma metnini okuyup onaylaman gerekiyor.',
    buton: 'Okudum, kabul ediyorum',
  },
  {
    anahtar: 'konum',
    baslik: 'Konum izni',
    metin:
      'Yakınındaki istekleri haritada görebilmen için konumuna ihtiyacımız var. Haritada diğer kullanıcılara yaklaşık 200 metre kaydırılmış konumun gösterilir; kesin adresin yalnızca anlaştığın kişiyle paylaşılır.',
    buton: 'Konum iznini ver',
  },
  {
    anahtar: 'arkaplan',
    baslik: 'Arka planda konum',
    metin:
      'Uygulama kapalıyken de yakınındaki acil istekleri sana bildirebilmemiz için "Her zaman izin ver" seçeneğine ihtiyacımız var. Konumun 15 dakikada bir güncellenir, geçmişin kaydedilmez ve kimseyle paylaşılmaz.\n\nBu adımı atlarsan uygulama çalışır, sadece bildirimleri yalnızca uygulama açıkken alırsın.',
    buton: 'Her zaman izin ver',
    atlanabilir: true,
  },
  {
    anahtar: 'bildirim',
    baslik: 'Bildirimler',
    metin:
      'Yakınında yeni bir istek olduğunda ve teklifine cevap geldiğinde haber verelim. Aynı istek için 15 dakikada bir bildirim gönderilir, daha sık rahatsız edilmezsin.',
    buton: 'Bildirimlere izin ver',
    atlanabilir: true,
  },
];

export default function PermissionsScreen({ navigation }) {
  const [adim, setAdim] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState('');

  const mevcut = ADIMLAR[adim];

  const ilerle = async () => {
    setHata('');
    if (adim < ADIMLAR.length - 1) {
      setAdim(adim + 1);
      return;
    }
    await AsyncStorage.setItem('izinler_tamam', '1');
    navigation.reset({ index: 0, routes: [{ name: 'Map' }] });
  };

  const uygula = async () => {
    setBusy(true);
    setHata('');
    try {
      if (mevcut.anahtar === 'konum') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHata('Konum izni olmadan harita çalışmaz.');
          setBusy(false);
          return;
        }
      }

      if (mevcut.anahtar === 'arkaplan') {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status === 'granted') {
          await arkaPlanKonumuBaslat();
        } else {
          Alert.alert(
            'İzin verilmedi',
            'Ayarlardan "Her zaman izin ver" seçeneğini sonradan da açabilirsin.',
            [{ text: 'Tamam' }]
          );
        }
      }

      if (mevcut.anahtar === 'bildirim') {
        await Notifications.requestPermissionsAsync();
      }

      ilerle();
    } catch (e) {
      setHata(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.ilerlemeSatir}>
        {ADIMLAR.map((a, i) => (
          <View
            key={a.anahtar}
            style={[s.ilerleme, i <= adim && s.ilerlemeAktif]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.icerik}>
        <Text style={s.sayac}>
          Adım {adim + 1} / {ADIMLAR.length}
        </Text>
        <Text style={s.baslik}>{mevcut.baslik}</Text>
        <Text style={s.metin}>{mevcut.metin}</Text>

        {mevcut.anahtar === 'sozlesme' && (
          <View style={s.linkler}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://fbural32.github.io/komsuda/kullanim-sartlari.html')
              }
            >
              <Text style={s.link}>Kullanım Şartları</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://fbural32.github.io/komsuda/gizlilik.html')
              }
            >
              <Text style={s.link}>KVKK Aydınlatma Metni</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!hata && <Text style={s.hata}>{hata}</Text>}
      </ScrollView>

      <View style={s.alt}>
        <TouchableOpacity
          style={[s.buton, busy && { opacity: 0.6 }]}
          onPress={uygula}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.butonMetin}>{mevcut.buton}</Text>
          )}
        </TouchableOpacity>

        {mevcut.atlanabilir && (
          <TouchableOpacity style={s.atla} onPress={ilerle} disabled={busy}>
            <Text style={s.atlaMetin}>Şimdilik atla</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  ilerlemeSatir: {
    flexDirection: 'row', gap: 5, paddingHorizontal: space.xl,
    paddingTop: 52, marginBottom: space.xl,
  },
  ilerleme: {
    flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surfaceAlt,
  },
  ilerlemeAktif: { backgroundColor: colors.primary },

  icerik: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  sayac: { ...type.tiny, color: colors.primary, fontWeight: '700', marginBottom: 8 },
  baslik: { ...type.h1, marginBottom: space.md },
  metin: { ...type.body, color: colors.textMuted, lineHeight: 23 },

  linkler: { marginTop: space.xl, gap: space.sm },
  link: { ...type.body, color: colors.primary, fontWeight: '500' },

  hata: { color: colors.danger, ...type.small, marginTop: space.lg },

  alt: { padding: space.xl, paddingTop: space.md },
  buton: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  butonMetin: { color: '#fff', fontSize: 16, fontWeight: '600' },
  atla: { alignItems: 'center', paddingVertical: space.md },
  atlaMetin: { ...type.small, color: colors.textMuted },
});

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { api } from '../api';
import { gorselYukle } from '../upload';
import { colors, type, radius, space } from '../theme';


const GUN_ADLARI = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const AY_ADLARI = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

// Bugünden itibaren 14 gün
const gunler = Array.from({ length: 14 }, (_, i) => {
  const g = new Date();
  g.setDate(g.getDate() + i);
  const iso = g.toISOString().slice(0, 10);
  return {
    iso,
    gun: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : GUN_ADLARI[g.getDay()],
    etiket: `${g.getDate()} ${AY_ADLARI[g.getMonth()]}`,
  };
});

const SLOT_METIN = {
  sabah: '09:00 - 12:00',
  ogle: '12:00 - 15:00',
  ikindi: '15:00 - 18:00',
  aksam: '18:00 - 21:00',
};

function tarihMetni(iso) {
  if (!iso) return '';
  const g = new Date(iso);
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const fark = Math.round((g - bugun) / 86400000);
  const tarih = `${g.getDate()} ${AY_ADLARI[g.getMonth()]} ${GUN_ADLARI[g.getDay()]}`;
  if (fark === 0) return `Bugün · ${tarih}`;
  if (fark === 1) return `Yarın · ${tarih}`;
  return tarih;
}

const slotMetni = (s) => SLOT_METIN[s] || '';

export default function DealScreen({ route, navigation }) {
  const { dealId } = route.params;
  const [state, setState] = useState(null);
  const [replies, setReplies] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [error, setError] = useState('');
  const [slotlar, setSlotlar] = useState([]);
  const [fotoKaynak, setFotoKaynak] = useState(null);
  const [secilenGun, setSecilenGun] = useState(null);
  const [secilenSlot, setSecilenSlot] = useState(null);
  const poll = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.deal(dealId);
      setState(data);
    } catch (e) {
      setError(e.message);
    }
  }, [dealId]);

  useEffect(() => {
    load();
    api.replies(dealId).then(setReplies).catch(() => {});
    api.slots(dealId).then(setSlotlar).catch(() => {});
    poll.current = setInterval(load, 5000);
    return () => clearInterval(poll.current);
  }, [dealId, load]);

  // Korumalı fotoğraf adresini hazırla
  useEffect(() => {
    const id = state?.deal?.photo_url;
    if (!id) { setFotoKaynak(null); return; }
    fotografKaynagi(dealId, id).then(setFotoKaynak).catch(() => {});
  }, [state?.deal?.photo_url, dealId]);

  // Sayaç
  useEffect(() => {
    if (!state?.deal?.timer_ends_at) return setRemaining(null);
    const tick = () => {
      const ms = new Date(state.deal.timer_ends_at) - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [state?.deal?.timer_ends_at]);

  const act = async (fn) => {
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e.message); }
  };

  const fotografYukle = () => act(async () => {
    const izin = await ImagePicker.requestCameraPermissionsAsync();
    if (!izin.granted) throw new Error('Kamera izni verilmedi');

    const sonuc = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (sonuc.canceled) return;

    setYukleniyor(true);
    try {
      const url = await gorselYukle(sonuc.assets[0].uri);
      await api.uploadPhoto(dealId, url);
    } finally {
      setYukleniyor(false);
    }
  });

  const fotografCek = () => act(async () => {
    const izin = await ImagePicker.requestCameraPermissionsAsync();
    if (!izin.granted) throw new Error('Kamera izni verilmedi');

    const sonuc = await ImagePicker.launchCameraAsync({
      quality: 0.4,
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
    });
    if (sonuc.canceled) return;

    await api.sendPhoto(dealId, sonuc.assets[0].base64);
  });

  const shareLocation = () => act(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Konum izni verilmedi');
    const pos = await Location.getCurrentPositionAsync({});
    await api.shareLocation(dealId, pos.coords.latitude, pos.coords.longitude);
  });

  const close = (outcome) => {
    Alert.alert(
      outcome === 'completed' ? 'Tamamlandı mı?' : 'İptal et',
      outcome === 'completed'
        ? 'İşlemi tamamlandı olarak işaretle. Sohbet silinecek.'
        : 'Anlaşmayı iptal etmek istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet',
          onPress: () => act(async () => {
            await api.closeDeal(dealId, outcome);
            if (outcome === 'completed') {
              navigation.replace('Rate', { dealId });
            } else if (d.is_requester) {
              // İsteği tekrar yayınlayabilsin; vazgeçen kişi artık engelli
              navigation.replace('MyRequest', { requestId: d.request_id });
            } else {
              navigation.popToTop();
            }
          }),
        },
      ]
    );
  };

  if (!state) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const d = state.deal;
  const priceSettled = d.price_ok_requester && d.price_ok_responder;
  const myPriceOk = d.is_requester ? d.price_ok_requester : d.price_ok_responder;
  const waitingMyDurationOk =
    d.duration_minutes && !d.duration_confirmed && d.duration_proposed_by !== null;
  const tavan = d.sure_kurali?.tavan || 20;
  const sureler = d.sure_kurali?.secenekler || [10, 15, 20];
  const canExtend =
    d.status === 'running' && !d.extension_used && d.duration_minutes < tavan;

  // Hizmet isteklerinde geri sayım yerine randevu kullanılır
  const randevulu = !!d.randevulu;
  const hizmet = randevulu;
  const randevuBekliyorOnayim =
    randevulu && d.randevu_tarih && !d.randevu_onaylandi &&
    !d.randevu_teklif_eden_benim;

  const mmss = remaining !== null
    ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
    : null;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            {d.category} · {d.price}₺{d.fiyat_tipi === 'saatlik' ? '/saat' : ''}
          </Text>
          <Text style={type.tiny}>
            {d.status === 'running' ? 'Teslimat sürüyor'
              : d.status === 'scheduled' ? 'Randevu kuruldu'
              : d.status === 'negotiating' ? 'Anlaşılıyor' : d.status}
          </Text>
        </View>
        {mmss && (
          <View style={[s.timer, remaining < 120 && s.timerLow]}>
            <Text style={[s.timerText, remaining < 120 && { color: colors.urgent }]}>
              {mmss}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        {state.messages.map((m) => {
          const mine = m.sender_id !== d.requester_id ? !d.is_requester : d.is_requester;
          return (
            <View key={m.id} style={[s.bubble, mine ? s.mine : s.theirs]}>
              {m.photo_url ? (
                <Image
                  source={{ uri: m.photo_url }}
                  style={s.mesajFoto}
                  resizeMode="cover"
                />
              ) : m.text ? (
                <Text style={[type.body, mine && { color: '#fff' }]}>{m.text}</Text>
              ) : (
                <View>
                  <Text style={[type.body, mine && { color: '#fff' }, { fontWeight: '600' }]}>
                    Konum paylaşıldı
                  </Text>
                  <Text style={[type.tiny, mine && { color: '#DFF0E6' }]}>
                    {Number(m.lat).toFixed(5)}, {Number(m.lng).toFixed(5)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {!state.messages.length && (
          <Text style={[type.small, { textAlign: 'center', marginTop: 20 }]}>
            Anlaşmaya başlayın. Sohbet, işlem bitince silinir.
          </Text>
        )}
      </ScrollView>

      <View style={s.panel}>
        {!priceSettled && (
          <>
            <Text style={s.panelLabel}>Fiyat onayı</Text>
            <TouchableOpacity
              style={[s.primaryBtn, myPriceOk && s.doneBtn]}
              disabled={myPriceOk}
              onPress={() => act(() => api.priceOk(dealId))}
            >
              <Text style={[s.primaryText, myPriceOk && { color: colors.primary }]}>
                {myPriceOk
                  ? 'Onayladın, karşı taraf bekleniyor'
                  : `${d.price}₺${d.fiyat_tipi === 'saatlik' ? '/saat' : ''} uygun`}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {priceSettled && d.tur === 'esya' && !d.photo_confirmed && (
          <>
            <Text style={s.panelLabel}>Ürün fotoğrafı</Text>
            {d.is_requester ? (
              d.photo_url ? (
                <>
                  <Image source={{ uri: d.photo_url }} style={s.onayFoto} />
                  <Text style={s.panelNot}>
                    Ürün beklediğin gibi mi? Onayladığında süre adımına geçilir.
                  </Text>
                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={() => act(() => api.confirmPhoto(dealId))}
                  >
                    <Text style={s.primaryText}>Fotoğrafı onayla</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={s.panelNot}>
                  Karşı tarafın ürün fotoğrafı yüklemesi bekleniyor.
                </Text>
              )
            ) : (
              <>
                <Text style={s.panelNot}>
                  Ürünün fotoğrafını çek. Karşı taraf onaylayınca süre adımına
                  geçilir — böylece gereksiz yazışma olmaz.
                </Text>
                <TouchableOpacity
                  style={[s.primaryBtn, yukleniyor && { opacity: 0.6 }]}
                  onPress={fotografYukle}
                  disabled={yukleniyor}
                >
                  {yukleniyor ? <ActivityIndicator color="#fff" /> : (
                    <Text style={s.primaryText}>
                      {d.photo_url ? 'Yeniden çek' : 'Fotoğraf çek'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {randevulu && priceSettled && d.photo_confirmed
          && !d.randevu_onaylandi && !randevuBekliyorOnayim && (
          <>
            <Text style={s.panelLabel}>Gün seç</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
              {gunler.map((g) => (
                <TouchableOpacity
                  key={g.iso}
                  style={[s.gunBtn, secilenGun === g.iso && s.gunBtnOn]}
                  onPress={() => setSecilenGun(g.iso)}
                >
                  <Text style={[s.gunUst, secilenGun === g.iso && s.gunOnText]}>{g.gun}</Text>
                  <Text style={[s.gunAlt, secilenGun === g.iso && s.gunOnText]}>{g.etiket}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.panelLabel}>Saat aralığı</Text>
            <View style={s.wrap}>
              {slotlar.map((sl) => (
                <TouchableOpacity
                  key={sl.deger}
                  style={[s.slotBtn, secilenSlot === sl.deger && s.slotBtnOn]}
                  onPress={() => setSecilenSlot(sl.deger)}
                >
                  <Text style={[s.slotText, secilenSlot === sl.deger && s.slotTextOn]}>
                    {sl.metin}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: space.md },
                (!secilenGun || !secilenSlot) && { opacity: 0.5 }]}
              disabled={!secilenGun || !secilenSlot}
              onPress={() => act(() => api.proposeAppointment(dealId, secilenGun, secilenSlot))}
            >
              <Text style={s.primaryText}>Randevu teklif et</Text>
            </TouchableOpacity>
          </>
        )}

        {randevulu && randevuBekliyorOnayim && (
          <>
            <Text style={s.panelLabel}>Randevu teklifi</Text>
            <View style={s.randevuKart}>
              <Text style={s.randevuTarih}>{tarihMetni(d.randevu_tarih)}</Text>
              <Text style={type.small}>{slotMetni(d.randevu_slot)}</Text>
            </View>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => act(() => api.confirmAppointment(dealId))}
            >
              <Text style={s.primaryText}>Randevuyu onayla</Text>
            </TouchableOpacity>
            <Text style={s.bekle}>Uygun değilse başka bir gün teklif edebilirsin.</Text>
          </>
        )}

        {randevulu && d.randevu_onaylandi && (
          <>
            <View style={s.randevuKart}>
              <Text style={s.randevuOnayli}>RANDEVU KURULDU</Text>
              <Text style={s.randevuTarih}>{tarihMetni(d.randevu_tarih)}</Text>
              <Text style={type.small}>{slotMetni(d.randevu_slot)}</Text>
            </View>

            <TouchableOpacity style={s.outlineBtn} onPress={shareLocation}>
              <Text style={s.outlineText}>Konumumu paylaş</Text>
            </TouchableOpacity>

            <Text style={s.panelLabel}>Hazır cevaplar</Text>
            <View style={s.wrap}>
              {replies.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={s.chip}
                  onPress={() => act(() => api.sendReply(dealId, r.id))}
                >
                  <Text style={s.chipText}>{r.text}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.row}>
              <TouchableOpacity style={[s.halfBtn, s.okBtn]} onPress={() => close('completed')}>
                <Text style={s.okText}>Tamamlandı</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.halfBtn, s.cancelBtn]} onPress={() => close('cancelled')}>
                <Text style={s.cancelText}>İptal et</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!randevulu && priceSettled && d.photo_confirmed
          && !d.duration_confirmed && !waitingMyDurationOk && (
          <>
            <Text style={s.panelLabel}>Teslimat süresi seç</Text>
            <View style={s.row}>
              {sureler.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={s.durBtn}
                  onPress={() => act(() => api.proposeDuration(dealId, m))}
                >
                  <Text style={s.durText}>{m} dk</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {!randevulu && priceSettled && d.photo_confirmed && waitingMyDurationOk && (
          <>
            <Text style={s.panelLabel}>{d.duration_minutes} dk teklif edildi</Text>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => act(() => api.confirmDuration(dealId))}
            >
              <Text style={s.primaryText}>Onayla ve sayacı başlat</Text>
            </TouchableOpacity>
          </>
        )}

        {!randevulu && d.status === 'running' && (
          <>
            <TouchableOpacity style={s.outlineBtn} onPress={shareLocation}>
              <Text style={s.outlineText}>Konumumu paylaş</Text>
            </TouchableOpacity>

            <Text style={s.panelLabel}>Hazır cevaplar</Text>
            <View style={s.wrap}>
              {replies.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={s.chip}
                  onPress={() => act(() => api.sendReply(dealId, r.id))}
                >
                  <Text style={s.chipText}>{r.text}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {canExtend && (
              <TouchableOpacity style={s.outlineBtn} onPress={() => act(() => api.extend(dealId))}>
                <Text style={s.outlineText}>
                  Ek süre iste (+{tavan - d.duration_minutes} dk, tek seferlik)
                </Text>
              </TouchableOpacity>
            )}

            <View style={s.row}>
              <TouchableOpacity style={[s.halfBtn, s.okBtn]} onPress={() => close('completed')}>
                <Text style={s.okText}>Tamamlandı</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.halfBtn, s.cancelBtn]} onPress={() => close('cancelled')}>
                <Text style={s.cancelText}>İptal et</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!!error && <Text style={s.error}>{error}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, padding: space.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...type.body, fontWeight: '600' },
  timer: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.primarySoft,
  },
  timerLow: { backgroundColor: colors.urgentSoft },
  timerText: { color: colors.primary, fontWeight: '700', fontSize: 15 },

  bubble: {
    maxWidth: '78%', padding: 10, borderRadius: radius.md, marginBottom: space.sm,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: {
    alignSelf: 'flex-start', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },

  panel: {
    backgroundColor: colors.surface, padding: space.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  panelLabel: { ...type.small, fontWeight: '600', marginBottom: space.sm, marginTop: space.sm },
  bekle: { ...type.small, textAlign: 'center', paddingVertical: space.md },
  onayFoto: {
    width: '100%', height: 160, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt, marginBottom: space.sm,
  },
  mesajFoto: {
    width: 180, height: 135, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  panelNot: { ...type.tiny, lineHeight: 17, marginBottom: space.sm },
  mesajFoto: { width: 190, height: 142, borderRadius: radius.sm },
  onayFoto: {
    width: '100%', height: 170, borderRadius: radius.md,
    marginBottom: space.sm, backgroundColor: colors.surfaceAlt,
  },

  row: { flexDirection: 'row', gap: 8, marginTop: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 13, alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  doneBtn: { backgroundColor: colors.primarySoft },

  outlineBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 12, alignItems: 'center', marginTop: space.sm,
  },
  outlineText: { ...type.body, fontWeight: '500' },

  durBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 13, alignItems: 'center', backgroundColor: colors.surface,
  },
  durText: { ...type.body, fontWeight: '600' },

  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  chipText: { ...type.small, color: colors.text },

  halfBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  okBtn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  okText: { color: colors.primary, fontWeight: '600' },
  cancelBtn: { borderColor: colors.border },
  cancelText: { color: colors.danger, fontWeight: '600' },

  error: { color: colors.danger, ...type.small, marginTop: space.md },

  gunBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
    backgroundColor: colors.surface, minWidth: 62,
  },
  gunBtnOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  gunUst: { ...type.small, fontWeight: '600' },
  gunAlt: { ...type.tiny, marginTop: 1 },
  gunOnText: { color: colors.primary },

  slotBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.surface,
  },
  slotBtnOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  slotText: { ...type.small },
  slotTextOn: { color: colors.primary, fontWeight: '600' },

  randevuKart: {
    backgroundColor: colors.primarySoft, borderRadius: radius.md,
    padding: space.md, marginBottom: space.sm, alignItems: 'center',
  },
  randevuOnayli: { ...type.tiny, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  randevuTarih: { ...type.body, fontWeight: '600', color: colors.text },
});

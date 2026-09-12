import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../api';
import { colors, type, radius, space } from '../theme';

export default function CreateRequestScreen({ route, navigation }) {
  const { coords } = route.params || {};
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [price, setPrice] = useState('150');
  const [agreed, setAgreed] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [arama, setArama] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.categories().then(setCategories).catch((e) => Alert.alert('Hata', e.message));
  }, []);

  // Aramaya göre filtrele, sonra gruba göre ayır
  const filtreli = arama.trim()
    ? categories.filter((c) =>
        c.name.toLocaleLowerCase('tr').includes(arama.trim().toLocaleLowerCase('tr'))
      )
    : categories;

  const gruplar = Object.entries(
    filtreli.reduce((acc, c) => {
      (acc[c.grup] = acc[c.grup] || []).push(c);
      return acc;
    }, {})
  );

  const submit = async () => {
    const p = parseInt(price, 10);
    if (!selected) return setError('Bir kategori seç.');
    if (!p || p < 50 || p > 2000) return setError('Fiyat 50₺ ile 2000₺ arasında olmalı.');
    if (!agreed) return setError('Kullanım şartlarını onaylaman gerekiyor.');
    if (!coords) return setError('Konum alınamadı.');

    setError('');
    setBusy(true);
    try {
      const req = await api.createRequest({
        category_id: selected.id,
        price: p,
        is_urgent: urgent,
        lat: coords.latitude,
        lng: coords.longitude,
      });
      navigation.replace('MyRequest', { requestId: req.id });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: space.lg }}>
      <Text style={s.label}>Neye ihtiyacın var?</Text>

      <TextInput
        style={s.arama}
        placeholder="Ara (tüp, ampul, bez...)"
        placeholderTextColor={colors.textFaint}
        value={arama}
        onChangeText={setArama}
      />

      {gruplar.map(([grup, liste]) => (
        <View key={grup} style={{ marginBottom: space.md }}>
          <Text style={s.grupBaslik}>{grup}</Text>
          <View style={s.grid}>
            {liste.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[s.cat, selected?.id === c.id && s.catActive]}
                onPress={() => {
                  setSelected(c);
                  if (!c.is_urgent_allowed) setUrgent(false);
                  setError('');
                }}
              >
                <Text style={[s.catText, selected?.id === c.id && s.catTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {gruplar.length === 0 && (
        <Text style={s.bosSonuc}>
          "{arama}" için sonuç yok. Aradığın kategori listede olmayabilir.
        </Text>
      )}

      <Text style={s.label}>
        {selected?.tur === 'hizmet' ? 'Saatlik ücret' : 'Teklif ettiğin fiyat'}
      </Text>
      <View style={s.priceRow}>
        <TextInput
          style={s.input}
          value={price}
          onChangeText={(t) => { setPrice(t.replace(/[^0-9]/g, '')); setError(''); }}
          keyboardType="number-pad"
          maxLength={4}
        />
        <Text style={s.currency}>
          ₺{selected?.tur === 'hizmet' ? '/saat' : ''}
        </Text>
      </View>
      <Text style={type.tiny}>
        50₺ – 2000₺ arası
        {selected?.tur === 'hizmet'
          ? ' · Ücret saat başına, iş sonunda aranızda hesaplanır.'
          : ''}
      </Text>

      {selected?.is_urgent_allowed && (
        <TouchableOpacity
          style={[s.urgentBox, urgent && s.urgentOn]}
          onPress={() => { setUrgent(!urgent); setError(''); }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.urgentTitle, urgent && { color: colors.urgent }]}>
              Hızlı getir modu
            </Text>
            <Text style={type.tiny}>
              Bildirim farklı sesle ve yüksek öncelikle gider. Günde 2 hakkın var.
            </Text>
          </View>
          <View style={[s.toggle, urgent && s.toggleOn]}>
            <View style={[s.knob, urgent && s.knobOn]} />
          </View>
        </TouchableOpacity>
      )}

      {selected && !selected.is_urgent_allowed && (
        <Text style={s.urgentNote}>
          {selected.name} için hızlı getir modu açılamaz — bekleyebilir kategorilerde.
        </Text>
      )}

      <Text style={[s.label, { marginTop: space.xl }]}>Konum</Text>
      {selected?.tur === 'hizmet' && (
        <View style={s.hizmetNot}>
          <Text style={type.small}>
            Hizmet veren kişiler bağımsız çalışandır. Uygulama işveren değildir,
            iş kalitesinden ve iş güvenliğinden sorumlu tutulamaz. Ödeme ve
            anlaşma aranızda yapılır.
          </Text>
        </View>
      )}

      <View style={s.locBox}>
        <Text style={type.body}>Mevcut konumun kullanılacak</Text>
        <Text style={[type.tiny, { marginTop: 4 }]}>
          Haritada yaklaşık konumun görünür. Kesin adresin sadece anlaşma sonrası paylaşılır.
        </Text>
      </View>

      <TouchableOpacity style={s.check} onPress={() => { setAgreed(!agreed); setError(''); }}>
        <View style={[s.box, agreed && s.boxOn]}>
          {agreed && <Text style={s.tick}>✓</Text>}
        </View>
        <Text style={s.checkText}>
          Gıda, alkol, sigara, ilaç ve yasa dışı ürünlerin paylaşılamayacağını,
          ödemenin taraflar arasında yapıldığını ve uygulamanın aracı olmadığını kabul ediyorum.
        </Text>
      </TouchableOpacity>

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitText}>İsteği yayınla</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  label: { ...type.small, fontWeight: '600', marginBottom: space.sm, color: colors.text },

  arama: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10,
    fontSize: 14, color: colors.text, marginBottom: space.lg,
  },
  grupBaslik: {
    ...type.tiny, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  bosSonuc: { ...type.small, textAlign: 'center', paddingVertical: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  catActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  catText: { ...type.body },
  catTextActive: { color: colors.primary, fontWeight: '600' },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 20, fontWeight: '600', width: 120, color: colors.text,
  },
  currency: { fontSize: 20, fontWeight: '600', color: colors.textMuted },

  urgentBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: space.md, marginTop: space.lg,
  },
  urgentOn: { borderColor: colors.urgent, backgroundColor: colors.urgentSoft },
  urgentTitle: { ...type.body, fontWeight: '600', marginBottom: 2 },
  urgentNote: { ...type.tiny, marginTop: space.md, fontStyle: 'italic' },
  toggle: {
    width: 46, height: 27, borderRadius: 14, backgroundColor: colors.surfaceAlt,
    padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.urgent },
  knob: {
    width: 21, height: 21, borderRadius: 11, backgroundColor: colors.surface,
  },
  knobOn: { alignSelf: 'flex-end' },

  hizmetNot: {
    backgroundColor: colors.warnSoft, borderRadius: radius.md,
    padding: space.md, marginTop: space.lg,
  },
  locBox: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: space.md,
  },

  check: { flexDirection: 'row', gap: 10, marginTop: space.xl, alignItems: 'flex-start' },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkText: { ...type.small, flex: 1, lineHeight: 19 },

  error: { color: colors.danger, ...type.small, marginTop: space.md },

  submit: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: space.xl, marginBottom: 40,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

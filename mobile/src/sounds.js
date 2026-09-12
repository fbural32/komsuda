import { Audio } from 'expo-av';

// Uygulama içi ses efektleri. Sessiz moda saygı duyar,
// kullanıcı ayarlardan tamamen kapatabilir.

let enabled = true;
const cache = {};

const FILES = {
  yeniIstek: require('../assets/sounds/zil.wav'),
  acilIstek: require('../assets/sounds/zil_acil.wav'),
  teklifGeldi: require('../assets/sounds/zil_tek.wav'),
};

export function setSoundEnabled(v) {
  enabled = v;
}

export async function initSounds() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: false,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
}

export async function play(name) {
  if (!enabled) return;
  try {
    if (!cache[name]) {
      const { sound } = await Audio.Sound.createAsync(FILES[name], {
        volume: 0.6,
      });
      cache[name] = sound;
    }
    await cache[name].replayAsync();
  } catch {
    // Ses çalınamadıysa sessizce geç — akışı bozmaz
  }
}

export async function unloadSounds() {
  for (const s of Object.values(cache)) {
    try { await s.unloadAsync(); } catch {}
  }
}

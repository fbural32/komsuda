// Arka plan konum güncellemesi.
// Amaç: kullanıcı uygulamayı açmasa da yakınındaki isteklerin bildirimi ulaşsın.
// Konum sunucuda sadece bildirim hedeflemesi için tutulur, geçmiş kaydı yapılmaz.

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';

export const KONUM_GOREVI = 'komsuda-konum-guncelleme';

// Arka planda çalışan görev — konumu sunucuya yazar
TaskManager.defineTask(KONUM_GOREVI, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const { latitude, longitude } = data.locations[0].coords;
  try {
    await api.updateLocation(latitude, longitude);
  } catch {
    // Bağlantı yoksa sessizce geç, bir sonraki güncellemede denenir
  }
});

export async function arkaPlanKonumuBaslat() {
  const kayitli = await TaskManager.isTaskRegisteredAsync(KONUM_GOREVI);
  if (kayitli) return true;

  const { status } = await Location.getBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  await Location.startLocationUpdatesAsync(KONUM_GOREVI, {
    accuracy: Location.Accuracy.Balanced,
    // Pil dostu: 15 dakikada bir veya 500 metre hareket
    timeInterval: 15 * 60 * 1000,
    distanceInterval: 500,
    deferredUpdatesInterval: 15 * 60 * 1000,
    deferredUpdatesDistance: 500,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: 'Komşuda',
      notificationBody: 'Yakınındaki istekleri alabilmen için konumun güncelleniyor',
      notificationColor: '#1F6F4A',
    },
  });
  return true;
}

export async function arkaPlanKonumuDurdur() {
  const kayitli = await TaskManager.isTaskRegisteredAsync(KONUM_GOREVI);
  if (kayitli) await Location.stopLocationUpdatesAsync(KONUM_GOREVI);
}

export async function arkaPlanKonumuAcikMi() {
  return TaskManager.isTaskRegisteredAsync(KONUM_GOREVI);
}

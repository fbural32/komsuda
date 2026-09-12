import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { getToken, api } from './src/api';
import { colors } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import VerifyScreen from './src/screens/VerifyScreen';
import MapScreen from './src/screens/MapScreen';
import CreateRequestScreen from './src/screens/CreateRequestScreen';
import RequestDetailScreen from './src/screens/RequestDetailScreen';
import DealScreen from './src/screens/DealScreen';
import RateScreen from './src/screens/RateScreen';
import MyRequestScreen from './src/screens/MyRequestScreen';
import MyOfferScreen from './src/screens/MyOfferScreen';
import ReportScreen from './src/screens/ReportScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPush() {
  if (!Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('istekler', {
      name: 'Yakındaki istekler',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'zil.wav',
      lightColor: colors.primary,
    });
    // Acil istekler ayrı kanal: farklı ses, yüksek öncelik.
    // Kullanıcı bu kanalı sistem ayarlarından tek başına kısabilir.
    await Notifications.setNotificationChannelAsync('acil-istekler', {
      name: 'Acil istekler',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'zil_acil.wav',
      vibrationPattern: [0, 120, 80, 120],
      lightColor: colors.urgent,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  let coords = null;
  const loc = await Location.getForegroundPermissionsAsync();
  if (loc.status === 'granted') {
    const pos = await Location.getCurrentPositionAsync({});
    coords = pos.coords;
  }

  await api.registerDevice({
    fcm_token: token,
    lat: coords?.latitude,
    lng: coords?.longitude,
  });
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [start, setStart] = useState('Login');

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { setReady(true); return; }
      try {
        const me = await api.me();
        setStart(me.email_verified_at ? 'Map' : 'Verify');
        registerForPush().catch(console.warn);
      } catch {
        setStart('Login');
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName={start}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontWeight: '600' },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Verify" component={VerifyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Yakındaki istekler' }} />
        <Stack.Screen name="CreateRequest" component={CreateRequestScreen} options={{ title: 'İstek oluştur' }} />
        <Stack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: 'İstek' }} />
        <Stack.Screen name="MyRequest" component={MyRequestScreen} options={{ title: 'İsteğim', headerBackVisible: false }} />
        <Stack.Screen name="MyOffer" component={MyOfferScreen} options={{ title: 'Teklifim', headerBackVisible: false }} />
        <Stack.Screen name="Deal" component={DealScreen} options={{ title: 'Anlaşma' }} />
        <Stack.Screen name="Rate" component={RateScreen} options={{ title: 'Puanla', headerBackVisible: false }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Şikayet et' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profilim' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import { Stack } from 'expo-router';

export default function DeviceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="[deviceId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="report/[deviceId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="watering-report/[deviceId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/[deviceId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="conditions/[deviceId]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

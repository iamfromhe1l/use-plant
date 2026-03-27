import { Stack } from 'expo-router';

export default function DeviceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[deviceId]" />
      <Stack.Screen name="report/[deviceId]" />
      <Stack.Screen name="settings/[deviceId]" />
      <Stack.Screen name="conditions/[deviceId]" />
    </Stack>
  );
}

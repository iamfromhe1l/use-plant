import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="wiki" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="device" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile" options={{ animation: 'fade' }} />
      <Stack.Screen name="connect" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" options={{ animation: 'fade' }} />
    </Stack>
  );
}

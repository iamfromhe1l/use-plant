import { AuthProvider } from '@/contexts/auth-context/auth-context';
import { DeviceLocalProvider } from '@/contexts/device-local-context/device-local-context';
import { DevicesProvider } from '@/contexts/devices-context/devices-context';
import { Toaster } from '@/components/ui/toast';
import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUniwind } from 'uniwind';

export {
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { theme } = useUniwind();

  return (
    <AuthProvider>
      <DevicesProvider>
        <DeviceLocalProvider>
          <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            <Stack>
              <Stack.Screen options={{ headerShown: false }} name="index" />
              <Stack.Screen options={{ headerShown: false }} name="(auth)" />
              <Stack.Screen options={{ headerShown: false }} name="(app)" />
            </Stack>
            <Toaster />
            <PortalHost />
          </ThemeProvider>
        </DeviceLocalProvider>
      </DevicesProvider>
    </AuthProvider>
  );
}

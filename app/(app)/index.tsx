import { Stack, router } from 'expo-router';
import * as React from 'react';
import { Welcome } from '@/components/welcome';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { DevicesList } from '@/components/devices-list';
import { DevicesListSkeleton } from '@/components/devices-list-skeleton';
import { BottomBar } from '@/components/bottom-bar';
import { TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/screen-header';
import { Icon } from '@/components/ui/icon';
import { Plus } from 'lucide-react-native';
import { isDeviceOnline } from '@/lib/device-status';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const { devices, loading } = useDevices();
  const onlineCount = devices.filter((device) => isDeviceOnline(device.lastSeen)).length;

  const handleAddDevice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/connect');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className='flex-1 bg-background'>
        <ScreenHeader
          title="Главная"
          subtitle={onlineCount > 0 ? `${onlineCount} устройств в сети` : 'Нет активных устройств'}
          showBack={false}
          rightContent={
            <TouchableOpacity onPress={handleAddDevice} activeOpacity={0.85} className="bg-primary rounded-2xl p-2.5">
              <Icon as={Plus} size={20} className="text-primary-foreground" />
            </TouchableOpacity>
          }
        />
        <View className="flex-1 px-5 pt-5">
          {loading
            ? <DevicesListSkeleton />
            : devices.length
              ? <DevicesList />
              : <Welcome />
          }
        </View>
        <BottomBar />
      </View>
    </>
  );
}

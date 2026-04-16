import { Stack, router } from 'expo-router';
import * as React from 'react';
import { Welcome } from '@/components/welcome';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { DevicesList } from '@/components/devices-list';
import { DevicesListSkeleton } from '@/components/devices-list-skeleton';
import { BottomBar } from '@/components/bottom-bar';
import { RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/screen-header';
import { Icon } from '@/components/ui/icon';
import { BookOpen, Plus } from 'lucide-react-native';
import { isDeviceOnline } from '@/lib/device-status';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const { devices, loading, actions } = useDevices();
  const [refreshing, setRefreshing] = React.useState(false);
  const onlineCount = devices.filter((device) => isDeviceOnline(device.lastSeen)).length;

  const handleAddDevice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/connect');
  };

  const handleOpenWiki = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/wiki');
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await actions.loadDevices();
    } finally {
      setRefreshing(false);
    }
  }, [actions]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="bg-background flex-1">
        <ScreenHeader
          title="Главная"
          subtitle={onlineCount > 0 ? `${onlineCount} устройств в сети` : 'Нет активных устройств'}
          showBack={false}
          leftContent={
            <TouchableOpacity
              onPress={handleOpenWiki}
              activeOpacity={0.85}
              className="bg-background/70 rounded-2xl p-2.5">
              <Icon as={BookOpen} size={20} className="text-foreground" />
            </TouchableOpacity>
          }
          rightContent={
            <TouchableOpacity
              onPress={handleAddDevice}
              activeOpacity={0.85}
              className="bg-primary rounded-2xl p-2.5">
              <Icon as={Plus} size={20} className="text-primary-foreground" />
            </TouchableOpacity>
          }
        />
        <View className="flex-1 px-5 pt-5">
          {loading ? (
            <DevicesListSkeleton />
          ) : devices.length ? (
            <DevicesList refreshing={refreshing} onRefresh={onRefresh} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
              }>
              <Welcome />
            </ScrollView>
          )}
        </View>
        <BottomBar />
      </View>
    </>
  );
}

import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/screen-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import { RotateCcw, Info, Cpu, Wifi, AlertTriangle } from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { useDevices } from '@/contexts/devices-context/devices-context';
import * as Haptics from 'expo-haptics';

const commandsApi = new CommandsApi();

export default function DeviceSettingsScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setResetting(true);
    const response = await commandsApi.sendCommand(deviceId, { type: 'device_reset' });
    setResetting(false);

    if (response.state) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Команда сброса отправлена');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    toast.error(response.error?.message || 'Не удалось сбросить устройство');
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Настройки устройства" />

      <View className="px-5 pt-4 gap-4">
        {/* Device info */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View className="bg-card rounded-3xl p-5 gap-3">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Информация</Text>

            <View className="flex-row items-center gap-3">
              <View className="bg-primary/10 rounded-2xl p-2.5">
                <Icon as={Cpu} size={18} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Название</Text>
                <Text className="text-base font-semibold text-foreground">{device?.name || 'Устройство'}</Text>
              </View>
            </View>

            <View className="h-px bg-border" />

            <View className="flex-row items-center gap-3">
              <View className="bg-blue-500/10 rounded-2xl p-2.5">
                <Icon as={Info} size={18} className="text-blue-500" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">ID устройства</Text>
                <Text className="text-sm font-mono text-foreground">{deviceId}</Text>
              </View>
            </View>

            <View className="h-px bg-border" />

            <View className="flex-row items-center gap-3">
              <View className="bg-emerald-500/10 rounded-2xl p-2.5">
                <Icon as={Wifi} size={18} className="text-emerald-500" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Растений</Text>
                <Text className="text-base font-semibold text-foreground">{device?.plants.length || 0}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Danger zone */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <View className="bg-card rounded-3xl p-5">
            <View className="flex-row items-center gap-2 mb-3">
              <Icon as={AlertTriangle} size={16} className="text-destructive" />
              <Text className="text-xs font-semibold text-destructive uppercase tracking-wider">Опасная зона</Text>
            </View>

            <Text className="text-sm text-muted-foreground mb-4">
              Сброс устройства удалит все настройки Wi-Fi и сохранённые данные. Устройство вернётся к заводскому состоянию.
            </Text>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TouchableOpacity
                  disabled={resetting}
                  activeOpacity={0.8}
                >
                  <View className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${resetting ? 'bg-muted' : 'bg-destructive/10'}`}>
                    <Icon as={RotateCcw} size={16} className={resetting ? 'text-muted-foreground' : 'text-destructive'} />
                    <Text className={`text-base font-semibold ${resetting ? 'text-muted-foreground' : 'text-destructive'}`}>
                      {resetting ? 'Сброс...' : 'Сбросить устройство'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <Text>Сброс устройства</Text>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <Text>
                      Устройство будет перезагружено и сброшено к заводским настройкам.
                    </Text>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <Text>Отмена</Text>
                  </AlertDialogCancel>
                  <AlertDialogAction onPress={handleReset}>
                    <Text>Сбросить</Text>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

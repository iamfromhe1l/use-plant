import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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
import {
  RotateCcw,
  Info,
  Cpu,
  Wifi,
  AlertTriangle,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react-native';
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
    <View className="bg-background flex-1">
      <ScreenHeader title="Настройки устройства" />

      <View className="gap-4 px-5 pt-4">
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <View className="bg-card gap-3 rounded-3xl p-5">
            <Text className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Информация
            </Text>

            <View className="flex-row items-center gap-3">
              <View className="bg-primary/10 rounded-2xl p-2.5">
                <Icon as={Cpu} size={18} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-muted-foreground text-xs">Название</Text>
                <Text className="text-foreground text-base font-semibold">
                  {device?.name || 'Устройство'}
                </Text>
              </View>
            </View>

            <View className="bg-border h-px" />

            <View className="flex-row items-center gap-3">
              <View className="rounded-2xl bg-blue-500/10 p-2.5">
                <Icon as={Info} size={18} className="text-blue-500" />
              </View>
              <View className="flex-1">
                <Text className="text-muted-foreground text-xs">ID устройства</Text>
                <Text className="text-foreground font-mono text-sm">{deviceId}</Text>
              </View>
            </View>

            <View className="bg-border h-px" />

            <View className="flex-row items-center gap-3">
              <View className="rounded-2xl bg-emerald-500/10 p-2.5">
                <Icon as={Wifi} size={18} className="text-emerald-500" />
              </View>
              <View className="flex-1">
                <Text className="text-muted-foreground text-xs">Растений</Text>
                <Text className="text-foreground text-base font-semibold">
                  {device?.plants.length || 0}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).springify()}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/(app)/device/telemetry-status/${deviceId}`)}>
            <View className="bg-card flex-row items-center gap-3 rounded-3xl p-5">
              <View className="bg-primary/10 rounded-2xl p-3">
                <Icon as={SlidersHorizontal} size={20} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-base font-semibold">Шкала статусов</Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  Пороги оценки телеметрии для каждого растения
                </Text>
              </View>
              <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <View className="bg-card rounded-3xl p-5">
            <View className="mb-3 flex-row items-center gap-2">
              <Icon as={AlertTriangle} size={16} className="text-destructive" />
              <Text className="text-destructive text-xs font-semibold tracking-wider uppercase">
                Опасная зона
              </Text>
            </View>

            <Text className="text-muted-foreground mb-4 text-sm">
              Сброс устройства удалит все настройки Wi-Fi и сохранённые данные. Устройство вернётся
              к заводскому состоянию.
            </Text>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TouchableOpacity disabled={resetting} activeOpacity={0.8}>
                  <View
                    className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${resetting ? 'bg-muted' : 'bg-destructive/10'}`}>
                    <Icon
                      as={RotateCcw}
                      size={16}
                      className={resetting ? 'text-muted-foreground' : 'text-destructive'}
                    />
                    <Text
                      className={`text-base font-semibold ${resetting ? 'text-muted-foreground' : 'text-destructive'}`}>
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
                    <Text>Устройство будет перезагружено и сброшено к заводским настройкам.</Text>
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

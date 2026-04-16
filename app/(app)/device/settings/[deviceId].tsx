import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
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
  Clock3,
  BookType,
  ChevronRight,
  PencilLine,
} from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { DevicesApi } from '@/api/devices/devices';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { getPresetSummaryLabel } from '@/lib/plant-presets';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as Haptics from 'expo-haptics';

const commandsApi = new CommandsApi();
const devicesApi = new DevicesApi();

function formatTelemetryInterval(minutes: number) {
  return minutes === 60 ? '1 час' : `${minutes} мин`;
}

export default function DeviceSettingsScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices, actions } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const [resetting, setResetting] = useState(false);
  const [intervalDialogOpen, setIntervalDialogOpen] = useState(false);
  const [telemetryInterval, setTelemetryInterval] = useState(device?.telemetryIntervalMinutes ?? 5);
  const [savingInterval, setSavingInterval] = useState(false);

  const presetsSummary = useMemo(() => {
    if (!device?.plants?.length) return 'Пока не выбраны';
    return device.plants
      .map((plant) => `${plant.name}: ${getPresetSummaryLabel(plant.presetId)}`)
      .join(' • ');
  }, [device]);

  const openIntervalDialog = () => {
    setTelemetryInterval(device?.telemetryIntervalMinutes ?? 5);
    setIntervalDialogOpen(true);
  };

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

  const handleSaveTelemetryInterval = async () => {
    if (!device) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavingInterval(true);

    const roundedMinutes = Math.min(60, Math.max(5, Math.round(telemetryInterval / 5) * 5));
    const response = await devicesApi.updateDeviceSettings({
      deviceId: device.deviceId,
      telemetryIntervalMinutes: roundedMinutes,
    });

    if (!response.state) {
      setSavingInterval(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(response.error?.message || 'Не удалось сохранить интервал обновления');
      return;
    }

    const commandResponse = await commandsApi.sendCommand(device.deviceId, {
      type: 'set_telemetry_interval',
      payload: { minutes: roundedMinutes },
    });

    await actions.loadDevices();
    setSavingInterval(false);
    setIntervalDialogOpen(false);

    if (commandResponse.state) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Интервал обновления изменён');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    toast.error(
      commandResponse.error?.message ||
        'Интервал сохранён в приложении, но не отправлен на устройство'
    );
  };

  return (
    <View className="bg-background flex-1">
      <ScreenHeader title="Настройки устройства" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
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
                  <Text className="text-muted-foreground text-xs">Код устройства</Text>
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
            <View className="gap-3">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/(app)/device/presets/${deviceId}`)}>
                <View className="bg-card flex-row items-center gap-3 rounded-3xl p-5">
                  <View className="rounded-2xl bg-lime-500/10 p-3">
                    <Icon as={BookType} size={20} className="text-lime-700" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-base font-semibold">Предустановки</Text>
                    <Text className="text-muted-foreground mt-1 text-sm">{presetsSummary}</Text>
                  </View>
                  <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/(app)/device/names/${deviceId}`)}>
                <View className="bg-card flex-row items-center gap-3 rounded-3xl p-5">
                  <View className="rounded-2xl bg-blue-500/10 p-3">
                    <Icon as={PencilLine} size={20} className="text-blue-700" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-base font-semibold">
                      Названия и иконки
                    </Text>
                    <Text className="text-muted-foreground mt-1 text-sm">
                      Переименовать устройство и растения, выбрать иконки растений
                    </Text>
                  </View>
                  <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} onPress={openIntervalDialog}>
                <View className="bg-card flex-row items-center gap-3 rounded-3xl p-5">
                  <View className="rounded-2xl bg-sky-500/10 p-3">
                    <Icon as={Clock3} size={20} className="text-sky-700" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-base font-semibold">
                      Интервал замеров
                    </Text>
                    <Text className="text-muted-foreground mt-1 text-sm">
                      Сейчас {formatTelemetryInterval(device?.telemetryIntervalMinutes ?? 5)}
                    </Text>
                  </View>
                  <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(130).springify()}>
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
                    Пороги оценки показаний для каждого растения
                  </Text>
                </View>
                <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <View className="bg-card rounded-3xl p-5">
              <View className="mb-3 flex-row items-center gap-2">
                <Icon as={AlertTriangle} size={16} className="text-destructive" />
                <Text className="text-destructive text-xs font-semibold tracking-wider uppercase">
                  Опасная зона
                </Text>
              </View>

              <Text className="text-muted-foreground mb-4 text-sm">
                Сброс устройства удалит все настройки Wi-Fi и сохранённые данные. Устройство
                вернётся к заводскому состоянию.
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
      </ScrollView>

      <Dialog open={intervalDialogOpen} onOpenChange={setIntervalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Интервал обновления показаний</DialogTitle>
          </DialogHeader>

          <View className="py-4">
            <Text className="text-foreground text-center text-3xl font-bold">
              {formatTelemetryInterval(
                Math.min(60, Math.max(5, Math.round(telemetryInterval / 5) * 5))
              )}
            </Text>
            <Text className="text-muted-foreground mt-2 text-center text-sm">
              Устройство будет отправлять показания не чаще выбранного интервала.
            </Text>

            <Slider
              minimumValue={5}
              maximumValue={60}
              step={5}
              value={telemetryInterval}
              onValueChange={setTelemetryInterval}
              minimumTrackTintColor="#16a34a"
              maximumTrackTintColor="#e5e7eb"
              style={{ marginTop: 20 }}
            />

            <View className="mt-2 flex-row justify-between">
              <Text className="text-muted-foreground text-xs">5 мин</Text>
              <Text className="text-muted-foreground text-xs">1 час</Text>
            </View>
          </View>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">
                <Text>Отмена</Text>
              </Button>
            </DialogClose>
            <Button onPress={handleSaveTelemetryInterval} disabled={savingInterval}>
              <Text className="text-primary-foreground">
                {savingInterval ? 'Сохранение...' : 'Сохранить'}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

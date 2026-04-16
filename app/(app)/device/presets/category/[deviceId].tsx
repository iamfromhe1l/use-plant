import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Flower2,
  Thermometer,
  Waves,
  Clock3,
} from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { DevicesApi } from '@/api/devices/devices';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { useUniwind } from 'uniwind';
import {
  getPlantPresetById,
  getPresetCategoryById,
  getPresetWateringConditionsForPlant,
  type IPlantPreset,
} from '@/lib/plant-presets';
import { describeWateringCondition } from '@/lib/watering-conditions';

const devicesApi = new DevicesApi();
const commandsApi = new CommandsApi();

function formatRange(min: number, max: number, unit: string) {
  return `${min}–${max}${unit}`;
}

function PlantTargetChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} className="flex-1">
      <View
        className={`rounded-2xl px-4 py-3 ${
          active ? 'bg-primary' : 'border-border/60 bg-secondary/35 border'
        }`}>
        <Text
          className={`text-center text-sm font-semibold ${
            active ? 'text-primary-foreground' : 'text-foreground'
          }`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PresetCategoryScreen() {
  const {
    deviceId,
    plantIndex: plantIndexParam,
    categoryId,
  } = useLocalSearchParams<{
    deviceId: string;
    plantIndex?: string;
    categoryId?: string;
  }>();
  const { devices, actions } = useDevices();
  const device = devices.find((item) => item.deviceId === deviceId);
  const plants = device?.plants ?? [];
  const [selectedPlantIndex, setSelectedPlantIndex] = useState(
    Number(plantIndexParam || plants[0]?.index || 1)
  );
  const [pendingPreset, setPendingPreset] = useState<IPlantPreset | null>(null);
  const [applying, setApplying] = useState(false);
  const { theme } = useUniwind();

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.index === selectedPlantIndex) ?? plants[0] ?? null,
    [plants, selectedPlantIndex]
  );

  const category = getPresetCategoryById(categoryId);
  const activePreset = getPlantPresetById(selectedPlant?.presetId);

  const applyPreset = async () => {
    if (!device || !selectedPlant || !pendingPreset) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setApplying(true);

    const response = await devicesApi.updateDeviceSettings({
      deviceId: device.deviceId,
      plants: [
        {
          plantIndex: selectedPlant.index,
          presetId: pendingPreset.id,
          telemetryStatusConfig: pendingPreset.telemetryStatusConfig,
          wateringConditions: getPresetWateringConditionsForPlant(
            pendingPreset.id,
            selectedPlant.index
          ),
        },
      ],
    });

    if (!response.state || !response.data) {
      setApplying(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(response.error?.message || 'Не удалось применить предустановку');
      return;
    }

    const enabledConditions = response.data.plants.flatMap((plant) =>
      plant.wateringConditions.filter((condition) => condition.enabled)
    );

    const commandResponse = await commandsApi.sendCommand(device.deviceId, {
      type: 'set_conditions',
      payload: { conditions: enabledConditions },
    });

    await actions.loadDevices();
    setApplying(false);
    setPendingPreset(null);

    if (commandResponse.state) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`Предустановка "${pendingPreset.name}" применена`);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    toast.error(
      commandResponse.error?.message ||
        'Предустановка сохранена в приложении, но не отправилась на устройство'
    );
  };

  if (!category) {
    return (
      <View className="bg-background flex-1">
        <ScreenHeader title="Предустановки" subtitle="Группа не найдена" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted-foreground text-center">
            Не удалось открыть выбранную группу растений.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <ScreenHeader title={category.name} subtitle={device?.name || 'Устройство'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="gap-4 px-5 pt-4">
          {selectedPlant ? (
            <Animated.View entering={FadeInDown.delay(40).springify()}>
              <View className="bg-card rounded-[30px] p-5">
                <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Для какого растения
                </Text>
                <View className="mt-3 flex-row gap-3">
                  {plants.map((plant) => (
                    <PlantTargetChip
                      key={plant.index}
                      label={plant.name}
                      active={plant.index === selectedPlantIndex}
                      onPress={() => setSelectedPlantIndex(plant.index)}
                    />
                  ))}
                </View>

                <View
                  className="mt-4 rounded-3xl px-4 py-4"
                  style={{
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255,255,255,0.04)' : category.palette.start,
                  }}>
                  <Text className="text-foreground text-sm font-semibold">{category.name}</Text>
                  <Text className="text-foreground mt-2 text-sm leading-6">{category.description}</Text>
                  <Text className="text-muted-foreground mt-2 text-xs">
                    Для текущего растения сейчас используется:{' '}
                    {activePreset ? activePreset.name : 'кастомная настройка'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {category.presets.map((preset, index) => {
            const isActive = selectedPlant?.presetId === preset.id;

            return (
              <Animated.View
                key={preset.id}
                entering={FadeInDown.delay(80 + index * 25).springify()}>
                <View className="bg-card overflow-hidden rounded-[32px]">
                  <View
                    className="px-5 py-5"
                    style={{
                      backgroundColor:
                        theme === 'dark' ? 'rgba(255,255,255,0.04)' : preset.palette.start,
                    }}>
                    <View className="flex-row items-start gap-4">
                      <View
                        className="items-center justify-center rounded-[28px] px-4 py-5"
                        style={{
                          backgroundColor:
                            theme === 'dark' ? 'rgba(255,255,255,0.06)' : preset.palette.end,
                          minWidth: 88,
                        }}>
                        <Text className="text-4xl">{preset.emoji}</Text>
                        <Text
                          className="mt-2 text-[10px] font-semibold uppercase tracking-[1px]"
                          style={{ color: preset.palette.chip }}>
                          вариант
                        </Text>
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-foreground text-lg font-semibold">{preset.name}</Text>
                          {isActive ? (
                            <Badge variant="outline" className="border-primary/20 bg-primary/10">
                              <Text className="text-primary text-[10px] font-semibold">
                                Активно
                              </Text>
                            </Badge>
                          ) : null}
                        </View>
                        <Text className="text-muted-foreground mt-1 text-sm italic">
                          {preset.latinName}
                        </Text>
                        <Text className="text-foreground mt-3 text-sm leading-6">
                          {preset.description}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="gap-4 px-5 py-5">
                    <View className="flex-row flex-wrap gap-2">
                      <Badge variant="outline" className="border-border/60 bg-secondary/30">
                        <Text className="text-foreground text-[10px] font-semibold">
                          {preset.lightLabel}
                        </Text>
                      </Badge>
                      <Badge variant="outline" className="border-border/60 bg-secondary/30">
                        <Text className="text-foreground text-[10px] font-semibold">
                          {preset.wateringLabel}
                        </Text>
                      </Badge>
                      <Badge variant="outline" className="border-border/60 bg-secondary/30">
                        <Text className="text-foreground text-[10px] font-semibold">
                          {preset.humidityLabel}
                        </Text>
                      </Badge>
                    </View>

                    <View className="bg-secondary/20 rounded-3xl px-4 py-4">
                      <Text className="text-foreground text-sm font-semibold">Что применится</Text>
                      <Text className="text-muted-foreground mt-2 text-sm leading-6">
                        {preset.analysis}
                      </Text>

                      <View className="mt-4 gap-3">
                        <View className="flex-row items-center gap-3">
                          <View className="rounded-2xl bg-orange-500/10 p-2.5">
                            <Icon as={Thermometer} size={16} className="text-orange-700" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-medium">
                              Температура «отлично»
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                              {formatRange(
                                preset.telemetryStatusConfig.temperature.low.good,
                                preset.telemetryStatusConfig.temperature.high.good,
                                '°C'
                              )}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-3">
                          <View className="rounded-2xl bg-sky-500/10 p-2.5">
                            <Icon as={Waves} size={16} className="text-sky-700" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-medium">
                              Влажность воздуха «отлично»
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                              {formatRange(
                                preset.telemetryStatusConfig.airHumidity.low.good,
                                preset.telemetryStatusConfig.airHumidity.high.good,
                                '%'
                              )}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-3">
                          <View className="rounded-2xl bg-emerald-500/10 p-2.5">
                            <Icon as={Droplets} size={16} className="text-emerald-700" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-medium">
                              Почва «отлично»
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                              {formatRange(
                                preset.telemetryStatusConfig.soilMoisture.low.good,
                                preset.telemetryStatusConfig.soilMoisture.high.good,
                                '%'
                              )}
                            </Text>
                          </View>
                        </View>

                        {preset.wateringConditions.map((condition) => (
                          <View key={condition.id} className="flex-row items-center gap-3">
                            <View className="bg-primary/10 rounded-2xl p-2.5">
                              <Icon
                                as={condition.type === 'sensor' ? Flower2 : Clock3}
                                size={16}
                                className="text-primary"
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="text-foreground text-sm font-medium">
                                {condition.type === 'sensor'
                                  ? 'Полив по показаниям'
                                  : 'Полив по расписанию'}
                              </Text>
                              <Text className="text-muted-foreground text-xs">
                                {describeWateringCondition(condition)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>

                    <Button onPress={() => setPendingPreset(preset)}>
                      <Text className="text-primary-foreground">
                        {isActive ? 'Применить повторно' : 'Применить к растению'}
                      </Text>
                    </Button>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <AlertDialog
        open={pendingPreset !== null}
        onOpenChange={(open) => !open && setPendingPreset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Text>Заменить текущие настройки?</Text>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text>
                {pendingPreset && selectedPlant
                  ? `Для "${selectedPlant.name}" будут полностью заменены шкалы и условия ухода на вариант "${pendingPreset.name}".`
                  : 'Текущие настройки растения будут заменены.'}
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <View className="rounded-3xl bg-amber-500/10 px-4 py-4">
            <View className="flex-row items-start gap-3">
              <View className="rounded-2xl bg-amber-500/15 p-2.5">
                <Icon as={AlertTriangle} size={18} className="text-amber-700" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-semibold">Важное предупреждение</Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  Предыдущие ручные настройки будут перезаписаны. Новый вариант сразу отправится
                  на устройство.
                </Text>
              </View>
            </View>
          </View>

          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Отмена</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={applyPreset} disabled={applying}>
              <View className="flex-row items-center gap-2">
                <Icon as={CheckCircle2} size={16} className="text-primary-foreground" />
                <Text>{applying ? 'Применение...' : 'Применить'}</Text>
              </View>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

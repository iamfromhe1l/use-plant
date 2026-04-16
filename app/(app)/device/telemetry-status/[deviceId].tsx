import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/screen-header';
import { toast } from '@/components/ui/toast';
import {
  SlidersHorizontal,
  Thermometer,
  Wind,
  Droplets,
  type LucideIcon,
} from 'lucide-react-native';
import { DevicesApi } from '@/api/devices/devices';
import { useDevices } from '@/contexts/devices-context/devices-context';
import type { IPlantTelemetryStatusConfig, ITelemetryMetricThresholds } from '@/types/device';
import {
  getPlantTelemetryConfig,
  getTelemetryStatusMeta,
  isMetricThresholdsValid,
  type TelemetryMetricKey,
} from '@/lib/telemetry-status';
import * as Haptics from 'expo-haptics';

const devicesApi = new DevicesApi();

const METRIC_OPTIONS: {
  key: TelemetryMetricKey;
  title: string;
  unit: string;
  icon: LucideIcon;
  iconClassName: string;
  bgClassName: string;
}[] = [
  {
    key: 'temperature',
    title: 'Температура',
    unit: '°C',
    icon: Thermometer,
    iconClassName: 'text-orange-600',
    bgClassName: 'bg-orange-500/10',
  },
  {
    key: 'airHumidity',
    title: 'Влажность воздуха',
    unit: '%',
    icon: Wind,
    iconClassName: 'text-sky-600',
    bgClassName: 'bg-sky-500/10',
  },
  {
    key: 'soilMoisture',
    title: 'Влажность почвы',
    unit: '%',
    icon: Droplets,
    iconClassName: 'text-emerald-600',
    bgClassName: 'bg-emerald-500/10',
  },
];

const LOW_BANDS: { key: keyof ITelemetryMetricThresholds['low']; label: string }[] = [
  { key: 'poor', label: 'Плохо от' },
  { key: 'moderate', label: 'Умеренно от' },
  { key: 'normal', label: 'Нормально от' },
  { key: 'good', label: 'Хорошо от' },
];

const HIGH_BANDS: { key: keyof ITelemetryMetricThresholds['high']; label: string }[] = [
  { key: 'good', label: 'Хорошо до' },
  { key: 'normal', label: 'Нормально до' },
  { key: 'moderate', label: 'Умеренно до' },
  { key: 'poor', label: 'Плохо до' },
];

type PlantConfigDraft = Record<number, IPlantTelemetryStatusConfig>;

function parseNumericInput(value: string, fallback: number) {
  if (!value.trim()) return fallback;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function StatusScalePreview() {
  const statuses = ['poor', 'moderate', 'normal', 'good', 'excellent'] as const;

  return (
    <View className="flex-row flex-wrap gap-2">
      {statuses.map((status) => {
        const meta = getTelemetryStatusMeta(status);
        if (!meta) return null;

        return (
          <Badge key={status} variant="outline" className={meta.badgeClassName}>
            <Text className={`text-[10px] font-semibold ${meta.textClassName}`}>{meta.label}</Text>
          </Badge>
        );
      })}
    </View>
  );
}

export default function TelemetryStatusScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices, actions } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const [saving, setSaving] = useState(false);
  const [plantConfigs, setPlantConfigs] = useState<PlantConfigDraft>({});

  useEffect(() => {
    if (!device) return;

    const nextDraft = Object.fromEntries(
      device.plants.map((plant) => [plant.index, getPlantTelemetryConfig(plant)])
    ) as PlantConfigDraft;

    setPlantConfigs(nextDraft);
  }, [device]);

  const hasDraft = useMemo(() => Object.keys(plantConfigs).length > 0, [plantConfigs]);

  const updateThreshold = (
    plantIndex: number,
    metric: TelemetryMetricKey,
    side: 'low' | 'high',
    key: string,
    rawValue: string
  ) => {
    setPlantConfigs((prev) => {
      const currentPlantConfig = prev[plantIndex] ?? getPlantTelemetryConfig();
      const currentMetricConfig = currentPlantConfig[metric];
      const currentValue =
        side === 'low'
          ? currentMetricConfig.low[key as keyof ITelemetryMetricThresholds['low']]
          : currentMetricConfig.high[key as keyof ITelemetryMetricThresholds['high']];
      const nextValue = parseNumericInput(rawValue, currentValue);

      return {
        ...prev,
        [plantIndex]: {
          ...currentPlantConfig,
          [metric]: {
            ...currentMetricConfig,
            [side]: {
              ...currentMetricConfig[side],
              [key]: nextValue,
            },
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!device || !hasDraft) return;

    for (const plant of device.plants) {
      const config = plantConfigs[plant.index] ?? getPlantTelemetryConfig(plant);
      const invalidMetric = METRIC_OPTIONS.find(
        (metricOption) => !isMetricThresholdsValid(config[metricOption.key])
      );

      if (invalidMetric) {
        toast.error(`Проверь диапазоны: ${plant.name} / ${invalidMetric.title}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    const response = await devicesApi.updateDeviceSettings({
      deviceId: device.deviceId,
      plants: device.plants.map((plant) => ({
        plantIndex: plant.index,
        telemetryStatusConfig: plantConfigs[plant.index] ?? getPlantTelemetryConfig(plant),
      })),
    });

    setSaving(false);

    if (response.state) {
      await actions.loadDevices();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Пороги показаний сохранены');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    toast.error(response.error?.message || 'Не удалось сохранить пороги');
  };

  return (
    <View className="bg-background flex-1">
      <ScreenHeader title="Шкала статусов" subtitle={device?.name || 'Устройство'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="gap-4 px-5 pt-4">
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <View className="bg-card gap-3 rounded-3xl p-5">
              <View className="flex-row items-center gap-2">
                <Icon as={SlidersHorizontal} size={18} className="text-primary" />
                <Text className="text-foreground text-base font-semibold">Шкала статусов</Text>
              </View>
              <Text className="text-muted-foreground text-sm">
                Эти диапазоны определяют подписи состояния на карточках показаний для каждого растения.
              </Text>
              <StatusScalePreview />
            </View>
          </Animated.View>

          {device?.plants.map((plant, plantIndex) => {
            const currentConfig = plantConfigs[plant.index] ?? getPlantTelemetryConfig(plant);

            return (
              <Animated.View
                key={plant.index}
                entering={FadeInDown.delay(90 + plantIndex * 60).springify()}>
                <View className="bg-card gap-4 rounded-3xl p-5">
                  <View className="flex-row items-center gap-3">
                    <View className="bg-primary/10 rounded-2xl p-2.5">
                      <Icon as={SlidersHorizontal} size={18} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground text-base font-semibold">{plant.name}</Text>
                      <Text className="text-muted-foreground text-xs">
                        Индивидуальные пороги оценки показаний
                      </Text>
                    </View>
                  </View>

                  {METRIC_OPTIONS.map((metricOption) => {
                    const metricConfig = currentConfig[metricOption.key];

                    return (
                      <View
                        key={metricOption.key}
                        className="bg-secondary/25 gap-4 rounded-3xl p-4">
                        <View className="flex-row items-center gap-3">
                          <View className={`${metricOption.bgClassName} rounded-2xl p-2.5`}>
                            <Icon
                              as={metricOption.icon}
                              size={18}
                              className={metricOption.iconClassName}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-semibold">
                              {metricOption.title}
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                              Отлично внутри центрального диапазона, хуже по краям
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row gap-3">
                          <View className="flex-1 gap-2">
                            <Text className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Нижний край
                            </Text>
                            {LOW_BANDS.map((band) => (
                              <View key={band.key} className="gap-1.5">
                                <Text className="text-muted-foreground text-xs">
                                  {band.label} {metricOption.unit}
                                </Text>
                                <Input
                                  value={String(metricConfig.low[band.key])}
                                  onChangeText={(value) =>
                                    updateThreshold(
                                      plant.index,
                                      metricOption.key,
                                      'low',
                                      band.key,
                                      value
                                    )
                                  }
                                  keyboardType="numeric"
                                />
                              </View>
                            ))}
                          </View>

                          <View className="flex-1 gap-2">
                            <Text className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              Верхний край
                            </Text>
                            {HIGH_BANDS.map((band) => (
                              <View key={band.key} className="gap-1.5">
                                <Text className="text-muted-foreground text-xs">
                                  {band.label} {metricOption.unit}
                                </Text>
                                <Input
                                  value={String(metricConfig.high[band.key])}
                                  onChangeText={(value) =>
                                    updateThreshold(
                                      plant.index,
                                      metricOption.key,
                                      'high',
                                      band.key,
                                      value
                                    )
                                  }
                                  keyboardType="numeric"
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View className="bg-background/95 absolute right-0 bottom-0 left-0 px-5 pt-3 pb-8">
        <Button onPress={handleSave} disabled={saving || !device || !hasDraft}>
          <Text className="text-primary-foreground">
            {saving ? 'Сохранение...' : 'Сохранить пороги'}
          </Text>
        </Button>
      </View>
    </View>
  );
}

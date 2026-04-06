import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Droplets,
  Thermometer,
  Wind,
  Flower2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Zap,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { TelemetryApi } from '@/api/devices/telemetry';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { isDeviceOnline } from '@/lib/device-status';
import { ICON_MAP } from '@/consts/icons';
import { WaterLevelBar } from '@/components/water-level-bar';
import { toast } from '@/components/ui/toast';
import type { CommandType } from '@/api/devices/types/commands';
import type { IWateringCondition } from '@/api/devices/types/conditions';
import type { ITelemetryRecord, IWateringRecord } from '@/api/devices/types/telemetry';
import type { IPlant } from '@/types/device';
import {
  describeWateringCondition,
  getWateringConditionsStorageKey,
} from '@/lib/watering-conditions';
import * as Haptics from 'expo-haptics';

const commandsApi = new CommandsApi();
const telemetryApi = new TelemetryApi();

const TOP_BAR_H = 64;
const PLANT_BLOCK_EXPANDED_HEIGHT = 116;
const PLANT_BLOCK_COLLAPSED_HEIGHT = 74;
const HEADER_BOTTOM_PADDING = 8;
const COLLAPSE_AT = 180;

export default function DeviceScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const insets = useSafeAreaInsets();

  const plants: IPlant[] = device?.plants || [];
  const [selectedPlantIndex, setSelectedPlantIndex] = useState(0);
  const [telemetry, setTelemetry]       = useState<ITelemetryRecord | null>(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [wateringHistory, setWateringHistory] = useState<IWateringRecord[]>([]);
  const [conditions, setConditions] = useState<IWateringCondition[]>([]);
  const [sendingCommand, setSendingCommand] = useState<CommandType | null>(null);
  const [waterLevels, setWaterLevels]   = useState<Record<number, number>>({});
  const [loading, setLoading]           = useState(true);

  const scrollY = useSharedValue(0);

  const currentPlant = plants[selectedPlantIndex];

  useEffect(() => {
    const levels: Record<number, number> = {};
    plants.forEach((p) => { levels[p.index] = 5; });
    setWaterLevels(levels);
  }, [plants.length]);

  const fetchData = useCallback(async () => {
    const [telRes, waterRes] = await Promise.all([
      telemetryApi.getLatestTelemetry(deviceId),
      telemetryApi.getWateringHistory(deviceId),
    ]);
    if (telRes.state && telRes.data) setTelemetry(telRes.data);
    if (waterRes.state && waterRes.data) setWateringHistory(waterRes.data);
  }, [deviceId]);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const loadConditions = useCallback(async () => {
    try {
      const storedConditions = await AsyncStorage.getItem(getWateringConditionsStorageKey(deviceId));
      const parsedConditions = storedConditions ? JSON.parse(storedConditions) : [];
      setConditions(Array.isArray(parsedConditions) ? parsedConditions : []);
    } catch {
      setConditions([]);
    }
  }, [deviceId]);

  useEffect(() => {
    void loadConditions();
  }, [loadConditions]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
      void loadConditions();

      const intervalId = setInterval(() => {
        void fetchData();
      }, 15000);

      return () => {
        clearInterval(intervalId);
      };
    }, [fetchData, loadConditions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleWater = async () => {
    if (!currentPlant) return;
    const plantIndex = currentPlant.index;
    const cmdType = plantIndex === 1 ? 'water_plant_1' : 'water_plant_2';
    const level = waterLevels[plantIndex] || 5;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSendingCommand(cmdType as CommandType);
    const response = await commandsApi.sendCommand(deviceId, {
      type: cmdType as CommandType,
      payload: { level },
    });
    setSendingCommand(null);
    if (response.state) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`Команда полива для ${currentPlant.name} отправлена`);
      fetchData();
    } else {
      toast.error(response.error?.message || 'Не удалось отправить команду');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const getPlantTelemetry = (plantIndex: number) =>
    telemetry?.plants.find((p) => p.index === plantIndex);

  const getLastWatering = (plantIndex: number): IWateringRecord | undefined =>
    wateringHistory
      .filter((w) => w.plantIndex === plantIndex)
      .sort((a, b) => new Date(b.wateredAt).getTime() - new Date(a.wateredAt).getTime())[0];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'Сегодня, ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const switchPlant = (direction: number) => {
    const next = selectedPlantIndex + direction;
    if (next >= 0 && next < plants.length) {
      setSelectedPlantIndex(next);
      Haptics.selectionAsync();
    }
  };

  const level        = waterLevels[currentPlant?.index] || 5;
  const plantTelemetry = currentPlant ? getPlantTelemetry(currentPlant.index) : undefined;
  const lastWatering = currentPlant ? getLastWatering(currentPlant.index) : undefined;
  const commandType  = currentPlant?.index === 1 ? 'water_plant_1' : 'water_plant_2';
  const isSending    = sendingCommand === commandType;
  const isOnline     = device ? isDeviceOnline(device.lastSeen) : false;
  const PlantIcon    = currentPlant ? (ICON_MAP[currentPlant.icon] || Flower2) : Flower2;
  const plantConditions = currentPlant
    ? conditions.filter((condition) => condition.plantIndex === currentPlant.index)
    : [];
  const enabledPlantConditions = plantConditions.filter((condition) => condition.enabled);
  const expandedHeaderHeight =
    insets.top + TOP_BAR_H + PLANT_BLOCK_EXPANDED_HEIGHT + HEADER_BOTTOM_PADDING;
  const collapsedHeaderHeight =
    insets.top + TOP_BAR_H + PLANT_BLOCK_COLLAPSED_HEIGHT + HEADER_BOTTOM_PADDING;
  const headerSubtitle = `${currentPlant?.name || 'Растение'} • ${isOnline ? 'В сети' : 'Не в сети'}`;

  // ─── Animated scroll handler ───────────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerCardStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, COLLAPSE_AT],
      [expandedHeaderHeight, collapsedHeaderHeight],
      Extrapolation.CLAMP,
    ),
  }));

  const plantBlockStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, COLLAPSE_AT],
      [PLANT_BLOCK_EXPANDED_HEIGHT, PLANT_BLOCK_COLLAPSED_HEIGHT],
      Extrapolation.CLAMP,
    ),
  }));

  const plantBlockContentStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, COLLAPSE_AT], [0, 1], Extrapolation.CLAMP);

    return {
      transform: [{ scale: 1 - progress * 0.08 }],
    };
  });

  const iconWrapStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollY.value, [0, COLLAPSE_AT], [76, 52], Extrapolation.CLAMP),
    height: interpolate(scrollY.value, [0, COLLAPSE_AT], [76, 52], Extrapolation.CLAMP),
    borderRadius: interpolate(scrollY.value, [0, COLLAPSE_AT], [30, 22], Extrapolation.CLAMP),
  }));

  if (plants.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <View className="bg-card px-5 pb-4 rounded-b-3xl" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="bg-background/70 rounded-2xl p-2.5">
              <Icon as={ArrowLeft} size={20} className="text-foreground" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-foreground">{device?.name || 'Устройство'}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted-foreground">Нет растений</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* ─── Animated sticky header ─────────────────────────────────── */}
      <Animated.View
        className="bg-card rounded-b-3xl overflow-hidden z-10 absolute top-0 left-0 right-0"
        style={headerCardStyle}
      >
        {/* Top bar — always visible */}
        <View
          className="flex-row items-center px-6"
          style={{ paddingTop: insets.top + 8, height: insets.top + TOP_BAR_H }}
        >
          <View className="w-11 items-start">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-background/70 rounded-2xl p-2.5"
              activeOpacity={0.7}
            >
              <Icon as={ArrowLeft} size={20} className="text-foreground" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center mx-3">
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
              {device?.name || 'Устройство'}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
              {headerSubtitle}
            </Text>
          </View>

          <View className="w-11 items-end">
            <TouchableOpacity
              onPress={() => router.push(`/(app)/device/settings/${deviceId}`)}
              className="bg-primary/10 rounded-2xl p-2.5"
              activeOpacity={0.7}
            >
              <Icon as={Settings} size={18} className="text-primary" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="pb-3">
          <Animated.View
            style={plantBlockStyle}
            className="overflow-hidden"
          >
            <Animated.View
              style={plantBlockContentStyle}
              className="flex-1 flex-row items-center px-5"
            >
              <View className="w-10 items-start">
                {plants.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => switchPlant(-1)}
                    disabled={selectedPlantIndex === 0}
                    className="bg-card rounded-2xl p-2.5"
                    style={{ opacity: selectedPlantIndex === 0 ? 0.35 : 1 }}
                    activeOpacity={0.75}
                  >
                    <Icon as={ChevronLeft} size={18} className="text-foreground" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View className="flex-1 flex-row items-center gap-3">
                <Animated.View
                  style={iconWrapStyle}
                  className="bg-primary/10 items-center justify-center"
                >
                  <Icon as={PlantIcon} size={30} className="text-primary" />
                </Animated.View>

                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground" numberOfLines={2}>
                    {currentPlant?.name}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground mt-1" numberOfLines={2}>
                    {lastWatering
                      ? `Последний полив: ${formatDate(lastWatering.wateredAt)}`
                      : 'Поливов пока не было'}
                  </Text>
                </View>

                <View className="items-end gap-2">
                  <View className="bg-card rounded-full px-3 py-1.5">
                    <Text
                      className={`text-[10px] font-semibold ${
                        isOnline ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}
                    >
                      {isOnline ? 'В сети' : 'Не в сети'}
                    </Text>
                  </View>
                  <View className="bg-card rounded-full px-3 py-1.5">
                    <Text className="text-[10px] font-semibold text-primary">
                      {enabledPlantConditions.length} усл.
                    </Text>
                  </View>
                </View>
              </View>

              <View className="w-10 items-end">
                {plants.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => switchPlant(1)}
                    disabled={selectedPlantIndex === plants.length - 1}
                    className="bg-card rounded-2xl p-2.5"
                    style={{ opacity: selectedPlantIndex === plants.length - 1 ? 0.35 : 1 }}
                    activeOpacity={0.75}
                  >
                    <Icon as={ChevronRight} size={18} className="text-foreground" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>

      {/* ─── Scrollable content ──────────────────────────────────────── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: expandedHeaderHeight + 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a"
            progressViewOffset={expandedHeaderHeight} />
        }
      >
        <View className="px-5 gap-4">
          {/* Sensor cards */}
          {loading ? (
            <Animated.View entering={FadeInDown.delay(50)} className="flex-row gap-3">
              <Skeleton className="flex-1 h-28 rounded-3xl" />
              <Skeleton className="flex-1 h-28 rounded-3xl" />
              <Skeleton className="flex-1 h-28 rounded-3xl" />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(50).springify()} className="flex-row gap-3">
              <MiniSensorCard icon={Thermometer} label="Темп."  value={plantTelemetry?.temperature}  unit="°C" bg="bg-orange-500/10" color="text-orange-600" />
              <MiniSensorCard icon={Wind}        label="Влажн." value={plantTelemetry?.airHumidity}  unit="%"  bg="bg-sky-500/10"    color="text-sky-600" />
              <MiniSensorCard icon={Droplets}    label="Почва"  value={plantTelemetry?.soilMoisture} unit="%"  bg="bg-emerald-500/10" color="text-emerald-600" />
            </Animated.View>
          )}

          <View className="h-px bg-border/70 mx-1" />

          {/* Quick actions */}
          <Animated.View entering={FadeInDown.delay(120).springify()} className="flex-row gap-3">
            <TouchableOpacity className="flex-1" activeOpacity={0.8}
              onPress={() =>
                router.push(
                  `/(app)/device/conditions/${deviceId}?plantIndex=${currentPlant?.index ?? 1}`
                )
              }>
              <View className="bg-card rounded-3xl p-4 flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-2xl p-2.5">
                  <Icon as={ListChecks} size={20} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Условия</Text>
                  <Text className="text-xs text-muted-foreground">Автополив</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1" activeOpacity={0.8}
              onPress={() =>
                router.push(
                  `/(app)/device/report/${deviceId}?plantIndex=${currentPlant?.index ?? 1}`
                )
              }>
              <View className="bg-card rounded-3xl p-4 flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-2xl p-2.5">
                  <Icon as={BarChart3} size={20} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Графики</Text>
                  <Text className="text-xs text-muted-foreground">Датчики</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push(
                `/(app)/device/watering-report/${deviceId}?plantIndex=${currentPlant?.index ?? 1}`
              )
            }
          >
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <View className="bg-card rounded-3xl p-4 flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-2xl p-2.5">
                  <Icon as={Droplets} size={20} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Отчёты поливов</Text>
                  <Text className="text-xs text-muted-foreground">История и интенсивность</Text>
                </View>
                <View className="bg-primary/10 rounded-full px-2.5 py-1">
                  <Text className="text-xs font-semibold text-primary">{plantConditions.length}</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <View className="h-px bg-border/70 mx-1" />

          {/* Water section */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="bg-card rounded-3xl p-5">
            <View className="flex-row items-center gap-2 mb-4">
              <Icon as={Droplets} size={18} className="text-primary" />
              <Text className="text-base font-semibold text-foreground">Ручной полив</Text>
              <View className="flex-1" />
              <View className="bg-primary/10 rounded-full px-2.5 py-1">
                <Text className="text-xs font-semibold text-primary">Уровень {level}</Text>
              </View>
            </View>

            <WaterLevelBar
              value={level}
              onChange={(val) => {
                if (!currentPlant) return;
                setWaterLevels((prev) => ({ ...prev, [currentPlant.index]: val }));
              }}
            />

            <TouchableOpacity
              className={`mt-4 rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
                sendingCommand !== null ? 'bg-muted' : 'bg-primary'
              }`}
              onPress={handleWater}
              disabled={sendingCommand !== null}
              activeOpacity={0.85}
            >
              <Icon as={isSending ? Zap : Droplets} size={18} className="text-primary-foreground" />
              <Text className="text-base font-semibold text-primary-foreground">
                {isSending ? 'Полив...' : `Полить ${currentPlant?.name || ''}`}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Last watering info */}
          {!loading && lastWatering && (
            <Animated.View entering={FadeInDown.delay(280).springify()}
              className="bg-card rounded-3xl p-4 flex-row items-center gap-3">
              <View className="bg-emerald-500/10 rounded-2xl p-2.5">
                <Icon as={CheckCircle2} size={18} className="text-emerald-600" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Последний полив</Text>
                <Text className="text-xs text-muted-foreground">
                  {formatDate(lastWatering.wateredAt)} • уровень {lastWatering.level}
                </Text>
              </View>
            </Animated.View>
          )}

          <View className="h-px bg-border/70 mx-1" />

          <Animated.View entering={FadeInDown.delay(340).springify()} className="bg-card rounded-3xl p-5">
            <View className="flex-row items-center gap-2 mb-4">
              <Icon as={ListChecks} size={18} className="text-primary" />
              <Text className="text-base font-semibold text-foreground">Условия полива</Text>
              <View className="flex-1" />
              <View className="bg-primary/10 rounded-full px-2.5 py-1">
                <Text className="text-xs font-semibold text-primary">
                  {enabledPlantConditions.length} активн.
                </Text>
              </View>
            </View>

            {plantConditions.length === 0 ? (
              <Text className="text-sm text-muted-foreground">
                Для этого растения условия пока не настроены.
              </Text>
            ) : (
              <View className="gap-3">
                {plantConditions.slice(0, 3).map((condition) => (
                  <View
                    key={condition.id}
                    className="bg-secondary/30 rounded-2xl px-4 py-3 flex-row items-start gap-3"
                  >
                    <View
                      className={`rounded-2xl p-2.5 ${
                        condition.type === 'sensor' ? 'bg-sky-500/12' : 'bg-violet-500/12'
                      }`}
                    >
                      <Icon
                        as={condition.type === 'sensor' ? Droplets : Clock}
                        size={16}
                        className={condition.type === 'sensor' ? 'text-sky-600' : 'text-violet-600'}
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-semibold text-foreground">
                          {condition.type === 'sensor' ? 'По датчикам' : 'По расписанию'}
                        </Text>
                        {!condition.enabled ? (
                          <View className="bg-muted rounded-full px-2 py-0.5">
                            <Text className="text-[11px] font-medium text-muted-foreground">
                              Выкл.
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-xs text-muted-foreground mt-1">
                        {describeWateringCondition(condition)}
                      </Text>
                    </View>
                  </View>
                ))}

                {plantConditions.length > 3 ? (
                  <Text className="text-xs text-muted-foreground">
                    И ещё {plantConditions.length - 3} условий
                  </Text>
                ) : null}
              </View>
            )}
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function MiniSensorCard({ icon, label, value, unit, bg, color }: {
  icon: LucideIcon;
  label: string;
  value?: number;
  unit: string;
  bg: string;
  color: string;
}) {
  return (
    <View className={`flex-1 ${bg} rounded-3xl p-4 items-center`}>
      <Icon as={icon} size={20} className={color} />
      <Text className={`text-xl font-bold mt-1 ${color}`}>
        {value !== undefined ? `${value.toFixed(0)}${unit}` : '—'}
      </Text>
      <Text className="text-xs text-muted-foreground mt-0.5">{label}</Text>
    </View>
  );
}

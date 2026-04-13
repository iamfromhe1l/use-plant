import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
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
import {
  getPlantTelemetryConfig,
  getTelemetryStatus,
  getTelemetryStatusMeta,
} from '@/lib/telemetry-status';
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
  const { width: windowWidth } = useWindowDimensions();

  const plants: IPlant[] = device?.plants || [];
  const [selectedPlantIndex, setSelectedPlantIndex] = useState(0);
  const [telemetry, setTelemetry] = useState<ITelemetryRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wateringHistory, setWateringHistory] = useState<IWateringRecord[]>([]);
  const [conditions, setConditions] = useState<IWateringCondition[]>([]);
  const [sendingCommand, setSendingCommand] = useState<CommandType | null>(null);
  const [waterLevels, setWaterLevels] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [headerSliderWidth, setHeaderSliderWidth] = useState(0);

  const scrollY = useSharedValue(0);
  const selectedPlantIndexValue = useSharedValue(0);
  const contentTranslateX = useSharedValue(0);
  const headerTranslateX = useSharedValue(0);
  const dragStartContentX = useSharedValue(0);
  const dragStartHeaderX = useSharedValue(0);

  const currentPlant = plants[selectedPlantIndex];
  const contentPageWidth = Math.max(windowWidth - 40, 1);

  useEffect(() => {
    const levels: Record<number, number> = {};
    plants.forEach((p) => {
      levels[p.index] = 5;
    });
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
      const storedConditions = await AsyncStorage.getItem(
        getWateringConditionsStorageKey(deviceId)
      );
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

  const handleWater = async (plant: IPlant) => {
    const plantIndex = plant.index;
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
      toast.success(`Команда полива для ${plant.name} отправлена`);
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
    return (
      d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const switchPlant = (direction: number) => {
    const next = selectedPlantIndex + direction;
    if (next >= 0 && next < plants.length) {
      setSelectedPlantIndex(next);
      Haptics.selectionAsync();
    }
  };

  const isOnline = device ? isDeviceOnline(device.lastSeen) : false;
  const expandedHeaderHeight =
    insets.top + TOP_BAR_H + PLANT_BLOCK_EXPANDED_HEIGHT + HEADER_BOTTOM_PADDING;
  const collapsedHeaderHeight =
    insets.top + TOP_BAR_H + PLANT_BLOCK_COLLAPSED_HEIGHT + HEADER_BOTTOM_PADDING;
  const headerSubtitle = `${currentPlant?.name || 'Растение'} • ${isOnline ? 'В сети' : 'Не в сети'}`;

  useEffect(() => {
    selectedPlantIndexValue.value = selectedPlantIndex;
    contentTranslateX.value = withTiming(-selectedPlantIndex * contentPageWidth, { duration: 260 });

    if (headerSliderWidth > 0) {
      headerTranslateX.value = withTiming(-selectedPlantIndex * headerSliderWidth, {
        duration: 260,
      });
    }
  }, [
    contentPageWidth,
    contentTranslateX,
    headerSliderWidth,
    headerTranslateX,
    selectedPlantIndex,
    selectedPlantIndexValue,
  ]);

  function clampTranslate(value: number, min: number, max: number) {
    'worklet';
    return Math.min(Math.max(value, min), max);
  }

  const syncPlantSlider = (nextIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(nextIndex, plants.length - 1));
    setSelectedPlantIndex(clampedIndex);
    Haptics.selectionAsync();
  };

  const plantSwipeGesture = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      dragStartContentX.value = -selectedPlantIndexValue.value * contentPageWidth;
      dragStartHeaderX.value = -selectedPlantIndexValue.value * headerSliderWidth;
    })
    .onUpdate((event) => {
      const minContentTranslate = -(plants.length - 1) * contentPageWidth;
      contentTranslateX.value = clampTranslate(
        dragStartContentX.value + event.translationX,
        minContentTranslate,
        0
      );

      if (headerSliderWidth > 0) {
        const minHeaderTranslate = -(plants.length - 1) * headerSliderWidth;
        headerTranslateX.value = clampTranslate(
          dragStartHeaderX.value + (event.translationX / contentPageWidth) * headerSliderWidth,
          minHeaderTranslate,
          0
        );
      }
    })
    .onEnd((event) => {
      const currentIndex = selectedPlantIndexValue.value;
      const swipeThreshold = contentPageWidth * 0.18;
      let nextIndex = currentIndex;

      if (event.translationX <= -swipeThreshold || event.velocityX <= -650) {
        nextIndex = Math.min(currentIndex + 1, plants.length - 1);
      } else if (event.translationX >= swipeThreshold || event.velocityX >= 650) {
        nextIndex = Math.max(currentIndex - 1, 0);
      }

      runOnJS(syncPlantSlider)(nextIndex);
    });

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
      Extrapolation.CLAMP
    ),
  }));

  const plantBlockStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, COLLAPSE_AT],
      [PLANT_BLOCK_EXPANDED_HEIGHT, PLANT_BLOCK_COLLAPSED_HEIGHT],
      Extrapolation.CLAMP
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

  const headerSliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: headerTranslateX.value }],
  }));

  const contentSliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentTranslateX.value }],
  }));

  if (plants.length === 0) {
    return (
      <View className="bg-background flex-1">
        <View className="bg-card rounded-b-3xl px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-background/70 rounded-2xl p-2.5">
              <Icon as={ArrowLeft} size={20} className="text-foreground" />
            </TouchableOpacity>
            <Text className="text-foreground text-lg font-bold">
              {device?.name || 'Устройство'}
            </Text>
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
    <GestureDetector gesture={plantSwipeGesture}>
      <View className="bg-background flex-1">
        {/* ─── Animated sticky header ─────────────────────────────────── */}
        <Animated.View
          className="bg-card absolute top-0 right-0 left-0 z-10 overflow-hidden rounded-b-3xl"
          style={headerCardStyle}>
          {/* Top bar — always visible */}
          <View
            className="flex-row items-center px-6"
            style={{ paddingTop: insets.top + 8, height: insets.top + TOP_BAR_H }}>
            <View className="w-11 items-start">
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-background/70 rounded-2xl p-2.5"
                activeOpacity={0.7}>
                <Icon as={ArrowLeft} size={20} className="text-foreground" />
              </TouchableOpacity>
            </View>

            <View className="mx-3 flex-1 items-center">
              <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
                {device?.name || 'Устройство'}
              </Text>
              <Text className="text-muted-foreground mt-0.5 text-xs" numberOfLines={1}>
                {headerSubtitle}
              </Text>
            </View>

            <View className="w-11 items-end">
              <TouchableOpacity
                onPress={() => router.push(`/(app)/device/settings/${deviceId}`)}
                className="bg-primary/10 rounded-2xl p-2.5"
                activeOpacity={0.7}>
                <Icon as={Settings} size={18} className="text-primary" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="pb-3">
            <Animated.View style={plantBlockStyle} className="overflow-hidden">
              <Animated.View
                style={plantBlockContentStyle}
                className="flex-1 flex-row items-center px-5">
                <View className="w-10 items-start">
                  {plants.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => switchPlant(-1)}
                      disabled={selectedPlantIndex === 0}
                      className="bg-card rounded-2xl p-2.5"
                      style={{ opacity: selectedPlantIndex === 0 ? 0.35 : 1 }}
                      activeOpacity={0.75}>
                      <Icon as={ChevronLeft} size={18} className="text-foreground" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View
                  className="flex-1 overflow-hidden"
                  onLayout={(event) => setHeaderSliderWidth(event.nativeEvent.layout.width)}>
                  <Animated.View
                    className="flex-row"
                    style={[
                      headerSliderStyle,
                      { width: Math.max(headerSliderWidth, 1) * plants.length },
                    ]}>
                    {plants.map((plant) => {
                      const pageLastWatering = getLastWatering(plant.index);
                      const pageConditions = conditions.filter(
                        (condition) => condition.plantIndex === plant.index
                      );
                      const pageEnabledConditions = pageConditions.filter(
                        (condition) => condition.enabled
                      );
                      const PagePlantIcon = ICON_MAP[plant.icon] || Flower2;

                      return (
                        <View
                          key={plant.index}
                          className="flex-row items-center gap-3"
                          style={{ width: Math.max(headerSliderWidth, 1) }}>
                          <Animated.View
                            style={iconWrapStyle}
                            className="bg-primary/10 items-center justify-center">
                            <Icon as={PagePlantIcon} size={30} className="text-primary" />
                          </Animated.View>

                          <View className="flex-1">
                            <Text className="text-foreground text-base font-bold" numberOfLines={2}>
                              {plant.name}
                            </Text>
                            <Text
                              className="text-muted-foreground mt-1 text-[11px]"
                              numberOfLines={2}>
                              {pageLastWatering
                                ? `Последний полив: ${formatDate(pageLastWatering.wateredAt)}`
                                : 'Поливов пока не было'}
                            </Text>
                          </View>

                          <View className="items-end gap-2">
                            <View className="bg-card rounded-full px-3 py-1.5">
                              <Text
                                className={`text-[10px] font-semibold ${
                                  isOnline ? 'text-emerald-600' : 'text-muted-foreground'
                                }`}>
                                {isOnline ? 'В сети' : 'Не в сети'}
                              </Text>
                            </View>
                            <View className="bg-card rounded-full px-3 py-1.5">
                              <Text className="text-primary text-[10px] font-semibold">
                                {pageEnabledConditions.length} усл.
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </Animated.View>
                </View>

                <View className="w-10 items-end">
                  {plants.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => switchPlant(1)}
                      disabled={selectedPlantIndex === plants.length - 1}
                      className="bg-card rounded-2xl p-2.5"
                      style={{ opacity: selectedPlantIndex === plants.length - 1 ? 0.35 : 1 }}
                      activeOpacity={0.75}>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#16a34a"
              progressViewOffset={expandedHeaderHeight}
            />
          }>
          <View className="px-5">
            <View className="overflow-hidden" style={{ width: contentPageWidth }}>
              <Animated.View
                className="flex-row"
                style={[contentSliderStyle, { width: contentPageWidth * plants.length }]}>
                {plants.map((plant) => {
                  const pageTelemetry = getPlantTelemetry(plant.index);
                  const pageLastWatering = getLastWatering(plant.index);
                  const pageConditions = conditions.filter(
                    (condition) => condition.plantIndex === plant.index
                  );
                  const pageEnabledConditions = pageConditions.filter(
                    (condition) => condition.enabled
                  );
                  const pageWateringCount = wateringHistory.filter(
                    (record) => record.plantIndex === plant.index
                  ).length;
                  const pageLevel = waterLevels[plant.index] || 5;
                  const pageCommandType = plant.index === 1 ? 'water_plant_1' : 'water_plant_2';
                  const pageIsSending = sendingCommand === pageCommandType;
                  const pageTelemetryConfig = getPlantTelemetryConfig(plant);

                  return (
                    <View key={plant.index} style={{ width: contentPageWidth }} className="gap-4">
                      {/* Sensor cards */}
                      {loading ? (
                        <View className="flex-row gap-3">
                          <Skeleton className="h-28 flex-1 rounded-3xl" />
                          <Skeleton className="h-28 flex-1 rounded-3xl" />
                          <Skeleton className="h-28 flex-1 rounded-3xl" />
                        </View>
                      ) : (
                        <View className="flex-row gap-3">
                          <MiniSensorCard
                            icon={Thermometer}
                            label="Темп."
                            value={pageTelemetry?.temperature}
                            unit="°C"
                            bg="bg-orange-500/10"
                            color="text-orange-600"
                            statusMeta={getTelemetryStatusMeta(
                              getTelemetryStatus(
                                pageTelemetry?.temperature,
                                pageTelemetryConfig.temperature
                              )
                            )}
                          />
                          <MiniSensorCard
                            icon={Wind}
                            label="Влажн."
                            value={pageTelemetry?.airHumidity}
                            unit="%"
                            bg="bg-sky-500/10"
                            color="text-sky-600"
                            statusMeta={getTelemetryStatusMeta(
                              getTelemetryStatus(
                                pageTelemetry?.airHumidity,
                                pageTelemetryConfig.airHumidity
                              )
                            )}
                          />
                          <MiniSensorCard
                            icon={Droplets}
                            label="Почва"
                            value={pageTelemetry?.soilMoisture}
                            unit="%"
                            bg="bg-emerald-500/10"
                            color="text-emerald-600"
                            statusMeta={getTelemetryStatusMeta(
                              getTelemetryStatus(
                                pageTelemetry?.soilMoisture,
                                pageTelemetryConfig.soilMoisture
                              )
                            )}
                          />
                        </View>
                      )}

                      <View className="bg-border/70 mx-1 h-px" />

                      {/* Quick actions */}
                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          className="flex-1"
                          activeOpacity={0.8}
                          onPress={() =>
                            router.push(
                              `/(app)/device/conditions/${deviceId}?plantIndex=${plant.index}`
                            )
                          }>
                          <View className="bg-card flex-row items-center gap-3 rounded-3xl p-4">
                            <View className="bg-primary/10 rounded-2xl p-2.5">
                              <Icon as={ListChecks} size={20} className="text-primary" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-foreground text-sm font-semibold">Условия</Text>
                              <Text className="text-muted-foreground text-xs">Автополив</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1"
                          activeOpacity={0.8}
                          onPress={() =>
                            router.push(
                              `/(app)/device/report/${deviceId}?plantIndex=${plant.index}`
                            )
                          }>
                          <View className="bg-card flex-row items-center gap-3 rounded-3xl p-4">
                            <View className="bg-primary/10 rounded-2xl p-2.5">
                              <Icon as={BarChart3} size={20} className="text-primary" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-foreground text-sm font-semibold">Графики</Text>
                              <Text className="text-muted-foreground text-xs">Датчики</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push(
                            `/(app)/device/watering-report/${deviceId}?plantIndex=${plant.index}`
                          )
                        }>
                        <View className="bg-card flex-row items-center gap-3 rounded-3xl p-4">
                          <View className="bg-primary/10 rounded-2xl p-2.5">
                            <Icon as={Droplets} size={20} className="text-primary" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-semibold">
                              Отчёты поливов
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                              История и интенсивность
                            </Text>
                          </View>
                          <View className="items-end gap-1">
                            <Text className="text-muted-foreground text-[10px] font-medium">
                              Поливов
                            </Text>
                            <View className="bg-primary/10 rounded-full px-2.5 py-1">
                              <Text className="text-primary text-xs font-semibold">
                                {pageWateringCount}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <View className="bg-border/70 mx-1 h-px" />

                      {/* Water section */}
                      <View className="bg-card rounded-3xl p-5">
                        <View className="mb-4 flex-row items-center gap-2">
                          <Icon as={Droplets} size={18} className="text-primary" />
                          <Text className="text-foreground text-base font-semibold">
                            Ручной полив
                          </Text>
                          <View className="flex-1" />
                          <View className="bg-primary/10 rounded-full px-2.5 py-1">
                            <Text className="text-primary text-xs font-semibold">
                              Уровень {pageLevel}
                            </Text>
                          </View>
                        </View>

                        <WaterLevelBar
                          value={pageLevel}
                          onChange={(val) => {
                            setWaterLevels((prev) => ({ ...prev, [plant.index]: val }));
                          }}
                        />

                        <TouchableOpacity
                          className={`mt-4 flex-row items-center justify-center gap-2 rounded-2xl py-4 ${
                            sendingCommand !== null ? 'bg-muted' : 'bg-primary'
                          }`}
                          onPress={() => handleWater(plant)}
                          disabled={sendingCommand !== null}
                          activeOpacity={0.85}>
                          <Icon
                            as={pageIsSending ? Zap : Droplets}
                            size={18}
                            className="text-primary-foreground"
                          />
                          <Text className="text-primary-foreground text-base font-semibold">
                            {pageIsSending ? 'Полив...' : `Полить ${plant.name}`}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Last watering info */}
                      {!loading && pageLastWatering && (
                        <View className="bg-card flex-row items-center gap-3 rounded-3xl p-4">
                          <View className="rounded-2xl bg-emerald-500/10 p-2.5">
                            <Icon as={CheckCircle2} size={18} className="text-emerald-600" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-semibold">
                              Последний полив
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                              {formatDate(pageLastWatering.wateredAt)} • уровень{' '}
                              {pageLastWatering.level}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View className="bg-border/70 mx-1 h-px" />

                      <View className="bg-card rounded-3xl p-5">
                        <View className="mb-4 flex-row items-center gap-2">
                          <Icon as={ListChecks} size={18} className="text-primary" />
                          <Text className="text-foreground text-base font-semibold">
                            Условия полива
                          </Text>
                          <View className="flex-1" />
                          <View className="bg-primary/10 rounded-full px-2.5 py-1">
                            <Text className="text-primary text-xs font-semibold">
                              {pageEnabledConditions.length} активн.
                            </Text>
                          </View>
                        </View>

                        {pageConditions.length === 0 ? (
                          <Text className="text-muted-foreground text-sm">
                            Для этого растения условия пока не настроены.
                          </Text>
                        ) : (
                          <View className="gap-3">
                            {pageConditions.slice(0, 3).map((condition) => (
                              <View
                                key={condition.id}
                                className="bg-secondary/30 flex-row items-start gap-3 rounded-2xl px-4 py-3">
                                <View
                                  className={`rounded-2xl p-2.5 ${
                                    condition.type === 'sensor'
                                      ? 'bg-sky-500/12'
                                      : 'bg-violet-500/12'
                                  }`}>
                                  <Icon
                                    as={condition.type === 'sensor' ? Droplets : Clock}
                                    size={16}
                                    className={
                                      condition.type === 'sensor'
                                        ? 'text-sky-600'
                                        : 'text-violet-600'
                                    }
                                  />
                                </View>
                                <View className="flex-1">
                                  <View className="flex-row items-center gap-2">
                                    <Text className="text-foreground text-sm font-semibold">
                                      {condition.type === 'sensor'
                                        ? 'По датчикам'
                                        : 'По расписанию'}
                                    </Text>
                                    {!condition.enabled ? (
                                      <View className="bg-muted rounded-full px-2 py-0.5">
                                        <Text className="text-muted-foreground text-[11px] font-medium">
                                          Выкл.
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                  <Text className="text-muted-foreground mt-1 text-xs">
                                    {describeWateringCondition(condition)}
                                  </Text>
                                </View>
                              </View>
                            ))}

                            {pageConditions.length > 3 ? (
                              <Text className="text-muted-foreground text-xs">
                                И ещё {pageConditions.length - 3} условий
                              </Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Animated.View>
            </View>
          </View>
        </Animated.ScrollView>
      </View>
    </GestureDetector>
  );
}

function MiniSensorCard({
  icon,
  label,
  value,
  unit,
  bg,
  color,
  statusMeta,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  unit: string;
  bg: string;
  color: string;
  statusMeta?: {
    status: string;
    label: string;
    badgeClassName: string;
    textClassName: string;
    iconClassName: string;
  } | null;
}) {
  return (
    <View className={`flex-1 ${bg} items-center rounded-3xl p-4`}>
      <Icon as={icon} size={20} className={color} />
      <Text className={`mt-1 text-xl font-bold ${color}`}>
        {value !== undefined ? `${value.toFixed(0)}${unit}` : '—'}
      </Text>
      <Text className="text-muted-foreground mt-0.5 text-xs">{label}</Text>
      {statusMeta ? (
        <Badge variant="outline" className={`mt-2 ${statusMeta.badgeClassName}`}>
          <Icon
            as={
              statusMeta.status === 'poor' || statusMeta.status === 'moderate'
                ? AlertTriangle
                : CheckCircle2
            }
            size={12}
            className={statusMeta.iconClassName}
          />
          <Text className={`text-[10px] font-semibold ${statusMeta.textClassName}`}>
            {statusMeta.label}
          </Text>
        </Badge>
      ) : null}
    </View>
  );
}

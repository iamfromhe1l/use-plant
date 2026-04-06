import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
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
  AlertCircle,
  Zap,
  CheckCircle2,
} from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { TelemetryApi } from '@/api/devices/telemetry';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { isDeviceOnline } from '@/lib/device-status';
import { ICON_MAP } from '@/consts/icons';
import { WaterLevelBar } from '@/components/water-level-bar';
import type { CommandType } from '@/api/devices/types/commands';
import type { ITelemetryRecord, IWateringRecord } from '@/api/devices/types/telemetry';
import type { IPlant } from '@/types/device';
import * as Haptics from 'expo-haptics';

const commandsApi = new CommandsApi();
const telemetryApi = new TelemetryApi();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Header animation constants
const HERO_HEIGHT = 200;      // expanded plant hero height
const TOP_BAR_H   = 64;       // fixed top bar height
const COLLAPSE_AT  = 110;     // scroll distance to fully collapse

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
  const [sendingCommand, setSendingCommand] = useState<CommandType | null>(null);
  const [waterLevels, setWaterLevels]   = useState<Record<number, number>>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [waterSuccess, setWaterSuccess] = useState(false);

  const scrollY = useSharedValue(0);

  const currentPlant = plants[selectedPlantIndex];

  useEffect(() => {
    const levels: Record<number, number> = {};
    plants.forEach((p) => { levels[p.index] = 5; });
    setWaterLevels(levels);
  }, [plants.length]);

  const fetchData = useCallback(async () => {
    setError(null);
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
    setError(null);
    setWaterSuccess(false);
    const response = await commandsApi.sendCommand(deviceId, {
      type: cmdType as CommandType,
      payload: { level },
    });
    setSendingCommand(null);
    if (response.state) {
      setWaterSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchData();
      setTimeout(() => setWaterSuccess(false), 3000);
    } else {
      setError(response.error?.message || 'Не удалось отправить команду');
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

  // ─── Animated scroll handler ───────────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Hero (icon + name) fades out and shrinks
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_AT * 0.7], [1, 0], Extrapolation.CLAMP),
    transform: [{
      translateY: interpolate(scrollY.value, [0, COLLAPSE_AT], [0, -20], Extrapolation.CLAMP),
    }],
  }));

  // Header card total height
  const headerCardStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, COLLAPSE_AT],
      [insets.top + TOP_BAR_H + HERO_HEIGHT + (plants.length > 1 ? 48 : 16), insets.top + TOP_BAR_H],
      Extrapolation.CLAMP,
    ),
  }));

  // Collapsed mini-row (icon right, name left) fades IN
  const collapsedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COLLAPSE_AT * 0.5, COLLAPSE_AT], [0, 1], Extrapolation.CLAMP),
    transform: [{
      translateY: interpolate(scrollY.value, [COLLAPSE_AT * 0.5, COLLAPSE_AT], [8, 0], Extrapolation.CLAMP),
    }],
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
          className="flex-row items-center px-5"
          style={{ paddingTop: insets.top + 8, height: insets.top + TOP_BAR_H }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-background/70 rounded-2xl p-2.5 mr-3"
            activeOpacity={0.7}
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </TouchableOpacity>

          {/* Device name + status — always visible */}
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {device?.name || 'Устройство'}
            </Text>
            <View className="flex-row items-center gap-1">
              <View className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              <Text className="text-xs text-muted-foreground">
                {isOnline ? 'В сети' : 'Не в сети'}
              </Text>
            </View>
          </View>

          {/* Collapsed: plant name left + mini icon right */}
          <Animated.View
            style={[collapsedStyle, { position: 'absolute', left: 110, right: 110, alignItems: 'flex-start' }]}
            pointerEvents="none"
          >
            <Text className="text-sm font-semibold text-primary" numberOfLines={1}>
              {currentPlant?.name}
            </Text>
          </Animated.View>

          {/* Collapsed mini plant icon */}
          <Animated.View style={collapsedStyle} className="mr-2">
            <View className="bg-primary/10 rounded-xl p-2">
              <Icon as={PlantIcon} size={18} className="text-primary" />
            </View>
          </Animated.View>

          {/* Action buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push(`/(app)/device/report/${deviceId}`)}
              className="bg-primary/10 rounded-2xl p-2.5"
              activeOpacity={0.7}
            >
              <Icon as={BarChart3} size={18} className="text-primary" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(app)/device/settings/${deviceId}`)}
              className="bg-primary/10 rounded-2xl p-2.5"
              activeOpacity={0.7}
            >
              <Icon as={Settings} size={18} className="text-primary" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Expanded hero: plant icon + name ───────────────────── */}
        <Animated.View style={heroStyle} className="items-center px-6 pt-2 pb-2">
          <View className="bg-primary/10 rounded-full p-6 mb-3">
            <Icon as={PlantIcon} size={68} className="text-primary" />
          </View>
          <Text className="text-2xl font-bold text-foreground">{currentPlant?.name}</Text>
          {loading ? (
            <Skeleton className="h-4 w-32 mt-2 rounded-full" />
          ) : lastWatering ? (
            <View className="flex-row items-center gap-1.5 mt-1.5 bg-background/60 rounded-full px-3 py-1">
              <Icon as={Clock} size={11} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">
                Полит: {formatDate(lastWatering.wateredAt)}
              </Text>
            </View>
          ) : (
            <Text className="text-xs text-muted-foreground mt-1.5">Поливов не было</Text>
          )}
        </Animated.View>

        {/* Plant switcher */}
        {plants.length > 1 && (
          <Animated.View style={heroStyle} className="flex-row items-center justify-between px-6 pb-3">
            <TouchableOpacity onPress={() => switchPlant(-1)} disabled={selectedPlantIndex === 0}
              style={{ opacity: selectedPlantIndex === 0 ? 0.3 : 1 }}>
              <Icon as={ChevronLeft} size={24} className="text-foreground" />
            </TouchableOpacity>
            <View className="flex-row gap-2">
              {plants.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedPlantIndex(i)}>
                  <View className={`h-2 rounded-full ${i === selectedPlantIndex ? 'bg-primary w-6' : 'bg-muted w-2'}`} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => switchPlant(1)} disabled={selectedPlantIndex === plants.length - 1}
              style={{ opacity: selectedPlantIndex === plants.length - 1 ? 0.3 : 1 }}>
              <Icon as={ChevronRight} size={24} className="text-foreground" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

      {/* ─── Scrollable content ──────────────────────────────────────── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + TOP_BAR_H + HERO_HEIGHT + (plants.length > 1 ? 48 : 16) + 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a"
            progressViewOffset={insets.top + TOP_BAR_H + HERO_HEIGHT} />
        }
      >
        <View className="px-5 gap-4">
          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn} className="bg-destructive/10 rounded-2xl p-4 flex-row items-center gap-3">
              <Icon as={AlertCircle} size={18} className="text-destructive" />
              <Text className="text-sm text-destructive flex-1">{error}</Text>
            </Animated.View>
          )}

          {/* Success */}
          {waterSuccess && (
            <Animated.View entering={FadeIn} className="bg-emerald-500/10 rounded-2xl p-4 flex-row items-center gap-3">
              <Icon as={CheckCircle2} size={18} className="text-emerald-600" />
              <Text className="text-sm text-emerald-700 flex-1">Команда полива отправлена!</Text>
            </Animated.View>
          )}

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

          {/* Quick actions */}
          <Animated.View entering={FadeInDown.delay(120).springify()} className="flex-row gap-3">
            <TouchableOpacity className="flex-1" activeOpacity={0.8}
              onPress={() => router.push(`/(app)/device/conditions/${deviceId}`)}>
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
              onPress={() => router.push(`/(app)/device/report/${deviceId}`)}>
              <View className="bg-card rounded-3xl p-4 flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-2xl p-2.5">
                  <Icon as={BarChart3} size={20} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Отчёты</Text>
                  <Text className="text-xs text-muted-foreground">История</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

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
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function MiniSensorCard({ icon, label, value, unit, bg, color }: {
  icon: React.ComponentType<any>;
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

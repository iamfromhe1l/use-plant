import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { TelemetryApi } from '@/api/devices/telemetry';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { ICON_MAP } from '@/consts/icons';
import { WaterLevelBar } from '@/components/water-level-bar';
import type { CommandType } from '@/api/devices/types/commands';
import type { ITelemetryRecord, IWateringRecord } from '@/api/devices/types/telemetry';
import type { IPlant } from '@/types/device';

const commandsApi = new CommandsApi();
const telemetryApi = new TelemetryApi();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DeviceScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const insets = useSafeAreaInsets();
  const sliderRef = useRef<FlatList>(null);
  const scrollRef = useRef<ScrollView>(null);

  const plants: IPlant[] = device?.plants || [];
  const [selectedPlantIndex, setSelectedPlantIndex] = useState(0);
  const [telemetry, setTelemetry] = useState<ITelemetryRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wateringHistory, setWateringHistory] = useState<IWateringRecord[]>([]);
  const [sendingCommand, setSendingCommand] = useState<CommandType | null>(null);
  const [waterLevels, setWaterLevels] = useState<Record<number, number>>({ 1: 5, 2: 5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPlant = plants[selectedPlantIndex];

  const fetchData = useCallback(async () => {
    setError(null);
    const [telRes, waterRes] = await Promise.all([
      telemetryApi.getLatestTelemetry(deviceId),
      telemetryApi.getWateringHistory(deviceId),
    ]);
    if (telRes.state && telRes.data) {
      setTelemetry(telRes.data);
    }
    if (waterRes.state && waterRes.data) {
      setWateringHistory(waterRes.data);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    await fetchData();
    setRefreshing(false);
  };

  const handleWater = async () => {
    if (!currentPlant) return;
    const plantIndex = currentPlant.index;
    const cmdType = plantIndex === 1 ? 'water_plant_1' : 'water_plant_2';
    const level = waterLevels[plantIndex] || 5;

    setSendingCommand(cmdType as CommandType);
    setError(null);
    const response = await commandsApi.sendCommand(deviceId, {
      type: cmdType as CommandType,
      payload: { level },
    });
    setSendingCommand(null);

    if (response.state) {
      fetchData();
    } else {
      setError(response.error?.message || 'Не удалось отправить команду');
    }
  };

  const getPlantTelemetry = (plantIndex: number) => {
    return telemetry?.plants.find((p) => p.index === plantIndex);
  };

  const getLastWatering = (plantIndex: number): IWateringRecord | undefined => {
    return wateringHistory.find((w) => w.plantIndex === plantIndex);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const switchPlant = (direction: number) => {
    const next = selectedPlantIndex + direction;
    if (next >= 0 && next < plants.length) {
      setSelectedPlantIndex(next);
      sliderRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const onSliderScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== selectedPlantIndex && index >= 0 && index < plants.length) {
      setSelectedPlantIndex(index);
    }
  };

  const level = waterLevels[currentPlant?.index] || 5;
  const plantTelemetry = currentPlant ? getPlantTelemetry(currentPlant.index) : undefined;
  const lastWatering = currentPlant ? getLastWatering(currentPlant.index) : undefined;
  const commandType = currentPlant?.index === 1 ? 'water_plant_1' : 'water_plant_2';
  const isSending = sendingCommand === commandType;

  if (plants.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <View className="bg-card px-6 pb-4 rounded-b-3xl z-10" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between">
            <Button size="icon" variant="ghost" onPress={() => router.back()}>
              <Icon as={ArrowLeft} size={24} className="text-card-foreground" />
            </Button>
            <Text className="text-lg font-bold text-card-foreground">
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
    <View className="flex-1 bg-background">
      {/* Merged header + plant hero */}
      <View className="bg-card rounded-b-3xl z-10" style={{ paddingTop: insets.top }}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-6">
          <Button size="icon" variant="ghost" onPress={() => router.back()}>
            <Icon as={ArrowLeft} size={24} className="text-card-foreground" />
          </Button>
          <Text className="text-lg font-bold text-card-foreground">
            {device?.name || 'Устройство'}
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={() => router.push(`/(app)/device/report/${deviceId}`)}>
              <View className="bg-primary rounded-full p-2">
                <Icon as={BarChart3} size={18} className="text-primary-foreground" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/(app)/device/settings/${deviceId}`)}>
              <View className="bg-primary rounded-full p-2">
                <Icon as={Settings} size={18} className="text-primary-foreground" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plant hero slider */}
        <FlatList
          ref={sliderRef}
          data={plants}
          horizontal
          pagingEnabled
          scrollEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSliderScroll}
          keyExtractor={(item) => String(item.index)}
          style={{ flexGrow: 0 }}
          renderItem={({ item: plant }) => {
            const PlantIcon = ICON_MAP[plant.icon] || Flower2;
            const lw = getLastWatering(plant.index);

            return (
              <View style={{ width: SCREEN_WIDTH }}>
                <View className="pb-2 px-6 pt-4">
                  <View className="items-center">
                    <View className="bg-primary/10 rounded-full p-7 mb-3">
                      <Icon as={PlantIcon} size={72} className="text-primary" />
                    </View>
                    <Text className="text-2xl font-bold text-foreground">{plant.name}</Text>
                    {loading ? (
                      <Skeleton className="h-4 w-32 mt-2 rounded-full" />
                    ) : lw ? (
                      <View className="flex-row items-center gap-1 mt-1">
                        <Icon as={Clock} size={12} className="text-muted-foreground" />
                        <Text className="text-xs text-muted-foreground">
                          Полив: {formatDate(lw.wateredAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Plant navigation arrows + dots inside header */}
        {plants.length > 1 && (
          <View className="flex-row items-center justify-between px-6 pb-4">
            <TouchableOpacity
              onPress={() => switchPlant(-1)}
              disabled={selectedPlantIndex === 0}
              style={{ opacity: selectedPlantIndex === 0 ? 0.3 : 1 }}
            >
              <Icon as={ChevronLeft} size={28} className="text-foreground" />
            </TouchableOpacity>
            <View className="flex-row gap-2">
              {plants.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => switchPlant(i - selectedPlantIndex)}>
                  <View
                    className={`h-2 rounded-full ${i === selectedPlantIndex ? 'bg-primary w-6' : 'bg-muted w-2'}`}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => switchPlant(1)}
              disabled={selectedPlantIndex === plants.length - 1}
              style={{ opacity: selectedPlantIndex === plants.length - 1 ? 0.3 : 1 }}
            >
              <Icon as={ChevronRight} size={28} className="text-foreground" />
            </TouchableOpacity>
          </View>
        )}

        {plants.length <= 1 && <View className="pb-4" />}
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-6 pt-4">
          {/* Error alert */}
          {error && (
            <Alert icon={AlertCircle} variant="destructive" className="mb-4">
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sensor detail cards */}
          {loading ? (
            <View className="gap-5 mb-6">
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
            </View>
          ) : (
            <View className="gap-5 mb-6">
              <SensorCard
                icon={Thermometer}
                title="Температура воздуха"
                value={plantTelemetry?.temperature}
                unit="°C"
                color="bg-orange-500/10"
                iconColor="text-orange-600"
              />
              <SensorCard
                icon={Wind}
                title="Влажность воздуха"
                value={plantTelemetry?.airHumidity}
                unit="%"
                color="bg-sky-500/10"
                iconColor="text-sky-600"
              />
              <SensorCard
                icon={Droplets}
                title="Влажность почвы"
                value={plantTelemetry?.soilMoisture}
                unit="%"
                color="bg-emerald-500/10"
                iconColor="text-emerald-600"
              />
            </View>
          )}

          <Separator className="mb-5" />

          {/* Conditions button */}
          <TouchableOpacity
            onPress={() => router.push(`/(app)/device/conditions/${deviceId}`)}
          >
            <View className="bg-card rounded-3xl p-5 mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-2xl p-3">
                  <Icon as={ListChecks} size={22} className="text-primary" />
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">Условия полива</Text>
                  <Text className="text-xs text-muted-foreground">Автоматический полив</Text>
                </View>
              </View>
              <Badge variant="secondary">
                <Text className="text-xs text-secondary-foreground">Настроить</Text>
              </Badge>
            </View>
          </TouchableOpacity>

          {/* Water level */}
          <View className="bg-card rounded-3xl p-5 mb-4">
            <Text className="text-base font-semibold text-foreground mb-3">
              Уровень полива: {level}
            </Text>
            <WaterLevelBar
              value={level}
              onChange={(val) => {
                if (!currentPlant) return;
                setWaterLevels((prev) => ({ ...prev, [currentPlant.index]: val }));
              }}
            />

            <Button
              className="flex-row items-center justify-center gap-2 mt-4"
              onPress={handleWater}
              disabled={sendingCommand !== null}
            >
              <Icon as={Droplets} size={16} className="text-primary-foreground" />
              <Text className="text-sm font-medium text-primary-foreground">
                {isSending ? 'Полив...' : 'Полить'}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SensorCard({
  icon,
  title,
  value,
  unit,
  color,
  iconColor,
}: {
  icon: React.ComponentType<any>;
  title: string;
  value?: number;
  unit: string;
  color: string;
  iconColor: string;
}) {
  return (
    <View className="bg-card rounded-3xl p-6 flex-row items-center gap-4">
      <View className={`${color} rounded-2xl p-5`}>
        <Icon as={icon} size={32} className={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-muted-foreground mb-1">{title}</Text>
        <Text className="text-4xl font-bold text-foreground">
          {value !== undefined ? `${value.toFixed(1)}${unit}` : '—'}
        </Text>
      </View>
    </View>
  );
}

function SensorCardSkeleton() {
  return (
    <View className="bg-card rounded-3xl p-6 flex-row items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-2xl" />
      <View className="flex-1 gap-2">
        <Skeleton className="w-32 h-4 rounded-full" />
        <Skeleton className="w-20 h-9 rounded-full" />
      </View>
    </View>
  );
}
